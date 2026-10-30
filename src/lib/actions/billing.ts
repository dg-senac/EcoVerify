"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { invoices, missions, notifications, organizations, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/utils";
import { addPeriod, formatBRL, isPlanId, PAID_PLANS, planPrice, type BillingCycle, type PlanId } from "@/lib/plans";
import { membershipRole, orgById } from "@/lib/saas/orgs";
import { pixConfig } from "@/lib/saas/sales-config";
import { newInvoiceReference } from "@/lib/saas/pix";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { EVENT_PACKAGE_NAMES, EVENT_PACKAGES, isEvent, isEventPackage } from "@/lib/saas/events";

export type BillingActionState = { error?: string; success?: boolean; invoiceId?: string };

const cryptoRandom = () => randomInt(0, 1_000_000) / 1_000_000;

async function requireOwner(orgId: string) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const org = await orgById(orgId);
  if (!org) return null;
  const role = await membershipRole(orgId, user.id);
  return role === "owner" ? { user, org } : null;
}

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/missions");
  return user;
}

/** Creates a Pix charge for a paid plan (any previous unpaid charge of the organization is canceled). */
export async function createInvoiceAction(orgId: string, plan: PlanId, cycle: BillingCycle): Promise<BillingActionState> {
  const owner = await requireOwner(orgId);
  if (!owner) return { error: "forbidden" };
  if (!PAID_PLANS.includes(plan) || (cycle !== "monthly" && cycle !== "yearly")) return { error: "invalid" };
  if (!pixConfig()) return { error: "pix_unavailable" };
  if (!rateLimit(`invoice:${owner.user.id}`, 10, 60 * 60 * 1000)) return { error: "too_many" };
  const amountCents = planPrice(plan, cycle);
  if (!amountCents) return { error: "invalid" };

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invoice = await db.transaction(async (tx) => {
        await tx
          .update(invoices)
          .set({ status: "canceled" })
          .where(and(eq(invoices.organizationId, orgId), eq(invoices.status, "pending"), eq(invoices.kind, "plan")));
        const [created] = await tx
          .insert(invoices)
          .values({ organizationId: orgId, kind: "plan", plan, billingCycle: cycle, amountCents, reference: newInvoiceReference(cryptoRandom), createdBy: owner.user.id })
          .returning({ id: invoices.id });
        return created;
      });
      revalidatePath(`/org/${owner.org.slug}`);
      return { success: true, invoiceId: invoice.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return { error: "invalid" };
}

/**
 * One-off event ("evento avulso"): Pix charge that unlocks the report and certificates of a single
 * event and lifts the member limit around it. Replaces a previous unpaid charge of the same event.
 */
export async function createEventInvoiceAction(missionId: string, pkg: string): Promise<BillingActionState> {
  if (!isEventPackage(pkg)) return { error: "invalid" };
  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission?.organizationId || !isEvent(mission)) return { error: "invalid" };
  const owner = await requireOwner(mission.organizationId);
  if (!owner) return { error: "forbidden" };
  if (mission.eventPaidAt) return { error: "invalid" };
  if (!pixConfig()) return { error: "pix_unavailable" };
  if (!rateLimit(`invoice:${owner.user.id}`, 10, 60 * 60 * 1000)) return { error: "too_many" };
  const orgId = mission.organizationId;

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invoice = await db.transaction(async (tx) => {
        await tx
          .update(invoices)
          .set({ status: "canceled" })
          .where(and(eq(invoices.missionId, missionId), eq(invoices.status, "pending")));
        const [created] = await tx
          .insert(invoices)
          .values({
            organizationId: orgId,
            kind: "event",
            missionId,
            eventPackage: pkg,
            plan: "free",
            billingCycle: "monthly",
            amountCents: EVENT_PACKAGES[pkg].cents,
            reference: newInvoiceReference(cryptoRandom),
            createdBy: owner.user.id,
          })
          .returning({ id: invoices.id });
        return created;
      });
      revalidatePath(`/org/${owner.org.slug}`);
      return { success: true, invoiceId: invoice.id };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return { error: "invalid" };
}

/** What an invoice is for, in the admin's language (pt). */
function invoiceLabel(invoice: { kind: "plan" | "event"; plan: PlanId; eventPackage: string | null }): string {
  if (invoice.kind === "event") return `evento avulso ${isEventPackage(invoice.eventPackage) ? EVENT_PACKAGE_NAMES[invoice.eventPackage].pt : ""}`.trim();
  return `plano ${PLAN_TEXT.pt.planNames[invoice.plan]}`;
}

