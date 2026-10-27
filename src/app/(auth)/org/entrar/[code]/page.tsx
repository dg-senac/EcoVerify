import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { TERMS_VERSION } from "@/lib/legal";
import { normalizeInviteCode } from "@/lib/saas/org-rules";
import { memberCount, membershipRole } from "@/lib/saas/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { JoinOrgForm } from "@/components/org/join-form";

export default async function JoinOrganizationPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeInviteCode((await params).code);
  const user = await getCurrentUser();
  if (!user) redirect(`/register?next=${encodeURIComponent(`/org/entrar/${code}`)}`);
  if (user.termsVersion !== TERMS_VERSION) redirect("/accept-terms");

  const [org] = await db.select().from(organizations).where(eq(organizations.inviteCode, code)).limit(1);
  if (!org) notFound();
  if (await membershipRole(org.id, user.id)) redirect(`/org/${org.slug}`);
  const text = ORG_TEXT[user.language];
  const members = await memberCount(org.id);

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-7 text-center shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface">
      <div
        className="mx-auto mb-4 grid h-20 w-20 place-items-center rounded-3xl text-3xl font-extrabold text-white shadow-lg"
        style={{ background: org.brandColor ?? "linear-gradient(135deg,#10b981,#0d9488)" }}
      >
        {org.name.slice(0, 1).toUpperCase()}
      </div>
      <h1 className="text-2xl font-extrabold text-slate-900" data-testid="join-org-name">{org.name}</h1>
      <p className="mt-1 text-sm text-slate-500">
        {text.types[org.type]}
        {org.city ? ` · ${org.city}` : ""} · {text.usage(members, null)}
      </p>
      <p className="mb-6 mt-4 text-slate-700">{text.joinConfirm(org.name)}</p>
      <JoinOrgForm lang={user.language} code={code} />
      <p className="mt-5 text-sm">
        <Link href="/missions" className="font-semibold text-slate-500 hover:underline">
          ←
        </Link>
      </p>
    </div>
  );
}
