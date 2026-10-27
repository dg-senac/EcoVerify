import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { Award, ExternalLink, FileBarChart, Users } from "lucide-react";
import { db } from "@/db";
import { invoices, missions, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { categoryEmoji, categoryLabels, t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import type { AiChecks } from "@/lib/ai/decision";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { MARKETING_TEXT } from "@/lib/marketing-text";
import { PLANS, hasFeature } from "@/lib/plans";
import { canManage, canPromote, orgPlan } from "@/lib/saas/org-rules";
import { activeMissionCount, membershipRole, orgBySlug, orgImpact, orgRanking } from "@/lib/saas/orgs";
import { pixConfig, salesConfig } from "@/lib/saas/sales-config";
import { pixPayload } from "@/lib/saas/pix";
import { publicBaseUrl } from "@/lib/saas/base-url";
import { cancelInvoiceAction, createInvoiceAction, reportInvoicePaidAction } from "@/lib/actions/billing";
import { ModerationCard } from "@/components/moderation/moderation-card";
import { BillingPanel } from "@/components/org/billing-panel";
import { InviteBox, LeaveOrgButton, MemberControls, OrgMissionForm, OrgSettingsForm, ToggleMissionButton } from "@/components/org/org-controls";

const TABS = ["overview", "missions", "moderation", "members", "plan", "report"] as const;
type Tab = (typeof TABS)[number];

export default async function OrganizationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ tab?: string; welcome?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const { slug } = await params;
  const query = await searchParams;
  const org = await orgBySlug(slug);
  if (!org) notFound();
  const role = await membershipRole(org.id, user.id);
  if (!role) notFound();

  const lang = user.language;
  const text = ORG_TEXT[lang];
  const mk = MARKETING_TEXT[lang];
  const manager = canManage(role);
  const plan = orgPlan(org);
  const visibleTabs: Tab[] = manager ? [...TABS] : ["overview"];
  const tab: Tab = visibleTabs.find((t) => t === query.tab) ?? "overview";
  const accent = org.brandColor && hasFeature(plan, "branding") ? org.brandColor : null;

  const [impact, ranking, activeCount, orgMissions] = await Promise.all([
    orgImpact(org.id),
    orgRanking(org.id, 200),
    activeMissionCount(org.id),
    db.select().from(missions).where(eq(missions.organizationId, org.id)).orderBy(desc(missions.isActive), desc(missions.createdAt)),
  ]);
  const [{ pendingCount }] = await db
    .select({ pendingCount: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(eq(missions.organizationId, org.id), eq(submissions.status, "pending")));
  const mine = await db
    .select({ missionId: submissions.missionId })
    .from(submissions)
    .where(and(eq(submissions.userId, user.id), inArray(submissions.status, ["pending", "approved"])));
  const done = new Set(mine.map((m) => m.missionId));

  const base = await publicBaseUrl();
  const inviteUrl = `${base}/org/entrar/${org.inviteCode}`;
  const tabLabel = (t: Tab) => text.tabs[t];

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center gap-4">
        <span
          className="grid h-16 w-16 shrink-0 place-items-center rounded-3xl text-2xl font-extrabold text-white shadow-lg"
          style={{ background: accent ?? "linear-gradient(135deg,#10b981,#0d9488)" }}
        >
          {org.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-slate-900 md:text-3xl" data-testid="org-name">
            {org.name}
          </h1>
          <p className="text-sm text-slate-500">
            {text.types[org.type]}
            {org.city ? ` · ${org.city}` : ""} · <span className="font-semibold text-emerald-700">{mk.planNames[plan]}</span> · {text.roles[role]}
          </p>
        </div>
        <Link href={`/o/${org.slug}`} className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50">
          <ExternalLink className="h-4 w-4" /> {text.publicPage}
        </Link>
      </div>

      {query.welcome === "1" && manager && (
        <div className="mt-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 p-5 text-white shadow-md" data-testid="org-welcome">
          <p className="text-lg font-extrabold">🎉 {org.name}</p>
          <p className="mt-1 text-sm text-white/90">
            {org.subscriptionStatus === "trialing" ? `${text.statusLabels.trialing} · ${mk.planNames[org.plan]}. ` : ""}
            {text.inviteHint}
          </p>
        </div>
      )}

      {/* Tabs */}
      {visibleTabs.length > 1 && (
        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5" data-testid="org-tabs">
          {visibleTabs.map((t) => (
            <Link
              key={t}
              href={`/org/${org.slug}${t === "overview" ? "" : `?tab=${t}`}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                tab === t ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tabLabel(t)}
              {t === "moderation" && pendingCount > 0 && (
                <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{pendingCount}</span>
              )}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="org-stats">
              {[
                { value: ranking.length, label: text.statMembers },
                { value: impact.actions, label: text.statActions },
                { value: impact.points, label: text.statPoints },
                { value: activeCount, label: text.statMissions },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
                  <p className="text-2xl font-extrabold text-slate-900">{s.value.toLocaleString(lang === "pt" ? "pt-BR" : lang)}</p>
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">{text.orgMissions}</h2>
                {orgMissions.filter((m) => m.isActive).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">{text.orgMissionsEmpty}</p>
                ) : (
                  <ul className="mt-3 grid gap-2" data-testid="org-mission-list">
                    {orgMissions
                      .filter((m) => m.isActive)
                      .map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                          <span className="text-xl">{categoryEmoji[m.category] ?? "🌱"}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                            <p className="text-xs text-slate-500">
                              +{m.pointsReward} pts · {m.scope === "anywhere" ? text.scopeAnywhere : text.scopeLocal}
                            </p>
                          </div>
                          {done.has(m.id) ? (
                            <span className="text-xs font-bold text-emerald-700">✓</span>
                          ) : (
                            <Link href={`/missions/${m.id}/submit`} className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">
                              {t(lang, "send_proof")}
                            </Link>
                          )}
                        </li>
                      ))}
                  </ul>
                )}
              </section>

              <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
                <h2 className="font-bold text-slate-900">🏆 {text.ranking}</h2>
                {ranking.every((r) => r.points === 0) ? (
                  <p className="mt-2 text-sm text-slate-500">{text.rankingEmpty}</p>
                ) : (
                  <ol className="mt-3 grid gap-1.5" data-testid="org-ranking">
                    {ranking
                      .filter((r) => r.points > 0)
                      .slice(0, 10)
                      .map((r, i) => (
                        <li key={r.userId} className={`flex items-center gap-3 rounded-xl px-3 py-2 ${r.userId === user.id ? "bg-emerald-50" : ""}`}>
                          <span className="w-6 text-center text-sm font-extrabold text-slate-400">{i < 3 ? ["🥇", "🥈", "🥉"][i] : i + 1}</span>
                          <span className="flex-1 truncate text-sm font-semibold text-slate-800">{r.name}</span>
                          <span className="text-xs text-slate-500">{r.actions}×</span>
                          <span className="text-sm font-bold text-emerald-700">{r.points} pts</span>
                        </li>
                      ))}
                  </ol>
                )}
              </section>
            </div>

            {!manager && (
              <div className="flex flex-wrap items-center justify-between gap-3">
                {hasFeature(plan, "certificates") && (
                  <Link
                    href={`/certificado/${ranking.find((r) => r.userId === user.id)?.memberId ?? ""}`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
                  >
                    <Award className="h-4 w-4 text-amber-500" /> {text.certificate}
                  </Link>
                )}
                <LeaveOrgButton lang={lang} orgId={org.id} />
              </div>
            )}
          </div>
        )}

        {tab === "missions" && manager && (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="mb-1 font-bold text-slate-900">{text.newMission}</h2>
              <p className="mb-4 text-xs font-semibold text-slate-500" data-testid="mission-usage">
                {text.missionUsage(activeCount, PLANS[plan].maxActiveMissions)}
              </p>
              <OrgMissionForm lang={lang} orgId={org.id} />
            </section>
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="font-bold text-slate-900">{text.orgMissions}</h2>
              {orgMissions.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">{text.orgMissionsEmpty}</p>
              ) : (
                <ul className="mt-3 divide-y divide-slate-100" data-testid="org-mission-admin-list">
                  {orgMissions.map((m) => (
                    <li key={m.id} className="flex items-center gap-3 py-3">
                      <span className="text-xl">{categoryEmoji[m.category] ?? "🌱"}</span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                        <p className="text-xs text-slate-500">
                          {categoryLabels[m.category]?.[lang]} · +{m.pointsReward} pts ·{" "}
                          <span className={m.isActive ? "text-emerald-700" : "text-slate-400"}>{m.isActive ? text.active : text.inactive}</span>
                        </p>
                      </div>
                      <ToggleMissionButton lang={lang} missionId={m.id} active={m.isActive} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {tab === "moderation" && manager && <ModerationTab orgId={org.id} lang={lang} userId={user.id} />}

        {tab === "members" && manager && (
          <div className="grid gap-6">
            <InviteBox lang={lang} orgId={org.id} code={org.inviteCode} url={inviteUrl} />
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-bold text-slate-900">
                  <Users className="h-5 w-5" /> {text.tabs.members}
                </h2>
                <span className="text-xs font-semibold text-slate-500" data-testid="member-usage">
                  {text.usage(ranking.length, PLANS[plan].maxMembers)}
                </span>
              </div>
              {!canPromote(org) && role === "owner" && <p className="mt-1 text-xs text-slate-500">{text.teamNeedsPlan}</p>}
              <ul className="mt-3 divide-y divide-slate-100" data-testid="member-list">
                {[...ranking]
                  .sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : a.name.localeCompare(b.name)))
                  .map((m) => (
                    <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                        <p className="text-xs text-slate-500">
                          {text.roles[m.role]} · {m.points} pts · {text.memberSince} {formatDate(m.joinedAt, lang).split(",")[0]}
                        </p>
                      </div>
                      {hasFeature(plan, "certificates") && (
                        <Link href={`/certificado/${m.memberId}`} className="text-xs font-semibold text-emerald-700 hover:underline">
                          {text.certificate}
                        </Link>
                      )}
                      {m.userId !== user.id && (
                        <MemberControls lang={lang} orgId={org.id} userId={m.userId} role={m.role} viewerRole={role} canPromote={canPromote(org)} />
                      )}
                    </li>
                  ))}
              </ul>
            </section>
            <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
              <h2 className="mb-3 font-bold text-slate-900">{text.settingsTitle}</h2>
              <OrgSettingsForm lang={lang} org={org} canBrand={hasFeature(plan, "branding")} />
            </section>
            {role !== "owner" && <LeaveOrgButton lang={lang} orgId={org.id} />}
          </div>
        )}

        {tab === "plan" && manager && <PlanTab org={org} lang={lang} isOwner={role === "owner"} />}

        {tab === "report" && manager && (
          <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <FileBarChart className="h-5 w-5 text-emerald-600" /> {text.reportTitle}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{text.reportSubtitle(org.name)}</p>
            {hasFeature(plan, "reports") ? (
              <Link
                href={`/relatorio/${org.slug}`}
                data-testid="open-report"
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-3 text-sm font-bold text-white shadow-md"
              >
                <FileBarChart className="h-4 w-4" /> {text.reportPrint}
              </Link>
            ) : (
              <div className="mt-4 rounded-xl bg-amber-50 p-4 text-sm text-amber-900" data-testid="report-locked">
                {text.reportNeedsPlan}{" "}
                <Link href={`/org/${org.slug}?tab=plan`} className="font-bold underline">
                  {text.upgradeCta}
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

async function ModerationTab({ orgId, lang, userId }: { orgId: string; lang: "pt" | "en" | "es"; userId: string }) {
  const text = ORG_TEXT[lang];
  const rows = await db
    .select({
      id: submissions.id,
      photoUrl: submissions.photoUrl,
      report: submissions.report,
      latitude: submissions.latitude,
      longitude: submissions.longitude,
      submittedAt: submissions.submittedAt,
      missionTitle: missions.title,
      missionCategory: missions.category,
      authorId: users.id,
      authorName: users.name,
      aiStatus: submissions.aiStatus,
      aiVerdict: submissions.aiVerdict,
      aiConfidence: submissions.aiConfidence,
      aiReasonCode: submissions.aiReasonCode,
      aiSummary: submissions.aiSummary,
      aiChecks: submissions.aiChecks,
      appealedAt: submissions.appealedAt,
      appealMessage: submissions.appealMessage,
    })
    .from(submissions)
    .innerJoin(missions, eq(submissions.missionId, missions.id))
    .innerJoin(users, eq(submissions.userId, users.id))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "pending")))
    .orderBy(sql`${submissions.appealedAt} is null`, asc(submissions.submittedAt));
  return (
    <div>
      <p className="text-sm text-slate-500">{text.moderationHint}</p>
      {rows.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500" data-testid="org-moderation-empty">
          {text.moderationEmpty}
        </p>
      ) : (
        <div className="mt-4 space-y-5" data-testid="org-moderation-list">
          {rows.map((row) => (
            <ModerationCard
              key={row.id}
              lang={lang}
              moderatorId={userId}
              canRetryAi={false}
              showHistory={false}
              submission={{ ...row, aiChecks: (row.aiChecks as AiChecks | null) ?? null }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

async function PlanTab({ org, lang, isOwner }: { org: NonNullable<Awaited<ReturnType<typeof orgBySlug>>>; lang: "pt" | "en" | "es"; isOwner: boolean }) {
  const pix = pixConfig();
  const rows = await db.select().from(invoices).where(eq(invoices.organizationId, org.id)).orderBy(desc(invoices.createdAt)).limit(24);
  const { whatsappUrl } = salesConfig();
  return (
    <BillingPanel
      lang={lang}
      orgId={org.id}
      isOwner={isOwner}
      plan={org.plan}
      effectivePlan={orgPlan(org)}
      status={org.subscriptionStatus}
      periodEnd={org.currentPeriodEnd?.toISOString() ?? null}
      pixAvailable={!!pix}
      contactUrl={whatsappUrl ?? "/sobre#contato"}
      invoices={rows.map((i) => ({
        id: i.id,
        plan: i.plan,
        billingCycle: i.billingCycle,
        amountCents: i.amountCents,
        status: i.status,
        reference: i.reference,
        reportedAt: i.reportedAt?.toISOString() ?? null,
        createdAt: i.createdAt.toISOString(),
        paidAt: i.paidAt?.toISOString() ?? null,
        pixPayload:
          i.status === "pending" && pix
            ? pixPayload({ key: pix.key, name: pix.name, city: pix.city, amountCents: i.amountCents, txid: i.reference, description: `EcoVerify ${i.plan}` })
            : null,
      }))}
      onCreate={createInvoiceAction}
      onReport={reportInvoicePaidAction}
      onCancel={cancelInvoiceAction}
    />
  );
}