/** "I've paid": flags the charge for the admin and notifies them. */
export async function reportInvoicePaidAction(invoiceId: string): Promise<BillingActionState> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice || invoice.status !== "pending") return { error: "invalid" };
  const owner = await requireOwner(invoice.organizationId);
  if (!owner) return { error: "forbidden" };
  if (invoice.reportedAt) return { success: true };
  await db.update(invoices).set({ reportedAt: new Date() }).where(eq(invoices.id, invoiceId));
  const admins = await db.select({ id: users.id }).from(users).where(and(eq(users.role, "admin"), isNull(users.deletedAt)));
  if (admins.length) {
    await db.insert(notifications).values(
      admins.map((admin) => ({
        userId: admin.id,
        type: "admin" as const,
        title: "💰 Pagamento por Pix informado",
        message: `${owner.org.name} informou o pagamento de ${formatBRL(invoice.amountCents)} (${invoiceLabel(invoice)}, ref. ${invoice.reference}). Confira no banco e confirme em Admin → Negócios.`,
      })),
    );
  }
  revalidatePath(`/org/${owner.org.slug}`);
  revalidatePath("/admin");
  return { success: true };
}

export async function cancelInvoiceAction(invoiceId: string): Promise<BillingActionState> {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice || invoice.status !== "pending") return { error: "invalid" };
  const owner = await requireOwner(invoice.organizationId);
  if (!owner) return { error: "forbidden" };
  await db.update(invoices).set({ status: "canceled" }).where(and(eq(invoices.id, invoiceId), eq(invoices.status, "pending")));
  revalidatePath(`/org/${owner.org.slug}`);
  return { success: true };
}

/* ------------------------------------------------------------------ */
/* Admin (Admin → Negócios)                                            */
/* ------------------------------------------------------------------ */

/** The money arrived: mark the charge as paid and extend the organization's plan (or unlock the event). */
export async function confirmInvoiceAction(invoiceId: string): Promise<BillingActionState> {
  const admin = await requireAdmin();
  const result = await db.transaction(async (tx) => {
    const [invoice] = await tx
      .update(invoices)
      .set({ status: "paid", paidAt: new Date(), confirmedBy: admin.id })
      .where(and(eq(invoices.id, invoiceId), eq(invoices.status, "pending")))
      .returning();
    if (!invoice) return null;
    const [org] = await tx.select().from(organizations).where(eq(organizations.id, invoice.organizationId)).limit(1);
    if (!org) return null;
    if (invoice.kind === "event") {
      // Event: unlocks that event only; the organization's plan is untouched.
      if (!invoice.missionId) return null;
      const [event] = await tx
        .update(missions)
        .set({ eventPaidAt: new Date(), eventPackage: invoice.eventPackage })
        .where(eq(missions.id, invoice.missionId))
        .returning({ title: missions.title });
      if (org.ownerId && event) {
        await tx.insert(notifications).values({
          userId: org.ownerId,
          type: "system",
          title: "✅ Pagamento do evento confirmado",
          message: `"${event.title}" está liberado: relatório, certificados e limite de ${isEventPackage(invoice.eventPackage) ? EVENT_PACKAGES[invoice.eventPackage].people : ""} participantes. Obrigado!`,
        });
      }
      return org.slug;
    }
    // Renewing the same plan before it ends adds a period on top; anything else starts today.
    const now = new Date();
    const keepsCurrent = org.plan === invoice.plan && org.subscriptionStatus === "active" && org.currentPeriodEnd && org.currentPeriodEnd > now;
    const start = keepsCurrent ? org.currentPeriodEnd! : now;
    const end = addPeriod(start, invoice.billingCycle);
    await tx
      .update(organizations)
      .set({ plan: invoice.plan, billingCycle: invoice.billingCycle, subscriptionStatus: "active", currentPeriodEnd: end, trialUsed: true })
      .where(eq(organizations.id, org.id));
    if (org.ownerId) {
      await tx.insert(notifications).values({
        userId: org.ownerId,
        type: "system",
        title: "✅ Pagamento confirmado",
        message: `O plano ${PLAN_TEXT.pt.planNames[invoice.plan]} de ${org.name} está ativo até ${end.toLocaleDateString("pt-BR")}. Obrigado!`,
      });
    }
    return org.slug;
  });
  if (!result) return { error: "invalid" };
  revalidatePath("/admin");
  revalidatePath(`/org/${result}`);
  return { success: true };
}

/** Manual plan (e.g. a city hall contract paid by bank slip, a partner school, a courtesy). */
export async function grantPlanAction(orgId: string, plan: string, months: number): Promise<BillingActionState> {
  await requireAdmin();
  if (!isPlanId(plan) || !Number.isInteger(months) || months < 0 || months > 36) return { error: "invalid" };
  const end = plan === "free" ? null : new Date(Date.now() + months * 30 * 86_400_000);
  const [org] = await db
    .update(organizations)
    .set({ plan, subscriptionStatus: plan === "free" ? "active" : "active", currentPeriodEnd: end })
    .where(eq(organizations.id, orgId))
    .returning({ slug: organizations.slug });
  if (!org) return { error: "invalid" };
  revalidatePath("/admin");
  revalidatePath(`/org/${org.slug}`);
  return { success: true };
}
