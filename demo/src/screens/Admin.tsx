import { useState, type FormEvent } from "react";
import { BarChart3, Crosshair, Loader2, Plus, Users, Clock, CheckCircle2, Coins, Hourglass, Target } from "lucide-react";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { formatDate, formatFone } from "@/lib/utils";
import type { Role } from "@/lib/nav";
import { dt, errorText, type DemoKey } from "../i18n";
import {
  confirmDemoInvoice,
  grantDemoPlan,
  createMission,
  localizedTitle,
  reviewMission,
  setUserBan,
  setUserRole,
  cardsOf,
  giveCard,
  keepCard,
  liftSuspension,
  moderatorsOn,
  revokeCard,
  setModeratorsEnabled,
  type State,
  createSponsor,
  payoutSettingsOf,
  releaseHeldRewards,
  simulateUserPayout,
  skipHoldPeriod,
  sponsorBalance,
  toggleMission,
  topUpSponsor,
  treasuryMonthCents,
  impactRows,
  createOffer,
  regenerateOfferToken,
  toggleOffer,
  updatePayoutSettings,
  userPayout,
  useLang,
  useStore,
  type Category,
  type Mission,
  type User,
} from "../store";
import { placeOf } from "../municipalities";
import { getCurrentPosition } from "../media";
import { Avatar, Modal, PageHeader, btnPrimary, btnSecondary, card, input, label, toast } from "../components/ui";
import { FoneAmount, FoneMark } from "@/components/brand/fone";
import { centsToFone, foneToCents } from "@/lib/fone";
import { CARD_REASON_LABELS, isSuspended } from "@/lib/cards";
import { CardBadges, UserSheetView, type SheetUser, type UserDetails } from "@/components/admin/user-sheet-view";
import { HOLD_REASONS, isReadyToPay } from "@/lib/payout-rules";
import { Link } from "../router";
import { BusinessTab, type BusinessData } from "@/components/admin/business-tab";
import { PLANS } from "@/lib/plans";
import { orgPlan } from "@/lib/saas/org-rules";
import { monthStart } from "@/lib/payout-rules";
import { DataTab, RecyclingTab } from "@/components/admin/impact-tabs";
import { dataTables, recyclingSummary } from "@/lib/impact";
import { BenefitsTab, type AdminOffer } from "@/components/admin/benefits-tab";

type Tab = "metrics" | "business" | "benefits" | "missions" | "users" | "rewards" | "recycling" | "data";
export const ADMIN_TAB_KEY = "ecoverify-admin-tab";
const BUSINESS_LABEL = { pt: "Negócios", en: "Business", es: "Negocios" };
const EXTRA_TABS: Partial<Record<Tab, { icon: string; label: Record<Lang, string> }>> = {
  business: { icon: "💼", label: BUSINESS_LABEL },
  benefits: { icon: "🎁", label: { pt: "Benefícios", en: "Perks", es: "Beneficios" } },
  recycling: { icon: "♻️", label: { pt: "Reciclagem", en: "Recycling", es: "Reciclaje" } },
  data: { icon: "🗺️", label: { pt: "Dados", en: "Data", es: "Datos" } },
};

/** Same panel as the web app (src/components/admin/benefits-tab.tsx); the partner link opens #/parceiro/<token>. */
function DemoBenefitsTab() {
  const offers = useStore<AdminOffer[]>((s) => {
    const since = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return (s.offers ?? [])
      .map((o) => {
        const codes = (s.redemptions ?? []).filter((r) => r.offerId === o.id);
        return {
          ...o,
          generated: codes.length,
          used: codes.filter((r) => r.usedAt).length,
          used30: codes.filter((r) => r.usedAt && new Date(r.usedAt).getTime() > since).length,
        };
      })
      .sort((a, b) => Number(b.isActive) - Number(a.isActive) || b.createdAt.localeCompare(a.createdAt));
  });
  return (
    <BenefitsTab
      offers={offers}
      partnerBase={`${window.location.origin}${window.location.pathname}#/parceiro/`}
      demoNote="Demonstração: comércios de exemplo. Resgate um benefício como Maria, abra o link de validação do parceiro e digite o código — Maria recebe a notificação."
      actions={{
        createOffer: async (input) => createOffer(input),
        toggleOffer: async (id) => toggleOffer(id),
        regenerateToken: async (id) => regenerateOfferToken(id),
      }}
    />
  );
}

/** Same panels as the web app (src/components/admin/impact-tabs.tsx); the CSV is built in the browser. */
function DemoRecyclingTab() {
  const all = useStore((s) => impactRows(s));
  return (
    <RecyclingTab
      summary={recyclingSummary(all)}
      rows={all}
      demoNote="Demonstração: entregas de exemplo. Aprove a entrega da Beatriz na Moderação (dá para corrigir o peso) e veja os números mudarem aqui."
    />
  );
}

function DemoDataTab() {
  const tables = useStore((s) => dataTables(impactRows(s)));
  return (
    <DataTab
      tables={tables}
      demoNote="Demonstração: poucos participantes de exemplo, por isso vários grupos aparecem ocultos (menos de 5 pessoas). É exatamente o que protege a identidade de cada um."
    />
  );
}

