import { redirect } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/legal";
import { isPlanId } from "@/lib/plans";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { CreateOrgForm } from "@/components/org/create-org-form";

export default async function NewOrganizationPage({ searchParams }: { searchParams: Promise<{ plan?: string; cycle?: string }> }) {
  const params = await searchParams;
  const query = new URLSearchParams();
  if (params.plan) query.set("plan", params.plan);
  if (params.cycle) query.set("cycle", params.cycle);
  const self = `/org/nova${query.size ? `?${query}` : ""}`;

  const user = await getCurrentUser();
  // New visitors create their account first and come back here.
  if (!user) redirect(`/register?next=${encodeURIComponent(self)}`);
  if (user.termsVersion !== TERMS_VERSION) redirect("/accept-terms");

  const [trial] = await db
    .select({ id: organizations.id })
    .from(organizations)
    .where(and(eq(organizations.ownerId, user.id), eq(organizations.trialUsed, true)))
    .limit(1);
  const text = ORG_TEXT[user.language];

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-7 shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface">
      <h1 className="text-2xl font-extrabold text-slate-900">{text.newTitle}</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">{text.newSubtitle}</p>
      <CreateOrgForm
        lang={user.language}
        defaultPlan={isPlanId(params.plan) ? params.plan : "free"}
        defaultCycle={params.cycle === "yearly" ? "yearly" : "monthly"}
        trialAvailable={!trial}
      />
      <p className="mt-5 text-center text-sm">
        <Link href="/org" className="font-semibold text-slate-500 hover:underline">
          ← {text.myOrgs}
        </Link>
      </p>
    </div>
  );
}
