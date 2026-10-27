import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { categoryEmoji } from "@/lib/i18n";
import { hasFeature } from "@/lib/plans";
import { orgPlan } from "@/lib/saas/org-rules";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { orgBySlug, orgImpact } from "@/lib/saas/orgs";
import { PublicShell } from "@/components/marketing/public-shell";
import { ImpactView } from "@/components/org/impact-view";
import { pickLandingLang } from "../../landing-page";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const org = await orgBySlug((await params).slug);
  return { title: org ? `${org.name} · Impacto no EcoVerify` : "EcoVerify" };
}

/** Public impact page of an organization: aggregate numbers only (no names — schools have minors). */
export default async function PublicOrgPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ lang?: string }> }) {
  const { slug } = await params;
  const org = await orgBySlug(slug);
  if (!org) notFound();
  const lang = await pickLandingLang((await searchParams).lang, await getCurrentUser());
  const text = ORG_TEXT[lang];
  const plan = orgPlan(org);
  const accent = org.brandColor && hasFeature(plan, "branding") ? org.brandColor : null;
  const [impact, active] = await Promise.all([
    orgImpact(org.id),
    db
      .select({ id: missions.id, title: missions.title, category: missions.category, points: missions.pointsReward })
      .from(missions)
      .where(and(eq(missions.organizationId, org.id), eq(missions.isActive, true)))
      .orderBy(desc(missions.createdAt))
      .limit(12),
  ]);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  return (
    <PublicShell lang={lang} path={`/o/${org.slug}`}>
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-2xl font-extrabold text-white shadow-lg"
          style={{ background: accent ?? "linear-gradient(135deg,#10b981,#0d9488)" }}
        >
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700">
            {text.types[org.type]}
            {org.city ? ` · ${org.city}` : ""}
          </p>
          <h1 className="text-3xl font-extrabold text-slate-900" data-testid="public-org-title">
            {text.publicTitle(org.name)}
          </h1>
          <p className="text-sm text-slate-500">
            {text.publicSubtitle}
            {impact.since ? ` ${text.publicSince(new Date(impact.since).toLocaleDateString(locale))}.` : ""}
          </p>
        </div>
      </div>

      <div className="mt-6">
        <ImpactView lang={lang} impact={impact} missionsCount={active.length} />
      </div>

      {active.length > 0 && (
        <section className="mt-5 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="font-bold text-slate-900">{text.publicMissions}</h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {active.map((m) => (
              <li key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5 text-sm">
                <span className="text-xl">{categoryEmoji[m.category] ?? "🌱"}</span>
                <span className="flex-1 font-semibold text-slate-800">{m.title}</span>
                <span className="text-xs font-bold text-emerald-700">+{m.points} pts</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-4 rounded-3xl bg-gradient-to-r from-emerald-600 to-teal-700 p-6 text-white shadow-lg">
        <p className="max-w-xl text-lg font-bold">{text.publicSubtitle}</p>
        <a href={`/sobre?lang=${lang}#planos`} className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-emerald-700 shadow-md hover:bg-emerald-50">
          {text.publicJoinCta}
        </a>
      </div>
    </PublicShell>
  );
}
