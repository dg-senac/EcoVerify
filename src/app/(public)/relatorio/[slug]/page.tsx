import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq, sql } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { hasFeature } from "@/lib/plans";
import { canManage, orgPlan } from "@/lib/saas/org-rules";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { membershipRole, orgBySlug, orgImpact, orgRanking } from "@/lib/saas/orgs";
import { publicBaseUrl } from "@/lib/saas/base-url";
import { LogoHorizontal } from "@/components/logo";
import { ImpactView } from "@/components/org/impact-view";
import { PrintButton } from "@/components/org/print-button";

export const metadata: Metadata = { title: "Impact report · EcoVerify", robots: { index: false } };

/** Printable impact report (managers of School / Business / City hall plans). "Save as PDF" in the browser. */
export default async function ReportPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/relatorio/${slug}`)}`);
  const org = await orgBySlug(slug);
  if (!org) notFound();
  const role = await membershipRole(org.id, user.id);
  if (!canManage(role) && user.role !== "admin") notFound();
  const lang = user.language;
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const plan = orgPlan(org);
  if (!hasFeature(plan, "reports")) redirect(`/org/${org.slug}?tab=report`);

  const [impact, ranking, [{ total }]] = await Promise.all([
    orgImpact(org.id),
    orgRanking(org.id, 10),
    db.select({ total: sql<number>`count(*)::int` }).from(missions).where(and(eq(missions.organizationId, org.id), eq(missions.isActive, true))),
  ]);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const publicUrl = `${await publicBaseUrl()}/o/${org.slug}`;
  const qr = await QRCode.toString(publicUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" });
  const now = new Date();

  return (
    <div className="min-h-screen bg-slate-100 py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-4xl justify-end gap-2 px-4 print:hidden">
        <a href={`/org/${org.slug}`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
          ←
        </a>
        <PrintButton label={text.reportPrint} />
      </div>
      <article className="mx-auto max-w-4xl rounded-3xl bg-white p-8 shadow-xl print:max-w-none print:rounded-none print:p-0 print:shadow-none" data-testid="impact-report">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <LogoHorizontal height={34} />
            <h1 className="mt-5 text-3xl font-extrabold text-slate-900">{text.reportTitle}</h1>
            <p className="text-lg font-semibold text-emerald-700">{org.name}</p>
            <p className="mt-1 text-sm text-slate-500">{text.reportSubtitle(org.name)}</p>
          </div>
          <div className="text-right text-sm text-slate-500">
            <p className="font-semibold text-slate-700">{text.reportPeriod}</p>
            <p>
              {impact.since ? new Date(impact.since).toLocaleDateString(locale) : "—"} → {now.toLocaleDateString(locale)}
            </p>
            <p className="mt-2">
              {text.types[org.type]} · {mk.planNames[plan]}
            </p>
          </div>
        </header>

        <div className="mt-6">
          <ImpactView lang={lang} impact={impact} missionsCount={total} />
        </div>

        <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 print:break-inside-avoid">
          <h2 className="font-bold text-slate-900">{text.reportTopMembers}</h2>
          <table className="mt-3 w-full text-sm">
            <tbody>
              {ranking
                .filter((r) => r.points > 0)
                .map((r, i) => (
                  <tr key={r.userId} className="border-b border-slate-50 last:border-0">
                    <td className="w-8 py-2 font-bold text-slate-400">{i + 1}</td>
                    <td className="py-2 font-semibold text-slate-800">{r.name}</td>
                    <td className="py-2 text-right text-slate-500">{r.actions}×</td>
                    <td className="w-24 py-2 text-right font-bold text-emerald-700">{r.points} pts</td>
                  </tr>
                ))}
            </tbody>
          </table>
          {ranking.every((r) => r.points === 0) && <p className="text-sm text-slate-500">{text.impactEmpty}</p>}
        </section>

        <footer className="mt-6 flex items-center gap-4 border-t border-slate-100 pt-5 print:break-inside-avoid">
          <div className="h-20 w-20 shrink-0 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          <div className="text-xs text-slate-500">
            <p>{text.reportVerify}</p>
            <p className="font-mono text-slate-700">{publicUrl}</p>
            <p className="mt-1">{text.reportGenerated(now.toLocaleDateString(locale))}</p>
          </div>
        </footer>
      </article>
    </div>
  );
}
