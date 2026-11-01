import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Award, Building2, Copy, Check, ExternalLink, FileBarChart, Plus, RefreshCw, Users } from "lucide-react";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { PLAN_TEXT } from "@/lib/saas/plan-text";
import { ORG_TYPES, canManage, canPromote, memberLimit, orgPlan } from "@/lib/saas/org-rules";
import { PLANS, TRIAL_DAYS, formatBRL, hasFeature, type BillingCycle, type PlanId } from "@/lib/plans";
import { pixPayload } from "@/lib/saas/pix";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { BillingPanel } from "@/components/org/billing-panel";
import { EventsPanel } from "@/components/org/events-panel";
import { EventFields, type EventWindowValue } from "@/components/org/event-fields";
import { EventBadge } from "@/components/missions/event-badge";
import { EventCertificateView, EventReportView } from "@/components/org/event-report";
import { EVENT_PACKAGE_NAMES, EVENT_TEXT, eventPhase, eventUnlocked, isEvent, isEventPackage } from "@/lib/saas/events";
import { proofCode } from "@/lib/impact";
import { ImpactView } from "@/components/org/impact-view";
import { LogoHorizontal, LogoMark } from "@/components/logo";
import {
  DEMO_PIX,
  cancelDemoInvoice,
  createDemoEventInvoice,
  createDemoInvoice,
  createOrg,
  createOrgMission,
  joinOrg,
  leaveOrg,
  myOrgs,
  orgEventAllowance,
  orgRole,
  orgStats,
  regenerateOrgInvite,
  reportDemoInvoice,
  toggleOrgMission,
  checkinDisplay,
  localizedTitle,
  useLang,
  useStore,
  type Category,
  type User,
} from "../store";
import { Link, navigate } from "../router";
import { EmptyState, PageHeader, btnPrimary, btnSecondary, card, input, label, toast } from "../components/ui";
import { ProofTypeFields } from "@/components/missions/proof-type-fields";
import { defaultProofType, parseProofFields } from "@/lib/proof";