/** Same panel as the web app (src/components/admin/business-tab.tsx), fed by the local store. */
function DemoBusinessTab() {
  const data = useStore<BusinessData>((s) => {
    const orgs = (s.orgs ?? []).map((o) => ({ ...o, effective: orgPlan(o) }));
    const paying = orgs.filter((o) => o.effective !== "free" && o.subscriptionStatus === "active");
    const paidAll = (s.invoices ?? []).filter((i) => i.status === "paid");
    const paid = paidAll.filter((i) => i.kind !== "event");
    const paidEvents = paidAll.filter((i) => i.kind === "event");
    const month = monthStart(new Date()).getTime();
    return {
      mrrCents: paying.reduce((sum, o) => sum + (o.billingCycle === "yearly" && PLANS[o.effective].yearlyCents ? Math.round(PLANS[o.effective].yearlyCents! / 12) : (PLANS[o.effective].monthlyCents ?? 0)), 0),
      receivedMonthCents: paid.filter((i) => i.paidAt && new Date(i.paidAt).getTime() >= month).reduce((sum, i) => sum + i.amountCents, 0),
      receivedTotalCents: paid.reduce((sum, i) => sum + i.amountCents, 0),
      campaignFeesMonthCents: 0,
      campaignFeesTotalCents: 0,
      eventsMonthCents: paidEvents.filter((i) => i.paidAt && new Date(i.paidAt).getTime() >= month).reduce((sum, i) => sum + i.amountCents, 0),
      eventsTotalCents: paidEvents.reduce((sum, i) => sum + i.amountCents, 0),
      eventsPaidCount: paidEvents.length,
      payingOrgs: paying.length,
      trialOrgs: orgs.filter((o) => o.effective !== "free" && o.subscriptionStatus === "trialing").length,
      totalOrgs: orgs.length,
      pendingInvoices: (s.invoices ?? [])
        .filter((i) => i.status === "pending")
        .map((i) => {
          const org = orgs.find((o) => o.id === i.orgId);
          return { id: i.id, orgName: org?.name ?? "—", orgSlug: org?.slug ?? "", plan: i.plan, cycle: i.billingCycle, amountCents: i.amountCents, reference: i.reference, reportedAt: i.reportedAt, createdAt: i.createdAt, kind: i.kind ?? "plan", eventPackage: i.eventPackage ?? null, eventTitle: i.missionId ? (s.missions.find((m) => m.id === i.missionId)?.title ?? null) : null };
        }),
      orgs: orgs.map((o) => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
        type: o.type,
        plan: o.plan,
        effectivePlan: o.effective,
        status: o.subscriptionStatus,
        periodEnd: o.currentPeriodEnd,
        members: (s.orgMembers ?? []).filter((m) => m.orgId === o.id).length,
        ownerEmail: s.users.find((u) => u.id === o.ownerId)?.email ?? null,
      })),
    };
  });
  return (
    <BusinessTab
      data={data}
      demoNote="Demonstração: os valores e o Pix são fictícios. No app real, o dinheiro dos planos cai direto na chave Pix configurada (PIX_KEY) e você confirma aqui."
      actions={{
        confirmInvoice: async (id) => confirmDemoInvoice(id),
        grantPlan: async (orgId, plan, months) => grantDemoPlan(orgId, plan, months),
      }}
    />
  );
}

export function AdminScreen({ user }: { user: User }) {
  const lang = useLang();
  const [tab, setTab] = useState<Tab>(() => {
    // The presentation tour opens the Rewards tab directly.
    const wanted = sessionStorage.getItem(ADMIN_TAB_KEY);
    sessionStorage.removeItem(ADMIN_TAB_KEY);
    return wanted === "rewards" || wanted === "missions" || wanted === "users" || wanted === "business" || wanted === "recycling" || wanted === "data"
      ? wanted
      : "metrics";
  });
  const businessBadge = useStore((st) => (st.invoices ?? []).filter((i) => i.status === "pending" && i.reportedAt).length);
  // Appeals waiting for an answer: card appeals plus blocked/suspended accounts.
  const usersBadge = useStore(
    (st) =>
      (st.cards ?? []).filter((c) => c.appealedAt && !c.revokedAt && !c.appealRejectedAt).length +
      st.users.filter((u) => u.banAppealedAt && (u.isBanned || isSuspended(u.suspendedUntil))).length,
  );
  const tabs: { id: Tab; key: "admin_tab_metrics" | "admin_tab_missions" | "admin_tab_users" | "admin_tab_rewards" | null }[] = [
    { id: "metrics", key: "admin_tab_metrics" },
    { id: "business", key: null },
    { id: "benefits", key: null },
    { id: "missions", key: "admin_tab_missions" },
    { id: "users", key: "admin_tab_users" },
    { id: "rewards", key: "admin_tab_rewards" },
    { id: "recycling", key: null },
    { id: "data", key: null },
  ];
  return (
    <>
      <PageHeader title={t(lang, "admin_title")} icon={BarChart3} />
      <div className="mb-5 flex gap-1 overflow-x-auto rounded-2xl bg-white p-1 shadow-sm ring-1 ring-black/5">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`flex-1 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-semibold transition ${tab === tb.id ? "bg-emerald-500 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"}`}
          >
            {tb.key
              ? `${t(lang, tb.key)}${tb.id === "users" && usersBadge ? ` (${usersBadge})` : ""}`
              : `${EXTRA_TABS[tb.id]?.icon} ${EXTRA_TABS[tb.id]?.label[lang]}${tb.id === "business" && businessBadge ? ` (${businessBadge})` : ""}`}
          </button>
        ))}
      </div>
      {tab === "metrics" && <MetricsTab />}
      {tab === "business" && <DemoBusinessTab />}
      {tab === "benefits" && <DemoBenefitsTab />}
      {tab === "missions" && <MissionsTab />}
      {tab === "users" && <UsersTab me={user} />}
      {tab === "rewards" && <RewardsTab />}
      {tab === "recycling" && <DemoRecyclingTab />}
      {tab === "data" && <DemoDataTab />}
    </>
  );
}

