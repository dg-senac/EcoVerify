import { useState, type FormEvent } from "react";
import { BarChart3, Crosshair, Loader2, Plus, Users, Clock, CheckCircle2, Coins, Hourglass, Target } from "lucide-react";
import { categoryEmoji, categoryLabels, t } from "@/lib/i18n";
import { formatDate, formatFone } from "@/lib/utils";
import type { Role } from "@/lib/nav";
import { dt, errorText, type DemoKey } from "../i18n";
import {
  createMission,
  localizedTitle,
  setUserBan,
  setUserRole,
  simulatePayout,
  toggleMission,
  useLang,
  useStore,
  type Category,
  type User,
} from "../store";
import { getCurrentPosition } from "../media";
import { Avatar, Modal, PageHeader, btnPrimary, btnSecondary, card, input, label, toast } from "../components/ui";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

type Tab = "metrics" | "missions" | "users" | "rewards";

export function AdminScreen({ user }: { user: User }) {
  const lang = useLang();
  const [tab, setTab] = useState<Tab>("metrics");
  const tabs: { id: Tab; key: "admin_tab_metrics" | "admin_tab_missions" | "admin_tab_users" | "admin_tab_rewards" }[] = [
    { id: "metrics", key: "admin_tab_metrics" },
    { id: "missions", key: "admin_tab_missions" },
    { id: "users", key: "admin_tab_users" },
    { id: "rewards", key: "admin_tab_rewards" },
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
            {t(lang, tb.key)}
          </button>
        ))}
      </div>
      {tab === "metrics" && <MetricsTab />}
      {tab === "missions" && <MissionsTab />}
      {tab === "users" && <UsersTab me={user} />}
      {tab === "rewards" && <RewardsTab />}
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

const emptyForm = { title: "", description: "", category: "cleanup" as Category, points: "50", fone: "25", latitude: "-8.0631", longitude: "-34.8711" };

function MissionsTab() {
  const lang = useLang();
  const missions = useStore((s) => s.missions);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);

  const set = (key: keyof typeof emptyForm) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = createMission({
      title: form.title,
      description: form.description,
      category: form.category,
      pointsReward: Number(form.points),
      // Accept "25,50" (pt-BR keyboards) as well as "25.50".
      foneReward: form.fone.replace(",", "."),
      latitude: Number(form.latitude.replace(",", ".")),
      longitude: Number(form.longitude.replace(",", ".")),
    });
    if (result.error) return setError(errorText(lang, result.error));
    toast(dt(lang, "mission_created"));
    setForm(emptyForm);
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
      <button type="button" className={`${btnPrimary} mb-4`} onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> {dt(lang, "new_mission")}
      </button>
      <div className="grid gap-2.5">
        {missions.map((m) => (
          <div key={m.id} className={`${card} flex items-center gap-3 p-4 ${m.isActive ? "" : "opacity-60"}`}>
            <span className="text-2xl">{categoryEmoji[m.category] ?? "🌱"}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-slate-900">{localizedTitle(m, lang)}</p>
              <p className="text-xs text-slate-500">{m.pointsReward} {t(lang, "reward_points")} · <FoneAmount amount={m.foneReward} size={12} className="align-middle" /> · {m.latitude.toFixed(4)}, {m.longitude.toFixed(4)}</p>
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

function UsersTab({ me }: { me: User }) {
  const lang = useLang();
  const users = useStore((s) => s.users.filter((u) => !u.deletedAt));
  const roles: { id: Role; key: DemoKey }[] = [
    { id: "citizen", key: "demo_role_citizen" },
    { id: "moderator", key: "demo_role_moderator" },
    { id: "admin", key: "demo_role_admin" },
  ];
  return (
    <div className={`${card} divide-y divide-slate-100`}>
      {users.map((u) => (
        <div key={u.id} className="flex flex-wrap items-center gap-3 p-4">
          <Avatar name={u.name} size={38} />
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1.5 truncate text-sm font-semibold text-slate-900">
              {u.name}
              {u.id === me.id && <span className="text-xs text-emerald-600">({dt(lang, "you")})</span>}
              {u.isBanned && <span className="rounded bg-red-100 px-1.5 text-[10px] font-bold text-red-700">{dt(lang, "banned_label")}</span>}
            </p>
            <p className="truncate text-xs text-slate-500">{u.email} · {u.totalPoints} {t(lang, "reward_points")}</p>
          </div>
          {u.id !== me.id && (
            <div className="flex items-center gap-2">
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
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function RewardsTab() {
  const lang = useLang();
  const rewards = useStore((s) => s.rewards);
  const users = useStore((s) => s.users);
  const sorted = [...rewards].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "pending" ? -1 : 1));
  if (sorted.length === 0) return <p className="text-sm text-slate-500">{dt(lang, "no_rewards")}</p>;
  return (
    <>
      <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">⚠️ {dt(lang, "wallet_demo_note")}</p>
      <div className="grid gap-2.5">
        {sorted.map((r) => {
          const owner = users.find((u) => u.id === r.userId);
          return (
            <div key={r.id} className={`${card} flex flex-wrap items-center gap-3 p-4`}>
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50"><FoneMark size={24} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900"><FoneAmount amount={formatFone(r.foneAmount)} size={14} /> → {owner?.name ?? "—"}</p>
                <p className="truncate text-xs text-slate-500">
                  {r.status === "paid" && r.txHash ? `tx ${r.txHash.slice(0, 18)}… · ${formatDate(r.paidAt ?? r.createdAt, lang)}` : formatDate(r.createdAt, lang)}
                </p>
                {r.status === "pending" && !owner?.walletAddress && <p className="text-xs font-semibold text-red-600">{dt(lang, "no_wallet_warning")}</p>}
              </div>
              {r.status === "paid" ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">{dt(lang, "reward_paid")}</span>
              ) : (
                <button
                  type="button"
                  className={`${btnPrimary} !py-1.5 text-xs`}
                  disabled={!owner?.walletAddress}
                  onClick={() => {
                    const result = simulatePayout(r.id);
                    if (result.error) toast(errorText(lang, result.error), "error");
                    else toast(`${dt(lang, "reward_paid")} ✓`);
                  }}
                >
                  {dt(lang, "simulate_payment")}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