const TABS = ["overview", "missions", "events", "moderation", "members", "plan", "report"] as const;
type Tab = (typeof TABS)[number];
const CATEGORIES: Category[] = ["recycling", "planting", "cleanup", "donation", "other"];
const locale = (lang: Lang) => (lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US");

function errorText(lang: Lang, code?: string) {
  const text = ORG_TEXT[lang];
  return code ? (text.errors[code] ?? text.errors.invalid) : null;
}

function OrgAvatar({ name, size = 56 }: { name: string; size?: number }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 font-extrabold text-white shadow-lg"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* /org — my organizations                                             */
/* ------------------------------------------------------------------ */

export function OrgListScreen({ user }: { user: User }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const orgs = useStore((s) => myOrgs(s, user.id));
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageHeader
        title={text.myOrgs}
        subtitle={text.myOrgsSubtitle}
        icon={Building2}
        action={
          <Link to="/org/nova" className={btnPrimary}>
            <Plus className="h-4 w-4" /> {text.create}
          </Link>
        }
      />
      {orgs.length === 0 ? (
        <EmptyState emoji="🏫" text={text.noOrgs} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="org-list">
          {orgs.map(({ org, role, members }) => (
            <Link key={org.id} to={`/org/${org.slug}`} className={`${card} flex items-center gap-4 p-5 transition hover:shadow-md`}>
              <OrgAvatar name={org.name} />
              <div className="min-w-0 flex-1">
                <p className="truncate font-bold text-slate-900">{org.name}</p>
                <p className="text-xs text-slate-500">
                  {text.types[org.type]} · {text.roles[role]}
                </p>
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {PAYMENTS_ENABLED && `${mk.planNames[orgPlan(org)]} · `}
                  {text.usage(members, PLANS[orgPlan(org)].maxMembers)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
      <div className={`${card} mt-6 p-5`}>
        <h2 className="font-bold text-slate-900">{text.joinTitle}</h2>
        <form
          className="mt-3 flex flex-wrap gap-2"
          data-testid="join-org-form"
          onSubmit={(e) => {
            e.preventDefault();
            const result = joinOrg(code);
            if (result.slug) navigate(`/org/${result.slug}`);
            else setError(errorText(lang, result.error));
          }}
        >
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder={text.joinCodePlaceholder} className={`${input} max-w-xs uppercase`} aria-label={text.joinCodeLabel} />
          <button type="submit" className={btnSecondary}>
            {text.joinSubmit}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">{lang === "en" ? "e.g." : lang === "es" ? "Ej.:" : "Ex.:"} ESCOLA24</p>
        {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* /org/nova — create                                                  */
/* ------------------------------------------------------------------ */

export function OrgNewScreen({ user }: { user: User }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const trialUsed = useStore((s) => (s.orgs ?? []).some((o) => o.ownerId === user.id && o.trialUsed));
  const [form, setForm] = useState({ name: "", type: "school", city: "", plan: (PAYMENTS_ENABLED ? "school" : "free") as PlanId, cycle: "monthly" as BillingCycle });
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <PageHeader title={text.newTitle} subtitle={text.newSubtitle} icon={Building2} />
      <form
        className={`${card} grid max-w-2xl gap-4 p-6`}
        data-testid="create-org-form"
        onSubmit={(e) => {
          e.preventDefault();
          const result = createOrg(form);
          if (result.slug) navigate(`/org/${result.slug}`);
          else setError(errorText(lang, result.error));
        }}
      >
        <label>
          <span className={label}>{text.name}</span>
          <input required minLength={3} maxLength={80} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={input} name="name" />
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label>
            <span className={label}>{text.type}</span>
            <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className={input}>
              {ORG_TYPES.map((type) => (
                <option key={type} value={type}>
                  {text.types[type]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{text.city}</span>
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={input} />
          </label>
        </div>
        {PAYMENTS_ENABLED && (
        <fieldset className="grid gap-2">
          <legend className={label}>{text.plan}</legend>
          {(["free", "school", "business"] as PlanId[]).map((id) => {
            const price = form.cycle === "monthly" ? PLANS[id].monthlyCents : PLANS[id].yearlyCents;
            return (
              <button
                type="button"
                key={id}
                onClick={() => setForm({ ...form, plan: id })}
                className={`flex items-center gap-3 rounded-2xl border p-3 text-left ${form.plan === id ? "border-emerald-400 bg-emerald-50" : "border-slate-200 bg-white"}`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full border ${form.plan === id ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-300"}`}>
                  {form.plan === id && <Check className="h-3.5 w-3.5" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-bold text-slate-900">{mk.planNames[id]}</span>
                  <span className="block text-xs text-slate-500">
                    {mk.members(PLANS[id].maxMembers)} · {mk.missions(PLANS[id].maxActiveMissions)}
                  </span>
                </span>
                <span className="text-sm font-extrabold text-slate-900">{price ? `${formatBRL(price, lang)}${form.cycle === "monthly" ? mk.perMonth : mk.perYear}` : mk.free}</span>
              </button>
            );
          })}
        </fieldset>
        )}
        {PAYMENTS_ENABLED && form.plan !== "free" && (
          <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">{trialUsed ? text.trialUsedInfo : text.trialInfo(TRIAL_DAYS)}</p>
        )}
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className={btnPrimary}>
          {text.createSubmit}
        </button>
      </form>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* /org/:slug(/:tab) — organization panel                              */
/* ------------------------------------------------------------------ */

export function OrgScreen({ user, slug, tab: rawTab }: { user: User; slug: string; tab?: string }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const mk = PLAN_TEXT[lang];
  const org = useStore((s) => (s.orgs ?? []).find((o) => o.slug === slug) ?? null);
  const role = useStore((s) => (org ? orgRole(s, org.id, user.id) : null));
  const stats = useStore((s) => (org ? orgStats(s, org.id) : null));
  const missions = useStore((s) => s.missions.filter((m) => org && m.organizationId === org.id));
  const submissions = useStore((s) => s.submissions);
  const invoices = useStore((s) => (s.invoices ?? []).filter((i) => org && i.orgId === org.id));
  const checkins = useStore((s) => s.checkins ?? []);

  if (!org || !role || !stats) return <EmptyState emoji="🏫" text={text.noOrgs} />;
  const manager = canManage(role);
  const plan = orgPlan(org);
  const tabs: Tab[] = manager ? TABS.filter((x) => PAYMENTS_ENABLED || x !== "plan") : ["overview"];
  const tab: Tab = tabs.find((x) => x === rawTab) ?? "overview";
  const active = missions.filter((m) => m.isActive && eventPhase(m) !== "closed");
  const missionIds = new Set(missions.map((m) => m.id));
  const pending = submissions.filter((x) => x.status === "pending" && missionIds.has(x.missionId)).length;
  const mine = new Map(submissions.filter((x) => x.userId === user.id).map((x) => [x.missionId, x.status]));
  const me = stats.ranking.find((r) => r.userId === user.id);
  const myEventCerts = submissions
    .filter((x) => x.userId === user.id && x.status === "approved")
    .map((sub) => ({ sub, mission: missions.find((m) => m.id === sub.missionId) }))
    .filter((x): x is { sub: typeof x.sub; mission: NonNullable<typeof x.mission> } => !!x.mission && isEvent(x.mission) && eventUnlocked(plan, x.mission));

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4">
        <OrgAvatar name={org.name} size={64} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-bold text-slate-900 md:text-3xl" data-testid="org-name">
            {org.name}
          </h1>
          <p className="text-sm text-slate-500">
            {text.types[org.type]}
            {org.city ? ` · ${org.city}` : ""}
            {PAYMENTS_ENABLED && (
              <>
                {" · "}
                <span className="font-semibold text-emerald-700">{mk.planNames[plan]}</span>
              </>
            )}{" "}
            · {text.roles[role]}
          </p>
        </div>
        {hasFeature(plan, "certificates") && me && (
          <Link to={`/certificado/${me.memberId}`} className={btnSecondary}>
            <Award className="h-4 w-4 text-amber-500" /> {text.certificate}
          </Link>
        )}
      </div>

      {tabs.length > 1 && (
        <nav className="mt-6 flex gap-2 overflow-x-auto rounded-2xl bg-slate-100 p-1.5" data-testid="org-tabs">
          {tabs.map((x) => (
            <Link
              key={x}
              to={`/org/${org.slug}${x === "overview" ? "" : `/${x}`}`}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${tab === x ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
            >
              {text.tabs[x]}
              {x === "moderation" && pending > 0 && <span className="rounded-full bg-red-500 px-1.5 text-[11px] font-bold text-white">{pending}</span>}
            </Link>
          ))}
        </nav>
      )}

      <div className="mt-6">
        {tab === "overview" && (
          <div className="grid gap-6">
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="org-stats">
              {[
                { value: stats.ranking.length, label: text.statMembers },
                { value: stats.impact.actions, label: text.statActions },
                { value: stats.impact.points, label: text.statPoints },
                { value: active.length, label: text.statMissions },
              ].map((s) => (
                <div key={s.label} className={`${card} p-4`}>
                  <p className="text-2xl font-extrabold text-slate-900">{s.value.toLocaleString(locale(lang))}</p>
                  <p className="text-xs font-medium text-slate-500">{s.label}</p>
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <section className={`${card} p-5`}>
                <h2 className="font-bold text-slate-900">{text.orgMissions}</h2>
                {active.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">{text.orgMissionsEmpty}</p>
                ) : (
                  <ul className="mt-3 grid gap-2" data-testid="org-mission-list">
                    {active.map((m) => (
                      <li key={m.id} className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                        <span className="text-xl">{categoryEmoji[m.category] ?? "🌱"}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                          <p className="text-xs text-slate-500">+{m.pointsReward} pts · {text.scopeAnywhere}</p>
                          <EventBadge lang={lang} mission={m} />
                        </div>
                        {mine.get(m.id) === "approved" || mine.get(m.id) === "pending" ? (
                          <span className="text-xs font-bold text-emerald-700">✓</span>
                        ) : (
                          <Link to={`/missions/${m.id}/submit`} className="shrink-0 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-600">
                            {t(lang, "send_proof")}
                          </Link>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className={`${card} p-5`}>
                <h2 className="font-bold text-slate-900">🏆 {text.ranking}</h2>
                <ol className="mt-3 grid gap-1.5" data-testid="org-ranking">
                  {stats.ranking
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
                {stats.ranking.every((r) => r.points === 0) && <p className="text-sm text-slate-500">{text.rankingEmpty}</p>}
              </section>
            </div>
            {myEventCerts.length > 0 && (
              <section className="rounded-2xl border border-violet-100 bg-violet-50/60 p-5" data-testid="my-event-certificates">
                <h2 className="flex items-center gap-2 font-bold text-slate-900">
                  <Award className="h-5 w-5 text-violet-600" /> {EVENT_TEXT[lang].certTitle}
                </h2>
                <ul className="mt-3 grid gap-2">
                  {myEventCerts.map(({ sub, mission }) => (
                    <li key={sub.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-white px-3 py-2.5">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-slate-900">🎪 {mission.title}</p>
                        <EventBadge lang={lang} mission={mission} />
                      </div>
                      <Link to={`/certificado/evento/${sub.id}`} className="shrink-0 rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-violet-700">
                        {EVENT_TEXT[lang].certificate}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {!manager && (
              <button
                type="button"
                className="justify-self-start text-sm font-semibold text-slate-500 hover:text-red-600"
                onClick={() => {
                  if (!window.confirm(text.leaveConfirm)) return;
                  const result = leaveOrg(org.id);
                  if (result.success) navigate("/org");
                }}
              >
                {text.leave}
              </button>
            )}
          </div>
        )}

        {tab === "missions" && manager && <MissionsTab lang={lang} orgId={org.id} usage={text.missionUsage(active.length, PLANS[plan].maxActiveMissions)} missions={missions} />}

        {tab === "events" && manager && (
          <div className="grid gap-4">
            <EventsPanel
              lang={lang}
              plan={plan}
              isOwner={role === "owner"}
              pixAvailable
              contactUrl={null}
              onOpenReport={(id) => navigate(`/evento/${id}`)}
              onCheckinCode={checkinDisplay}
              events={missions
                .filter((m) => isEvent(m))
                .sort((a, b) => (b.startsAt ?? "").localeCompare(a.startsAt ?? ""))
                .map((m) => {
                  const subs = submissions.filter((x) => x.missionId === m.id);
                  const approved = subs.filter((x) => x.status === "approved");
                  const inv = invoices.find((i) => i.kind === "event" && i.missionId === m.id && i.status === "pending");
                  return {
                    id: m.id,
                    title: localizedTitle(m, lang),
                    category: m.category,
                    startsAt: m.startsAt!,
                    endsAt: m.endsAt!,
                    eventPackage: m.eventPackage ?? null,
                    eventPaidAt: m.eventPaidAt ?? null,
                    people: new Set(approved.map((x) => x.userId)).size,
                    actions: approved.length,
                    pending: subs.filter((x) => x.status === "pending").length,
                    checkins: checkins.filter((c) => c.missionId === m.id).length,
                    invoice: inv
                      ? {
                          ...inv,
                          pixPayload: pixPayload({
                            ...DEMO_PIX,
                            amountCents: inv.amountCents,
                            txid: inv.reference,
                            description: `EcoVerify evento ${isEventPackage(inv.eventPackage) ? EVENT_PACKAGE_NAMES[inv.eventPackage].pt : ""}`.trim(),
                          }),
                        }
                      : null,
                  };
                })}
              onCreate={async (missionId, pkg) => createDemoEventInvoice(missionId, pkg)}
              onReport={async (id) => reportDemoInvoice(id)}
              onCancel={async (id) => cancelDemoInvoice(id)}
            />
          </div>
        )}

        {tab === "moderation" && manager && (
          <div className={`${card} p-6 text-center`}>
            <p className="text-4xl">{pending > 0 ? "📋" : "✅"}</p>
            <p className="mt-2 text-sm text-slate-600">{pending > 0 ? text.moderationHint : text.moderationEmpty}</p>
            {pending > 0 && (
              <Link to="/moderation" className={`${btnPrimary} mt-4`}>
                {text.tabs.moderation} ({pending})
              </Link>
            )}
          </div>
        )}

        {tab === "members" && manager && (
          <div className="grid gap-6">
            <InviteCard lang={lang} orgId={org.id} code={org.inviteCode} canRegenerate={role === "owner"} />
            <section className={`${card} p-5`}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="flex items-center gap-2 font-bold text-slate-900">
                  <Users className="h-5 w-5" /> {text.tabs.members}
                </h2>
                <span className="text-xs font-semibold text-slate-500" data-testid="member-usage">
                  {text.usage(stats.ranking.length, memberLimit(org, orgEventAllowance(org.id)))}
                </span>
              </div>
              {!canPromote(org) && <p className="mt-1 text-xs text-slate-500">{text.teamNeedsPlan}</p>}
              <ul className="mt-3 divide-y divide-slate-100" data-testid="member-list">
                {stats.ranking.map((m) => (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{m.name}</p>
                      <p className="text-xs text-slate-500">
                        {text.roles[m.role]} · {m.points} pts · {text.memberSince} {new Date(m.joinedAt).toLocaleDateString(locale(lang))}
                      </p>
                    </div>
                    {hasFeature(plan, "certificates") && (
                      <Link to={`/certificado/${m.memberId}`} className="text-xs font-semibold text-emerald-700 hover:underline">
                        {text.certificate}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          </div>
        )}

        {tab === "plan" && manager && PAYMENTS_ENABLED && (
          <div className="grid gap-4">
            <BillingPanel
              lang={lang}
              orgId={org.id}
              isOwner={role === "owner"}
              plan={org.plan}
              effectivePlan={plan}
              status={org.subscriptionStatus}
              periodEnd={org.currentPeriodEnd}
              pixAvailable
              contactUrl={null}
              invoices={invoices.filter((i) => i.kind !== "event").map((i) => ({
                ...i,
                pixPayload: i.status === "pending" ? pixPayload({ ...DEMO_PIX, amountCents: i.amountCents, txid: i.reference, description: `EcoVerify ${i.plan}` }) : null,
              }))}
              onCreate={async (orgId, p, cycle) => createDemoInvoice(orgId, p, cycle)}
              onReport={async (id) => reportDemoInvoice(id)}
              onCancel={async (id) => cancelDemoInvoice(id)}
            />
          </div>
        )}

        {tab === "report" && manager && (
          <div className="grid gap-5" data-testid="impact-report">
            {hasFeature(plan, "reports") ? (
              <>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
                      <FileBarChart className="h-5 w-5 text-emerald-600" /> {text.reportTitle}
                    </h2>
                    <p className="text-sm text-slate-500">{text.reportSubtitle(org.name)}</p>
                  </div>
                  <button type="button" onClick={() => window.print()} className={btnPrimary}>
                    {text.reportPrint}
                  </button>
                </div>
                <ImpactView lang={lang} impact={stats.impact} missionsCount={active.length} />
                <section className={`${card} p-5`}>
                  <h3 className="font-bold text-slate-900">{text.reportTopMembers}</h3>
                  <ol className="mt-2 grid gap-1 text-sm">
                    {stats.ranking
                      .filter((r) => r.points > 0)
                      .map((r, i) => (
                        <li key={r.userId} className="flex justify-between">
                          <span>
                            {i + 1}. {r.name}
                          </span>
                          <span className="font-bold text-emerald-700">{r.points} pts</span>
                        </li>
                      ))}
                  </ol>
                </section>
              </>
            ) : (
              <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
                {text.reportNeedsPlan}{" "}
                <Link to={`/org/${org.slug}/plan`} className="font-bold underline">
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

function MissionsTab({
  lang,
  orgId,
  usage,
  missions,
}: {
  lang: Lang;
  orgId: string;
  usage: string;
  missions: { id: string; title: string; category: Category; pointsReward: number; isActive: boolean; startsAt?: string | null; endsAt?: string | null }[];
}) {
  const text = ORG_TEXT[lang];
  const [form, setForm] = useState({ title: "", description: "", category: "recycling" as Category, points: "30" });
  const [error, setError] = useState<string | null>(null);
  const [eventWindow, setEventWindow] = useState<EventWindowValue>({ isEvent: false, startsAt: null, endsAt: null });
  const [formKey, setFormKey] = useState(0);
  const points = useStore((s) => (s.collectionPoints ?? []).filter((p) => p.isActive).map((p) => ({ id: p.id, name: p.name, city: p.city })));
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <form
        className={`${card} grid gap-3 p-5`}
        data-testid="org-mission-form"
        onSubmit={(e) => {
          e.preventDefault();
          const fields = new FormData(e.currentTarget);
          const result = createOrgMission(orgId, {
            ...form,
            proof: parseProofFields((name) => fields.get(name)),
            points: Number(form.points),
            scope: "anywhere",
            ...(eventWindow.isEvent ? { startsAt: eventWindow.startsAt, endsAt: eventWindow.endsAt } : {}),
          });
          if (result.success) {
            setForm({ title: "", description: "", category: "recycling", points: "30" });
            setEventWindow({ isEvent: false, startsAt: null, endsAt: null });
            setFormKey((k) => k + 1);
            setError(null);
            toast(text.missionCreated);
          } else setError(errorText(lang, result.error));
        }}
      >
        <h2 className="font-bold text-slate-900">{text.newMission}</h2>
        <p className="text-xs font-semibold text-slate-500">{usage}</p>
        <label>
          <span className={label}>{text.missionTitle}</span>
          <input required minLength={4} maxLength={120} value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={input} name="title" />
        </label>
        <label>
          <span className={label}>{text.missionDescription}</span>
          <textarea required minLength={10} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={input} name="description" />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label>
            <span className={label}>{text.missionCategory}</span>
            <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })} className={input}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {categoryLabels[c]?.[lang] ?? c}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className={label}>{text.missionPoints}</span>
            <input type="number" min={5} max={200} value={form.points} onChange={(e) => setForm({ ...form, points: e.target.value })} className={input} name="points" />
          </label>
        </div>
        <ProofTypeFields key={`${formKey}-${form.category}`} lang={lang} defaultType={defaultProofType(form.category)} points={points} />
        <EventFields key={formKey} lang={lang} onChange={setEventWindow} />
        <p className="text-xs text-slate-500">{text.pointsOnlyNote}</p>
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button type="submit" className={btnPrimary}>
          {text.missionCreate}
        </button>
      </form>
      <section className={`${card} p-5`}>
        <h2 className="font-bold text-slate-900">{text.orgMissions}</h2>
        <ul className="mt-3 divide-y divide-slate-100" data-testid="org-mission-admin-list">
          {missions.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <span className="text-xl">{categoryEmoji[m.category] ?? "🌱"}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-slate-900">{m.title}</p>
                <p className="text-xs text-slate-500">
                  +{m.pointsReward} pts · <span className={m.isActive ? "text-emerald-700" : "text-slate-400"}>{m.isActive ? text.active : text.inactive}</span>
                </p>
                <EventBadge lang={lang} mission={m} />
              </div>
              <button
                type="button"
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                onClick={() => {
                  const result = toggleOrgMission(m.id);
                  if (result.error) toast(errorText(lang, result.error) ?? "", "error");
                }}
              >
                {m.isActive ? text.deactivate : text.activate}
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function InviteCard({ lang, orgId, code, canRegenerate }: { lang: Lang; orgId: string; code: string; canRegenerate: boolean }) {
  const text = ORG_TEXT[lang];
  const [copied, setCopied] = useState(false);
  return (
    <section className="rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 p-5 text-white shadow-md" data-testid="invite-box">
      <h2 className="font-bold">{text.inviteTitle}</h2>
      <p className="text-sm text-white/85">{text.inviteHint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <span className="rounded-xl bg-white/15 px-4 py-2 font-mono text-2xl font-extrabold tracking-widest" data-testid="invite-code">
          {code}
        </span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-sm font-bold text-emerald-700"
          onClick={async () => {
            await navigator.clipboard?.writeText(code).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} {copied ? text.inviteCopied : text.inviteCopy}
        </button>
        {canRegenerate && (
          <button type="button" className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-white/90 hover:bg-white/10" onClick={() => regenerateOrgInvite(orgId)}>
            <RefreshCw className="h-4 w-4" /> {text.inviteRegenerate}
          </button>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* /certificado/:memberId                                              */
/* ------------------------------------------------------------------ */

export function CertificateScreen({ memberId }: { memberId: string }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const member = useStore((s) => (s.orgMembers ?? []).find((m) => m.id === memberId) ?? null);
  const org = useStore((s) => (member ? (s.orgs ?? []).find((o) => o.id === member.orgId) ?? null : null));
  const stats = useStore((s) => (org ? orgStats(s, org.id).ranking.find((r) => r.memberId === memberId) : undefined));
  const [qr, setQr] = useState("");
  const url = `${window.location.origin}${window.location.pathname}#/certificado/${memberId}`;
  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 0 }).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [url]);

  if (!member || !org || !stats || !hasFeature(orgPlan(org), "certificates")) {
    return <EmptyState emoji="📜" text={text.certificateInvalid} />;
  }
  return (
    <div>
      <div className="mb-4 flex justify-between gap-2 print:hidden">
        <Link to={`/org/${org.slug}`} className={btnSecondary}>
          ← {org.name}
        </Link>
        <button type="button" onClick={() => window.print()} className={btnPrimary}>
          {text.reportPrint}
        </button>
      </div>
      <article className="relative mx-auto aspect-[1.414/1] max-w-4xl overflow-hidden rounded-3xl bg-white p-6 shadow-xl sm:p-10" data-testid="certificate">
        <div className="pointer-events-none absolute inset-3 rounded-[1.4rem] border-4 border-double border-emerald-200" />
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-emerald-100/70" />
        <div className="pointer-events-none absolute -bottom-28 -left-20 h-72 w-72 rounded-full bg-teal-100/60" />
        <div className="relative flex h-full flex-col items-center justify-between text-center">
          <LogoHorizontal height={32} />
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-emerald-700 sm:text-sm">{text.certificateTitle}</p>
            <h1 className="mt-3 font-serif text-3xl font-bold text-slate-900 sm:text-5xl" data-testid="certificate-name">
              {stats.name}
            </h1>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-lg">{text.certificateBody(stats.name, org.name, stats.actions, stats.points)}</p>
          </div>
          <div className="flex w-full items-end justify-between gap-3 text-left">
            <div className="text-[10px] text-slate-500 sm:text-xs">
              <p className="font-semibold text-slate-700">{org.name}</p>
              <p>{text.certificateIssued(new Date().toLocaleDateString(locale(lang)))}</p>
            </div>
            <LogoMark size={40} />
            <div className="h-16 w-16 shrink-0 sm:h-20 sm:w-20 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />
          </div>
        </div>
      </article>
      <p className="mt-3 text-center text-xs text-slate-400">
        <ExternalLink className="mr-1 inline h-3 w-3" />
        {text.certificateVerify}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* /evento/:id and /certificado/evento/:id — one-off events            */
/* ------------------------------------------------------------------ */

export function EventReportScreen({ user, missionId }: { user: User; missionId: string }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const mission = useStore((s) => s.missions.find((m) => m.id === missionId) ?? null);
  const org = useStore((s) => (mission?.organizationId ? (s.orgs ?? []).find((o) => o.id === mission.organizationId) ?? null : null));
  const role = useStore((s) => (org ? orgRole(s, org.id, user.id) : null));
  const submissions = useStore((s) => s.submissions);
  const users = useStore((s) => s.users);
  const checkins = useStore((s) => (s.checkins ?? []).filter((c) => c.missionId === missionId));
  if (!mission || !org || !isEvent(mission) || !(canManage(role) || user.role === "admin")) return <EmptyState emoji="🎪" text={text.certificateInvalid} />;
  if (!eventUnlocked(orgPlan(org), mission)) {
    return (
      <div className="rounded-xl bg-amber-50 p-4 text-sm text-amber-900">
        {EVENT_TEXT[lang].locked} ·{" "}
        <Link to={`/org/${org.slug}/events`} className="font-bold underline">
          {EVENT_TEXT[lang].payEvent}
        </Link>
      </div>
    );
  }
  const approved = submissions.filter((x) => x.missionId === mission.id && x.status === "approved").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));
  return (
    <div className="-mx-4 -my-6 sm:mx-0 sm:my-0">
      <EventReportView
        lang={lang}
        data={{
          orgName: org.name,
          title: mission.title,
          category: mission.category,
          city: mission.city ?? null,
          startsAt: mission.startsAt!,
          endsAt: mission.endsAt!,
          actions: approved.length,
          recycledKg: approved.reduce((sum, x) => sum + (x.weightKg ?? 0), 0),
          participants: approved.map((x) => ({
            submissionId: x.id,
            name: users.find((u) => u.id === x.userId)?.name ?? "—",
            points: mission.pointsReward,
            at: x.submittedAt,
            checkedIn: checkins.some((c) => c.userId === x.userId),
          })),
          photos: approved.map((x) => x.photo),
          checkins: checkins.length,
        }}
        toolbar={
          <>
            <Link to={`/org/${org.slug}/events`} className={btnSecondary}>
              ← {org.name}
            </Link>
            <button type="button" onClick={() => window.print()} className={btnPrimary}>
              {text.reportPrint}
            </button>
          </>
        }
        certificate={(submissionId) => (
          <Link to={`/certificado/evento/${submissionId}`} className="text-xs font-semibold text-violet-700 hover:underline" data-testid="event-certificate-link">
            {EVENT_TEXT[lang].certificate}
          </Link>
        )}
      />
    </div>
  );
}

export function EventCertificateScreen({ submissionId }: { submissionId: string }) {
  const lang = useLang();
  const text = ORG_TEXT[lang];
  const sub = useStore((s) => s.submissions.find((x) => x.id === submissionId) ?? null);
  const mission = useStore((s) => (sub ? s.missions.find((m) => m.id === sub.missionId) ?? null : null));
  const org = useStore((s) => (mission?.organizationId ? (s.orgs ?? []).find((o) => o.id === mission.organizationId) ?? null : null));
  const person = useStore((s) => (sub ? s.users.find((u) => u.id === sub.userId) ?? null : null));
  const [qr, setQr] = useState("");
  const url = `${window.location.origin}${window.location.pathname}#/certificado/evento/${submissionId}`;
  useEffect(() => {
    let alive = true;
    QRCode.toString(url, { type: "svg", margin: 0 }).then((svg) => alive && setQr(svg));
    return () => {
      alive = false;
    };
  }, [url]);
  if (!sub || !mission || !org || !person || sub.status !== "approved" || !isEvent(mission) || !eventUnlocked(orgPlan(org), mission)) {
    return <EmptyState emoji="📜" text={text.certificateInvalid} />;
  }
  return (
    <div className="-mx-4 -my-6 sm:mx-0 sm:my-0">
      <EventCertificateView
        lang={lang}
        qrSvg={qr}
        data={{ name: person.name, title: mission.title, orgName: org.name, startsAt: mission.startsAt!, endsAt: mission.endsAt!, code: proofCode(sub.id), url }}
        toolbar={
          <button type="button" onClick={() => window.print()} className={btnPrimary}>
            {text.reportPrint}
          </button>
        }
      />
    </div>
  );
}