function MetricsTab() {
  const lang = useLang();
  const s = useStore((st) => st);
  const sum = (status: "paid" | "pending") => s.rewards.filter((r) => r.status === status).reduce((acc, r) => acc + Number(r.foneAmount), 0);
  const metrics: { icon: typeof Users; key: DemoKey; value: string; tone: string }[] = [
    { icon: Users, key: "metric_users", value: String(s.users.filter((u) => !u.deletedAt).length), tone: "bg-sky-50 text-sky-700" },
    { icon: Target, key: "metric_active_missions", value: String(s.missions.filter((m) => m.isActive).length), tone: "bg-emerald-50 text-emerald-700" },
    { icon: Clock, key: "metric_pending", value: String(s.submissions.filter((x) => x.status === "pending").length), tone: "bg-amber-50 text-amber-700" },
    { icon: CheckCircle2, key: "metric_approved", value: String(s.submissions.filter((x) => x.status === "approved").length), tone: "bg-teal-50 text-teal-700" },
    { icon: Coins, key: "metric_fone_paid", value: formatFone(sum("paid")), tone: "bg-lime-50 text-lime-700" },
    { icon: Hourglass, key: "metric_fone_queue", value: formatFone(sum("pending")), tone: "bg-orange-50 text-orange-700" },
  ];
  const byCategory = Object.keys(categoryLabels).map((cat) => ({
    cat,
    count: s.submissions.filter((x) => x.status === "approved" && s.missions.find((m) => m.id === x.missionId)?.category === cat).length,
  }));
  const max = Math.max(1, ...byCategory.map((c) => c.count));
  return (
    <div className="grid gap-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {metrics.map((m) => (
          <div key={m.key} className={`${card} p-4 animate-slide-up`}>
            <div className={`mb-2 grid h-9 w-9 place-items-center rounded-xl ${m.tone}`}><m.icon className="h-5 w-5" /></div>
            <p className="text-2xl font-extrabold text-slate-900">{m.value}</p>
            <p className="text-xs font-medium text-slate-500">{dt(lang, m.key)}</p>
          </div>
        ))}
      </div>
      <div className={`${card} p-5`}>
        <h3 className="mb-3 text-sm font-bold text-slate-900">{dt(lang, "metric_approved")}</h3>
        <div className="grid gap-2.5">
          {byCategory.map((c) => (
            <div key={c.cat} className="flex items-center gap-3 text-sm">
              <span className="w-40 shrink-0 truncate text-slate-600">{categoryEmoji[c.cat]} {categoryLabels[c.cat][lang]}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${(c.count / max) * 100}%` }} />
              </div>
              <span className="w-6 text-right font-bold text-slate-800">{c.count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const emptyForm = { title: "", description: "", category: "cleanup" as Category, points: "50", fone: "25", latitude: "-8.0631", longitude: "-34.8711", sponsor: "", sponsorId: "" };

function ReviewItem({ mission }: { mission: Mission }) {
  const lang = useLang();
  const [fone, setFone] = useState("");
  const decide = (decision: "fone" | "points" | "deactivate") => {
    const result = reviewMission(mission.id, decision, Number(fone.replace(",", ".")));
    if (result.error) toast(errorText(lang, result.error), "error");
  };
  return (
    <div className="rounded-xl border border-black/5 p-3" data-testid="mission-review">
      <p className="font-semibold text-slate-800">
        {categoryEmoji[mission.category]} {localizedTitle(mission, lang)}
      </p>
      <p className="text-xs text-slate-500">
        ✨ OpenStreetMap · ⭐ {mission.pointsReward} · {mission.city}, {mission.stateCode}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm" inputMode="decimal" placeholder="FONE" value={fone} onChange={(e) => setFone(e.target.value)} aria-label="FONE" />
        <button type="button" onClick={() => decide("fone")} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white">{dt(lang, "review_fone")}</button>
        <button type="button" onClick={() => decide("points")} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700">{dt(lang, "review_points")}</button>
        <button type="button" onClick={() => decide("deactivate")} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600">{dt(lang, "review_off")}</button>
      </div>
    </div>
  );
}

function MissionsTab() {
  const lang = useLang();
  const missions = useStore((s) => s.missions);
  const requests = useStore((s) => s.missionRequests ?? []);
  const sponsors = useStore((s) => s.sponsors ?? []);
  const [open, setOpen] = useState(false);
  const [anywhere, setAnywhere] = useState(false);
  const toReview = missions.filter((m) => m.needsReview && m.isActive);
  const demand = Object.values(
    requests.reduce<Record<number, { city: string; uf: string; n: number }>>((acc, r) => {
      acc[r.ibge] = { city: r.city, uf: r.uf, n: (acc[r.ibge]?.n ?? 0) + 1 };
      return acc;
    }, {}),
  ).sort((a, b) => b.n - a.n);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const latitude = Number(form.latitude.replace(",", "."));
    const longitude = Number(form.longitude.replace(",", "."));
    const place = !anywhere && Number.isFinite(latitude) && Number.isFinite(longitude) ? await placeOf(latitude, longitude) : null;
    const result = createMission({
      scope: anywhere ? "anywhere" : "local",
      city: place?.city ?? null,
      stateCode: place?.stateCode ?? null,
      sponsorName: form.sponsor.trim().slice(0, 80) || null,
      sponsorId: form.sponsorId || null,
      title: form.title,
      description: form.description,
      category: form.category,
      pointsReward: Number(form.points),
      // Accept "25,50" (pt-BR keyboards) as well as "25.50".
      foneReward: form.fone.replace(",", "."),
      latitude,
      longitude,
    });
    if (result.error) return setError(errorText(lang, result.error));
    toast(dt(lang, "mission_created"));
    setForm(emptyForm);
    setAnywhere(false);
    setError(null);
    setOpen(false);
  };

  const useMyLocation = async () => {
    setLocating(true);
    try {
      const pos = await getCurrentPosition();
      setForm((f) => ({ ...f, latitude: pos.latitude.toFixed(6), longitude: pos.longitude.toFixed(6) }));
    } catch {
      setError(dt(lang, "location_error"));
    } finally {
      setLocating(false);
    }
  };

  return (
    <>
      {toReview.length > 0 && (
        <div className={`${card} mb-4 border-sky-200 p-4`} data-testid="missions-review">
          <h3 className="font-bold text-slate-900">🔎 {dt(lang, "review_title")} ({toReview.length})</h3>
          <p className="mb-3 text-sm text-slate-500">{dt(lang, "review_hint")}</p>
          <div className="grid gap-2">
            {toReview.map((m) => (
              <ReviewItem key={m.id} mission={m} />
            ))}
          </div>
        </div>
      )}
      {demand.length > 0 && (
        <div className={`${card} mb-4 p-4`} data-testid="city-demand">
          <h3 className="mb-2 font-bold text-slate-900">🙋 {dt(lang, "city_demand")}</h3>
          <ul className="text-sm">
            {demand.map((d) => (
              <li key={`${d.city}-${d.uf}`} className="flex justify-between border-t border-black/5 py-1.5">
                <span>{d.city}, {d.uf}</span>
                <b>{d.n}</b>
              </li>
            ))}
          </ul>
        </div>
      )}
      <button type="button" className={`${btnPrimary} mb-4`} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {dt(lang, "new_mission")}
      </button>
      <SponsorsPanel />
      <div className="grid gap-2.5">
        {missions.map((m) => (
          <div key={m.id} className={`${card} flex items-center gap-3 p-4 ${m.isActive ? "" : "opacity-60"}`}>
            <span className="text-2xl">{categoryEmoji[m.category] ?? "🌱"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{localizedTitle(m, lang)}</p>
              <p className="text-xs text-slate-500">{m.pointsReward} {t(lang, "reward_points")} · <FoneAmount amount={m.foneReward} size={12} className="align-middle" /> · {m.scope === "anywhere" ? `🌎 ${t(lang, "mission_anywhere")}` : m.city ? `📍 ${m.city}, ${m.stateCode}` : `${m.latitude.toFixed(4)}, ${m.longitude.toFixed(4)}`}</p>
            </div>
            <button
              type="button"
              onClick={() => toggleMission(m.id)}
              className={`rounded-xl px-3 py-1.5 text-xs font-bold ${m.isActive ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`}
              title={dt(lang, m.isActive ? "deactivate" : "activate")}
            >
              {dt(lang, m.isActive ? "active" : "inactive")}
            </button>
          </div>
        ))}
      </div>
      {open && (
        <Modal title={dt(lang, "new_mission")} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="grid gap-3">
            <div>
              <label className={label}>{dt(lang, "field_title")}</label>
              <input className={input} value={form.title} onChange={set("title")} required minLength={3} maxLength={200} />
            </div>
            <div>
              <label className={label}>{dt(lang, "field_description")}</label>
              <textarea className={input} rows={3} value={form.description} onChange={set("description")} required minLength={10} maxLength={2000} />
            </div>
            <div>
              <label className={label}>{dt(lang, "field_category")}</label>
              <select className={input} value={form.category} onChange={set("category")}>
                {Object.keys(categoryLabels).map((c) => (
                  <option key={c} value={c}>{categoryEmoji[c]} {categoryLabels[c][lang]}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>{dt(lang, "field_points")}</label>
                <input className={input} type="number" min={1} max={10000} value={form.points} onChange={set("points")} required />
              </div>
              <div>
                <label className={label}>{dt(lang, "field_fone")}</label>
                <input className={input} inputMode="decimal" value={form.fone} onChange={set("fone")} required />
              </div>
              <div>
                <label className={label}>{dt(lang, "field_latitude")}</label>
                <input className={input} inputMode="decimal" value={form.latitude} onChange={set("latitude")} required />
              </div>
              <div>
                <label className={label}>{dt(lang, "field_longitude")}</label>
                <input className={input} inputMode="decimal" value={form.longitude} onChange={set("longitude")} required />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={anywhere} onChange={(e) => setAnywhere(e.target.checked)} className="accent-emerald-600" />
              🌎 {dt(lang, "field_anywhere")}
            </label>
            {sponsors.length > 0 && (
              <div>
                <label className={label}>💰 {dt(lang, "field_sponsor_pays")}</label>
                <select className={input} value={form.sponsorId} onChange={set("sponsorId")} data-testid="mission-sponsor">
                  <option value="">{dt(lang, "treasury_option")}</option>
                  {sponsors.filter((sp) => sp.isActive).map((sp) => (
                    <option key={sp.id} value={sp.id}>{sp.name}</option>
                  ))}
                </select>
              </div>
            )}
            {!form.sponsorId && (
              <div>
                <label className={label}>🤝 {dt(lang, "field_sponsor")}</label>
                <input className={input} value={form.sponsor} onChange={set("sponsor")} maxLength={80} />
              </div>
            )}
            <button type="button" className={btnSecondary} onClick={useMyLocation} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} {dt(lang, "use_my_location")}
            </button>
            {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button type="submit" className={btnPrimary}>{dt(lang, "create_mission")}</button>
          </form>
        </Modal>
      )}
    </>
  );
}

function demoDetails(s: State, userId: string): UserDetails {
  const subs = s.submissions.filter((x) => x.userId === userId);
  const rewards = s.rewards.filter((r) => r.userId === userId);
  const sum = (status: "paid" | "pending") => centsToFone(rewards.filter((r) => r.status === status).reduce((acc, r) => acc + foneToCents(r.foneAmount), 0));
  return {
    cards: cardsOf(s, userId),
    approved: subs.filter((x) => x.status === "approved").length,
    rejected: subs.filter((x) => x.status === "rejected").length,
    pending: subs.filter((x) => x.status === "pending").length,
    fonePaid: sum("paid"),
    foneOpen: sum("pending"),
  };
}

function sheetUser(u: User): SheetUser {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    totalPoints: u.totalPoints,
    createdAt: u.createdAt,
    isBanned: u.isBanned,
    banReason: u.banReason ?? null,
    suspendedUntil: u.suspendedUntil ?? null,
    suspensionReason: u.suspensionReason ?? null,
    walletVerifiedAt: u.walletAddress ? u.createdAt : null,
  };
}

/** Same sheet as the web app (src/components/admin/user-sheet-view.tsx), fed by the local store. */
function DemoUserSheet({ userId, onClose }: { userId: string; onClose: () => void }) {
  const user = useStore((s) => s.users.find((u) => u.id === userId));
  const details = useStore((s) => demoDetails(s, userId));
  if (!user) return null;
  return (
    <UserSheetView
      user={sheetUser(user)}
      details={details}
      onClose={onClose}
      handlers={{
        onGive: ({ type, reason, note }) => {
          const result = giveCard(user.id, type, reason, note);
          return result.error ? result : { success: true };
        },
        onRevoke: revokeCard,
        onKeep: keepCard,
        onLift: () => liftSuspension(user.id),
      }}
    />
  );
}

function ModeratorsSwitch() {
  const enabled = useStore((s) => moderatorsOn(s));
  return (
    <label className={`${card} mb-4 flex items-start gap-3 p-4 text-sm`} data-testid="moderators-switch">
      <input
        type="checkbox"
        checked={enabled}
        onChange={(e) => setModeratorsEnabled(e.target.checked)}
        className="mt-0.5 h-5 w-5 accent-emerald-500"
        data-testid="moderators-toggle"
      />
      <span>
        <span className="font-bold text-slate-900">Moderadores podem revisar comprovações</span>
        <span className="mt-0.5 block text-xs text-slate-500">
          {enabled
            ? "Ligado: quem tem o papel Moderador revisa comprovações e dá cartão amarelo. Vermelho, suspensão, banimento e FONE são só do admin."
            : "Desligado: só administradores veem a Moderação."}{" "}
          No app real começa desligado (MODERATORS_ENABLED); na demo começa ligado para você testar o Carlos.
        </span>
      </span>
    </label>
  );
}

function CardAppealsPanel({ onOpen }: { onOpen: (userId: string) => void }) {
  const lang = useLang();
  const appeals = useStore((s) =>
    (s.cards ?? [])
      .filter((c) => c.appealedAt && !c.revokedAt && !c.appealRejectedAt)
      .map((c) => ({ ...c, userName: s.users.find((u) => u.id === c.userId)?.name ?? "?" })),
  );
  if (!appeals.length) return null;
  return (
    <div className={`${card} mb-4 border-sky-200 p-4`} data-testid="card-appeals">
      <h3 className="mb-2 font-bold text-slate-900">⚖️ Contestações de cartões ({appeals.length})</h3>
      <ul className="space-y-2">
        {appeals.map((c) => (
          <li key={c.id} className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
            <p className="font-bold">
              {c.type === "red" ? "🟥" : "🟨"} {c.userName} · {CARD_REASON_LABELS[c.reasonCode].pt} · {c.appealedAt ? formatDate(c.appealedAt, lang) : ""}
            </p>
            <p className="mt-0.5 whitespace-pre-line">“{c.appealMessage}”</p>
            <div className="mt-1.5 flex flex-wrap gap-2">
              <button type="button" onClick={() => revokeCard(c.id)} className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 font-bold text-emerald-700" data-testid="appeal-accept">
                Aceitar (cancelar cartão)
              </button>
              <button type="button" onClick={() => keepCard(c.id)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700" data-testid="appeal-keep">
                Manter cartão
              </button>
              <button type="button" onClick={() => onOpen(c.userId)} className="rounded-lg px-2.5 py-1 font-bold text-sky-800 underline">
                Ver ficha
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function UsersTab({ me }: { me: User }) {
  const lang = useLang();
  const allUsers = useStore((s) => s.users.filter((u) => !u.deletedAt));
  const allCards = useStore((s) => s.cards ?? []);
  const [sheetId, setSheetId] = useState<string | null>(null);
  const blocked = (u: User) => u.isBanned || isSuspended(u.suspendedUntil);
  // Blocked or suspended people waiting for an answer to their appeal come first.
  const users = [...allUsers].sort((a, b) => Number(!!(blocked(b) && b.banAppealedAt)) - Number(!!(blocked(a) && a.banAppealedAt)));
  const roles: { id: Role; key: DemoKey }[] = [
    { id: "citizen", key: "demo_role_citizen" },
    { id: "moderator", key: "demo_role_moderator" },
    { id: "admin", key: "demo_role_admin" },
  ];
  return (
    <>
      <ModeratorsSwitch />
      <CardAppealsPanel onOpen={setSheetId} />
      <div className={`${card} divide-y divide-slate-100`}>
        {users.map((u) => {
          const suspended = !u.isBanned && isSuspended(u.suspendedUntil);
          return (
            <div key={u.id} className="flex flex-wrap items-center gap-3 p-4" data-testid="admin-user-row">
              <Avatar name={u.name} size={38} />
              <div className="min-w-0 flex-1 basis-40">
                <p className="flex flex-wrap items-center gap-1.5 text-sm font-semibold text-slate-900">
                  <span className="truncate">{u.name}</span>
                  {u.id === me.id && <span className="text-xs text-emerald-600">({dt(lang, "you")})</span>}
                  {u.isBanned && <span className="rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{dt(lang, "banned_label")}</span>}
                  <CardBadges cards={allCards.filter((c) => c.userId === u.id)} suspendedUntil={u.suspendedUntil ?? null} />
                </p>
                <p className="truncate text-xs text-slate-500">{u.email} · {u.totalPoints} {t(lang, "reward_points")}</p>
                {u.isBanned && (
                  <p className="mt-0.5 text-xs text-red-600">
                    {t(lang, "banned_reason")}: {u.banReason || t(lang, "banned_no_reason")}
                    {u.bannedAt && <span className="text-red-400"> · {t(lang, "banned_since")} {formatDate(u.bannedAt, lang)}</span>}
                  </p>
                )}
                {suspended && u.suspensionReason && <p className="mt-0.5 text-xs text-orange-700">{u.suspensionReason}</p>}
                {(u.isBanned || suspended) && u.banAppealedAt && (
                  <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="ban-appeal">
                    <p className="font-bold">⚖️ {t(lang, "staff_ban_appeal_title").replace("⚖️ ", "")} · {formatDate(u.banAppealedAt, lang)}</p>
                    <p className="mt-0.5 whitespace-pre-line">“{u.banAppealMessage}”</p>
                  </div>
                )}
              </div>
              <div className="flex w-full flex-wrap items-center justify-end gap-2 sm:w-auto">
                <button
                  type="button"
                  onClick={() => setSheetId(u.id)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  data-testid="open-user-sheet"
                >
                  Ficha
                </button>
                {u.id !== me.id && (
                  <>
                    <select
                      className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-700"
                      value={u.role}
                      onChange={(e) => {
                        const result = setUserRole(u.id, e.target.value as Role);
                        if (result.error) toast(errorText(lang, result.error), "error");
                      }}
                    >
                      {roles.map((r) => <option key={r.id} value={r.id}>{dt(lang, r.key)}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        if (u.isBanned) setUserBan(u.id, false);
                        else {
                          const reason = window.prompt(dt(lang, "ban_reason_prompt"));
                          if (reason !== null) setUserBan(u.id, true, reason);
                        }
                      }}
                      className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${u.isBanned ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}
                    >
                      {dt(lang, u.isBanned ? "unban" : "ban")}
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {sheetId && <DemoUserSheet userId={sheetId} onClose={() => setSheetId(null)} />}
    </>
  );
}

function SponsorsPanel() {
  const lang = useLang();
  const state = useStore((s) => s);
  const sponsors = state.sponsors ?? [];
  const [name, setName] = useState("");
  const [budget, setBudget] = useState("");
  const [topUp, setTopUp] = useState<Record<string, string>>({});
  return (
    <div className={`${card} mb-4 p-4`} data-testid="sponsors-panel">
      <h3 className="font-bold text-slate-900">🤝 {dt(lang, "sponsors_title")}</h3>
      <p className="mb-3 text-xs text-slate-500">{dt(lang, "sponsors_hint")}</p>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const result = createSponsor(name, budget);
          if (result.error) return toast(errorText(lang, result.error), "error");
          setName("");
          setBudget("");
        }}
      >
        <input className={`${input} min-w-0 flex-1`} placeholder={dt(lang, "sponsor_name")} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required />
        <input className={`${input} w-32`} placeholder={dt(lang, "sponsor_budget")} inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} required />
        <button type="submit" className={`${btnPrimary} !py-2 text-sm`}>{dt(lang, "sponsor_add")}</button>
      </form>
      <ul className="mt-3 grid gap-2">
        {sponsors.map((sp) => {
          const bal = sponsorBalance(state, sp.id);
          const pct = bal.budgetCents ? Math.min(100, Math.round((bal.spentCents / bal.budgetCents) * 100)) : 100;
          return (
            <li key={sp.id} className="border-t border-black/5 pt-2" data-testid="sponsor-row">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <span className="font-semibold text-slate-800">{sp.name}</span>
                <span className="text-xs text-slate-500" data-testid="sponsor-balance">
                  {dt(lang, "sponsor_left", { left: centsToFone(bal.remainingCents), budget: centsToFone(bal.budgetCents) })}
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div className={`h-full ${pct >= 90 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-xs"
                  inputMode="decimal"
                  placeholder="+ FONE"
                  value={topUp[sp.id] ?? ""}
                  onChange={(e) => setTopUp((v) => ({ ...v, [sp.id]: e.target.value }))}
                />
                <button
                  type="button"
                  className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-bold text-white"
                  onClick={() => {
                    const result = topUpSponsor(sp.id, topUp[sp.id] ?? "");
                    if (result.error) return toast(errorText(lang, result.error), "error");
                    setTopUp((v) => ({ ...v, [sp.id]: "" }));
                  }}
                >
                  {dt(lang, "sponsor_topup")}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function PayoutSettingsForm() {
  const lang = useLang();
  const settings = useStore((s) => payoutSettingsOf(s));
  const [form, setForm] = useState(() => ({
    minPayoutFone: settings.minPayoutFone.toFixed(2),
    holdDays: String(settings.holdDays),
    monthlyBudgetFone: settings.monthlyBudgetFone?.toFixed(2) ?? "",
    maxFonePerUserMonth: settings.maxFonePerUserMonth?.toFixed(2) ?? "",
  }));
  const field = (key: keyof typeof form, labelKey: DemoKey, optional = false) => (
    <label className="block text-sm">
      <span className={label}>{dt(lang, labelKey)}</span>
      <input
        className={input}
        inputMode="decimal"
        name={key}
        value={form[key]}
        placeholder={optional ? dt(lang, "payout_no_limit") : undefined}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      />
    </label>
  );
  return (
    <form
      className={`${card} mt-4 p-4`}
      data-testid="payout-settings"
      onSubmit={(e) => {
        e.preventDefault();
        const result = updatePayoutSettings(form);
        if (result.error) toast(errorText(lang, result.error), "error");
        else toast(`${dt(lang, "payout_saved")} ✓`);
      }}
    >
      <h3 className="font-bold text-slate-900">{dt(lang, "payout_rules_title")}</h3>
      <p className="mb-3 text-xs text-slate-500">{dt(lang, "payout_rules_hint")}</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {field("minPayoutFone", "payout_min_label")}
        {field("holdDays", "payout_hold_label")}
        {field("monthlyBudgetFone", "payout_budget_label", true)}
        {field("maxFonePerUserMonth", "payout_cap_label", true)}
      </div>
      <button type="submit" className={`${btnPrimary} mt-3`}>{dt(lang, "payout_save")}</button>
    </form>
  );
}

function RewardsTab() {
  const lang = useLang();
  const state = useStore((s) => s);
  const settings = payoutSettingsOf(state);
  const pendingUsers = [...new Set(state.rewards.filter((r) => r.status === "pending").map((r) => r.userId))];
  const groups = pendingUsers
    .map((userId) => {
      const owner = state.users.find((u) => u.id === userId);
      const split = userPayout(state, userId);
      return { userId, owner, split, ready: isReadyToPay({ wallet: owner?.walletAddress ?? null, rewardIds: split.payable.map((r) => r.id), belowMinimum: split.belowMinimum }) };
    })
    .sort((a, b) => Number(b.ready) - Number(a.ready));
  const paid = state.rewards.filter((r) => r.status === "paid").sort((a, b) => (b.paidAt ?? "").localeCompare(a.paidAt ?? ""));
  const paidBatches = Object.values(
    paid.reduce<Record<string, { tx: string; userId: string; cents: number; at: string }>>((acc, r) => {
      const key = r.txHash ?? r.id;
      acc[key] = { tx: key, userId: r.userId, cents: (acc[key]?.cents ?? 0) + Math.round(Number(r.foneAmount) * 100), at: r.paidAt ?? r.createdAt };
      return acc;
    }, {}),
  );
  const held = HOLD_REASONS.map((reason) => {
    const list = state.rewards.filter((r) => r.status === "pending" && r.holdReason === reason);
    return { reason, count: list.length, cents: list.reduce((sum, r) => sum + Math.round(Number(r.foneAmount) * 100), 0) };
  }).filter((h) => h.count > 0);
  const used = treasuryMonthCents(state);
  const budget = settings.monthlyBudgetFone;
  const pct = budget ? Math.min(100, Math.round((used / (budget * 100)) * 100)) : null;
  const heldLabel = { budget: "held_budget", user_cap: "held_user_cap", sponsor_budget: "held_sponsor_budget" } as const;

  return (
    <>
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">⚠️ {dt(lang, "wallet_demo_note")}</p>
      <div className={`${card} mb-3 p-4 ${pct !== null && pct >= 100 ? "border-red-200 bg-red-50" : pct !== null && pct >= 80 ? "border-amber-200 bg-amber-50" : ""}`} data-testid="payout-budget">
        <p className="text-xl font-extrabold text-slate-900">
          {centsToFone(used)}
          {budget !== null && <span className="text-sm font-semibold text-slate-500"> / {budget.toFixed(2)}</span>}
        </p>
        <p className="text-xs text-slate-500">{dt(lang, "payout_month_used")}</p>
        {pct !== null && pct >= 80 && <p className="mt-1 text-xs font-semibold text-amber-800">{dt(lang, pct >= 100 ? "payout_budget_over" : "payout_budget_warn")}</p>}
      </div>
      {held.length > 0 && (
        <div className={`${card} mb-3 border-amber-200 p-4`}>
          <h3 className="mb-1 font-bold text-slate-900">✋ {dt(lang, "held_title")}</h3>
          {held.map((h) => (
            <div key={h.reason} className="flex items-center justify-between gap-2 border-t border-black/5 py-2 text-sm" data-testid={`held-${h.reason}`}>
              <span>
                {dt(lang, heldLabel[h.reason])}: <b>{centsToFone(h.cents)} FONE</b> ({h.count})
              </span>
              <button type="button" className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-bold text-slate-700" onClick={() => releaseHeldRewards(h.reason)}>
                {dt(lang, "release")}
              </button>
            </div>
          ))}
        </div>
      )}
      {groups.length === 0 ? (
        <p className="text-sm text-slate-500">{dt(lang, "no_rewards")}</p>
      ) : (
        <div className="grid gap-2.5">
          {groups.map(({ userId, owner, split, ready }) => (
            <div key={userId} className={`${card} p-4`} data-testid="payout-group">
              <div className="flex flex-wrap items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50"><FoneMark size={24} /></div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-slate-900">{owner?.name ?? "—"}</p>
                  <p className="text-xs text-slate-500" data-testid="payout-payable">
                    <FoneAmount amount={centsToFone(split.payableCents)} size={12} className="align-middle" />
                  </p>
                </div>
                {split.payableCents > 0 && (
                <button
                  type="button"
                  className={`${btnPrimary} !py-1.5 text-xs`}
                  disabled={!ready}
                  data-testid="pay-now"
                  onClick={() => {
                    const result = simulateUserPayout(userId);
                    if (result.error) toast(errorText(lang, result.error), "error");
                    else toast(`${dt(lang, "reward_paid")} ✓`);
                  }}
                >
                  {dt(lang, "pay_now", { fone: centsToFone(split.payableCents) })}
                </button>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] font-semibold">
                {split.waiting.length > 0 && (
                  <span className="rounded-full bg-sky-50 px-2 py-0.5 text-sky-800" data-testid="payout-waiting">
                    {dt(lang, "payout_waiting_chip", { fone: centsToFone(split.waitingCents), date: split.nextReleaseAt ? formatDate(split.nextReleaseAt.toISOString(), lang) : "—" })}
                  </span>
                )}
                {split.held.length > 0 && (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-800">{dt(lang, "payout_held_chip", { fone: centsToFone(split.heldCents) })}</span>
                )}
                {split.belowMinimum && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600" data-testid="payout-below-min">
                    {dt(lang, "payout_min_chip", { min: settings.minPayoutFone.toFixed(2) })}
                  </span>
                )}
                {split.feePercent !== null && !split.belowMinimum && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-slate-600">{dt(lang, "payout_fee_chip", { pct: split.feePercent })}</span>
                )}
                {!owner?.walletAddress && <span className="text-red-600">{dt(lang, "no_wallet_warning")}</span>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button type="button" className={`${btnSecondary} text-xs`} onClick={() => skipHoldPeriod()} data-testid="skip-hold">
          {dt(lang, "skip_hold")}
        </button>
        <span className="text-xs text-slate-500">{dt(lang, "skip_hold_hint")}</span>
      </div>
      <PayoutSettingsForm />
      {paidBatches.length > 0 && (
        <div className={`${card} mt-4 p-4`}>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="font-bold text-slate-900">{dt(lang, "paid_recently")}</h3>
            <Link to="/transparencia" className="text-xs font-semibold text-emerald-700 hover:underline">{dt(lang, "transparency_link")} →</Link>
          </div>
          <ul className="text-sm">
            {paidBatches.slice(0, 10).map((b) => (
              <li key={b.tx} className="flex flex-wrap justify-between gap-2 border-t border-black/5 py-1.5">
                <span className="font-semibold text-slate-800">{state.users.find((u) => u.id === b.userId)?.name ?? "—"}</span>
                <FoneAmount amount={centsToFone(b.cents)} size={12} />
                <span className="truncate font-mono text-xs text-slate-500">{b.tx.slice(0, 14)}… · {formatDate(b.at, lang)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
