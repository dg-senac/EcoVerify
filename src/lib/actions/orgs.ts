"use server";

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { collectionPoints, missions, organizationMembers, organizations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { isUniqueViolation } from "@/lib/utils";
import { isPlanId, type BillingCycle } from "@/lib/plans";
import {
  canActivateMission,
  canAddMember,
  canManage,
  canPromote,
  cleanHexColor,
  initialSubscription,
  isOrgType,
  newInviteCode,
  normalizeInviteCode,
  orgHas,
  slugify,
} from "@/lib/saas/org-rules";
import { activeMissionCount, memberCount, membershipRole, orgById, orgEventAllowance } from "@/lib/saas/orgs";
import { parseEventWindow } from "@/lib/saas/events";
import { parseProofFields } from "@/lib/proof";

export type OrgActionState = { error?: string; success?: boolean };

const CATEGORIES = ["planting", "donation", "recycling", "cleanup", "other"] as const;
const cryptoRandom = () => randomInt(0, 1_000_000) / 1_000_000;

async function requireUser(next?: string) {
  const user = await getCurrentUser();
  if (!user) redirect(next ? `/login?next=${encodeURIComponent(next)}` : "/login");
  return user;
}

/** The organization plus the caller's role; null when the caller can't manage it. */
async function managedOrg(orgId: string, userId: string) {
  const org = await orgById(orgId);
  if (!org) return null;
  const role = await membershipRole(orgId, userId);
  return canManage(role) ? { org, role: role! } : null;
}

function revalidateOrg(slug: string) {
  revalidatePath(`/org/${slug}`);
  revalidatePath("/org");
  revalidatePath("/missions");
}

export async function createOrganizationAction(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const user = await requireUser("/org/nova");
  if (user.isBanned) return { error: "forbidden" };
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const city = String(formData.get("city") ?? "").trim().slice(0, 80) || null;
  const planRaw = String(formData.get("plan") ?? "free");
  const cycle: BillingCycle = formData.get("cycle") === "yearly" ? "yearly" : "monthly";
  if (name.length < 3 || name.length > 80 || !isOrgType(type)) return { error: "invalid" };
  const plan = isPlanId(planRaw) ? planRaw : "free";
  if (!rateLimit(`org:create:${user.id}`, 5, 24 * 60 * 60 * 1000)) return { error: "too_many" };

  // One free trial per person: someone who already owns a trial organization starts on the free plan.
  const [ownedTrial] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.ownerId, user.id), eq(organizations.trialUsed, true)))
    .limit(1);
  const subscription = initialSubscription(ownedTrial ? "free" : plan, cycle);

  const base = slugify(name);
  for (let attempt = 0; attempt < 6; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${newInviteCode(cryptoRandom).slice(0, 4).toLowerCase()}`;
    try {
      const org = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(organizations)
          .values({ name, slug, type, city, inviteCode: newInviteCode(cryptoRandom), ownerId: user.id, ...subscription })
          .returning();
        await tx.insert(organizationMembers).values({ organizationId: created.id, userId: user.id, role: "owner" });
        return created;
      });
      // The app layout shows the Community tab only for organization members.
      revalidatePath("/", "layout");
      redirect(`/org/${org.slug}?welcome=1`);
    } catch (error) {
      if (isUniqueViolation(error)) continue;
      throw error;
    }
  }
  return { error: "invalid" };
}

export async function joinOrganizationAction(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const code = normalizeInviteCode(String(formData.get("code") ?? ""));
  const user = await requireUser(code ? `/org/entrar/${code}` : "/org");
  if (!rateLimit(`org:join:${user.id}`, 20, 60 * 60 * 1000)) return { error: "too_many" };
  if (code.length < 6) return { error: "invalid_code" };
  const [org] = await db.select().from(organizations).where(eq(organizations.inviteCode, code)).limit(1);
  if (!org) return { error: "invalid_code" };
  if (!(await membershipRole(org.id, user.id))) {
    const limit = canAddMember(org, await memberCount(org.id), new Date(), await orgEventAllowance(org.id));
    if (limit) return { error: limit };
    await db.insert(organizationMembers).values({ organizationId: org.id, userId: user.id, role: "member" }).onConflictDoNothing();
  }
  revalidateOrg(org.slug);
  revalidatePath("/", "layout"); // Community tab
  redirect(`/org/${org.slug}`);
}

export async function leaveOrganizationAction(orgId: string): Promise<OrgActionState> {
  const user = await requireUser();
  const role = await membershipRole(orgId, user.id);
  if (!role) return { error: "not_found" };
  if (role === "owner") return { error: "owner_cannot_leave" };
  await db.delete(organizationMembers).where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, user.id)));
  revalidatePath("/", "layout"); // missions, organizations and the Community tab
  redirect("/org");
}

export async function regenerateInviteAction(orgId: string): Promise<OrgActionState> {
  const user = await requireUser();
  const managed = await managedOrg(orgId, user.id);
  if (!managed) return { error: "forbidden" };
  for (let i = 0; i < 5; i++) {
    try {
      await db.update(organizations).set({ inviteCode: newInviteCode(cryptoRandom) }).where(eq(organizations.id, orgId));
      revalidateOrg(managed.org.slug);
      return { success: true };
    } catch (error) {
      if (!isUniqueViolation(error)) throw error;
    }
  }
  return { error: "invalid" };
}

export async function setMemberRoleAction(orgId: string, memberUserId: string, role: "manager" | "member"): Promise<OrgActionState> {
  const user = await requireUser();
  const managed = await managedOrg(orgId, user.id);
  if (!managed || managed.role !== "owner") return { error: "forbidden" };
  if (role === "manager" && !canPromote(managed.org)) return { error: "needs_plan" };
  await db
    .update(organizationMembers)
    .set({ role })
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId), ne(organizationMembers.role, "owner")));
  revalidateOrg(managed.org.slug);
  return { success: true };
}

export async function removeMemberAction(orgId: string, memberUserId: string): Promise<OrgActionState> {
  const user = await requireUser();
  const managed = await managedOrg(orgId, user.id);
  if (!managed) return { error: "forbidden" };
  const target = await membershipRole(orgId, memberUserId);
  // Managers can remove members; only the owner removes managers; nobody removes the owner.
  if (!target || target === "owner" || (target === "manager" && managed.role !== "owner")) return { error: "forbidden" };
  await db.delete(organizationMembers).where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, memberUserId)));
  revalidateOrg(managed.org.slug);
  return { success: true };
}

export async function updateOrganizationAction(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const managed = await managedOrg(orgId, user.id);
  if (!managed) return { error: "forbidden" };
  const name = String(formData.get("name") ?? "").trim();
  const type = String(formData.get("type") ?? "");
  const city = String(formData.get("city") ?? "").trim().slice(0, 80) || null;
  if (name.length < 3 || name.length > 80 || !isOrgType(type)) return { error: "invalid" };
  const color = cleanHexColor(String(formData.get("brandColor") ?? ""));
  const brandColor = orgHas(managed.org, "branding") ? color : managed.org.brandColor;
  await db.update(organizations).set({ name, type, city, brandColor }).where(eq(organizations.id, orgId));
  revalidateOrg(managed.org.slug);
  return { success: true };
}

export async function createOrgMissionAction(_prev: OrgActionState, formData: FormData): Promise<OrgActionState> {
  const user = await requireUser();
  const orgId = String(formData.get("orgId") ?? "");
  const managed = await managedOrg(orgId, user.id);
  if (!managed) return { error: "forbidden" };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = CATEGORIES.find((c) => c === formData.get("category"));
  const points = Math.round(Number(formData.get("points")));
  const scope = formData.get("scope") === "local" ? "local" : "anywhere";
  const latRaw = String(formData.get("latitude") ?? "").trim();
  const lngRaw = String(formData.get("longitude") ?? "").trim();
  const latitude = latRaw === "" ? NaN : Number(latRaw);
  const longitude = lngRaw === "" ? NaN : Number(lngRaw);
  if (title.length < 4 || title.length > 120 || description.length < 10 || description.length > 1000 || !category) return { error: "invalid" };
  if (!Number.isFinite(points) || points < 5 || points > 200) return { error: "invalid" };
  if (scope === "local" && (!Number.isFinite(latitude) || !Number.isFinite(longitude) || Math.abs(latitude) > 90 || Math.abs(longitude) > 180)) {
    return { error: "invalid" };
  }
  // Event (mutirão): proofs only count inside the window (src/lib/saas/events.ts).
  let window: { startsAt: Date; endsAt: Date } | null = null;
  if (formData.get("isEvent") === "on") {
    const parsed = parseEventWindow(formData.get("startsAt"), formData.get("endsAt"));
    if ("error" in parsed) return { error: parsed.error };
    window = parsed;
  }
  const proof = parseProofFields((name) => formData.get(name));
  if (proof.error) return { error: "invalid" };
  // Collection point: a public point or one run by this organization.
  if (proof.collectionPointId) {
    if (scope !== "local" || !/^[0-9a-f-]{36}$/i.test(proof.collectionPointId)) return { error: "invalid" };
    const [point] = await db
      .select({ id: collectionPoints.id })
      .from(collectionPoints)
      .where(and(eq(collectionPoints.id, proof.collectionPointId), eq(collectionPoints.isActive, true), or(isNull(collectionPoints.organizationId), eq(collectionPoints.organizationId, orgId))))
      .limit(1);
    if (!point) return { error: "invalid" };
  }
  const limit = canActivateMission(managed.org, await activeMissionCount(orgId));
  if (limit) return { error: limit };

  await db.insert(missions).values({
    startsAt: window?.startsAt ?? null,
    endsAt: window?.endsAt ?? null,
    title,
    description,
    category,
    proofType: proof.proofType,
    countItem: proof.countItem,
    countTarget: proof.countTarget,
    collectionPointId: proof.collectionPointId,
    pointsReward: points,
    foneReward: "0",
    scope,
    latitude: scope === "local" ? String(latitude) : null,
    longitude: scope === "local" ? String(longitude) : null,
    city: managed.org.city,
    sponsorName: managed.org.name,
    organizationId: orgId,
    origin: "admin",
    createdBy: user.id,
  });
  revalidateOrg(managed.org.slug);
  return { success: true };
}

export async function toggleOrgMissionAction(missionId: string): Promise<OrgActionState> {
  const user = await requireUser();
  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission?.organizationId) return { error: "not_found" };
  const managed = await managedOrg(mission.organizationId, user.id);
  if (!managed) return { error: "forbidden" };
  if (!mission.isActive) {
    const limit = canActivateMission(managed.org, await activeMissionCount(mission.organizationId));
    if (limit) return { error: limit };
  }
  await db.update(missions).set({ isActive: sql`not ${missions.isActive}` }).where(eq(missions.id, missionId));
  revalidateOrg(managed.org.slug);
  return { success: true };
}
