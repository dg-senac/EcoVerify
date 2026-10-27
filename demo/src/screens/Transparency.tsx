import { ArrowLeft } from "lucide-react";
import { LogoHorizontal } from "@/components/logo";
import { FoneAmount, PoweredByFone } from "@/components/brand/fone";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { centsToFone } from "@/lib/fone";
import { TRANSPARENCY_TEXT } from "@/lib/transparency-text";
import { goBack, Link } from "../router";
import { payoutSettingsOf, sponsorBalance, treasuryMonthCents, useLang, useStore } from "../store";
import { DemoBanner } from "../components/Shell";
import { card } from "../components/ui";

const fmt = (lang: Lang, value: number, digits = 0) =>
  value.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

const short = (value: string, head = 8, tail = 6) => (value.length <= head + tail + 1 ? value : `${value.slice(0, head)}…${value.slice(-tail)}`);

/** Same content as /transparencia in the web app, computed from the demo data (no names). */
export function TransparencyScreen() {
  const lang = useLang();
  const text = TRANSPARENCY_TEXT[lang];
  const state = useStore((s) => s);
  const settings = payoutSettingsOf(state);
  const approved = state.submissions.filter((x) => x.status === "approved");
  const missionOf = (id: string) => state.missions.find((m) => m.id === id);
  const people = new Set(approved.map((x) => x.userId)).size;
  const cities = new Set(approved.map((x) => missionOf(x.missionId)?.city).filter(Boolean)).size;
  const points = approved.reduce((sum, x) => sum + (missionOf(x.missionId)?.pointsReward ?? 0), 0);
  const byCategory = Object.entries(
    approved.reduce<Record<string, number>>((acc, x) => {
      const c = missionOf(x.missionId)?.category ?? "other";
      acc[c] = (acc[c] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);
  const sum = (list: typeof state.rewards) => list.reduce((acc, r) => acc + Math.round(Number(r.foneAmount) * 100), 0);
  const paid = state.rewards.filter((r) => r.status === "paid");
  const queued = state.rewards.filter((r) => r.status === "pending" && !r.holdReason);
  const held = state.rewards.filter((r) => r.status === "pending" && r.holdReason);
  const batches = Object.values(
    paid.reduce<Record<string, { tx: string; wallet: string | null; cents: number; at: string }>>((acc, r) => {
      const key = r.txHash ?? r.id;
      acc[key] = { tx: key, wallet: r.walletAddress ?? null, cents: (acc[key]?.cents ?? 0) + Math.round(Number(r.foneAmount) * 100), at: r.paidAt ?? r.createdAt };
      return acc;
    }, {}),
  ).sort((a, b) => b.at.localeCompare(a.at));
  const used = treasuryMonthCents(state);
  const budget = settings.monthlyBudgetFone;
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      <div className="sticky top-0 z-40">
        <DemoBanner />
      </div>
      <div className="mx-auto max-w-4xl px-4 py-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => goBack("/")} className="inline-flex items-center gap-1 text-sm font-semibold text-slate-600">
            <ArrowLeft className="h-4 w-4" /> {t(lang, "back")}
          </button>
          <LogoHorizontal height={32} />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900" data-testid="transparency-title">🔎 {text.title}</h1>
        <p className="mt-2 text-sm text-slate-600">{text.intro}</p>

        <h2 className="mt-6 mb-3 text-lg font-bold text-slate-900">🌱 {text.impact}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            [approved.length, text.approved],
            [people, text.people],
            [cities, text.cities],
            [points, text.points],
          ].map(([value, label]) => (
            <div key={String(label)} className={`${card} p-4`}>
              <p className="text-2xl font-extrabold text-emerald-700">{fmt(lang, Number(value))}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        {byCategory.length > 0 && (
          <div className={`${card} mt-3 flex flex-wrap gap-2 p-4 text-sm`}>
            {byCategory.map(([c, n]) => (
              <span key={c} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                {categoryEmoji[c]} {categoryLabels[c]?.[lang] ?? c}: <b>{n}</b>
              </span>
            ))}
          </div>
        )}

        <h2 className="mt-6 mb-3 text-lg font-bold text-slate-900">🪙 {text.fone}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className={`${card} p-4`}>
            <p className="text-2xl font-extrabold text-teal-700" data-testid="transparency-paid">{fmt(lang, sum(paid) / 100, 2)}</p>
            <p className="text-xs text-slate-500">{text.paid}</p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-2xl font-extrabold text-teal-700">{fmt(lang, batches.length)}</p>
            <p className="text-xs text-slate-500">{text.payments}</p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-2xl font-extrabold text-slate-800">{fmt(lang, sum(queued) / 100, 2)}</p>
            <p className="text-xs text-slate-500">{text.queued}</p>
          </div>
          <div className={`${card} p-4`}>
            <p className="text-2xl font-extrabold text-slate-800">{fmt(lang, sum(held) / 100, 2)}</p>
            <p className="text-xs text-slate-500">{text.held}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className={`${card} p-4`}>
            <p className="text-sm font-semibold text-slate-700">{text.month}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {centsToFone(used)}
              <span className="text-sm font-medium text-slate-500"> / {budget === null ? text.noBudget : budget.toFixed(2)}</span>
            </p>
            {budget !== null && budget > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((used / (budget * 100)) * 100))}%` }} />
              </div>
            )}
          </div>
          <div className={`${card} p-4`}>
            <p className="text-sm font-semibold text-slate-700">{text.rules}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
              <li>{text.rule_min.replace("{v}", settings.minPayoutFone.toFixed(2))}</li>
              <li>{text.rule_hold.replace("{v}", String(settings.holdDays))}</li>
              {settings.maxFonePerUserMonth !== null && <li>{text.rule_cap.replace("{v}", settings.maxFonePerUserMonth.toFixed(2))}</li>}
              <li>{text.rule_adult}</li>
            </ul>
          </div>
        </div>

        <h2 className="mt-6 mb-1 text-lg font-bold text-slate-900">🤝 {text.sponsors}</h2>
        <p className="mb-3 text-xs text-slate-500">{text.sponsorsHint}</p>
        {(state.sponsors ?? []).length === 0 ? (
          <p className={`${card} p-4 text-sm text-slate-500`}>{text.noSponsors}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2" data-testid="transparency-sponsors">
            {(state.sponsors ?? []).map((sp) => {
              const bal = sponsorBalance(state, sp.id);
              return (
                <div key={sp.id} className={`${card} p-4`}>
                  <p className="font-semibold text-slate-800">{sp.name}</p>
                  <p className="mt-1 text-xs text-slate-500">
                    {text.budget} {centsToFone(bal.budgetCents)} · {text.committed} {centsToFone(bal.spentCents)} · {text.remaining}{" "}
                    <b className="text-slate-800">{centsToFone(bal.remainingCents)}</b> FONE
                  </p>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full bg-teal-500" style={{ width: `${bal.budgetCents ? Math.min(100, Math.round((bal.spentCents / bal.budgetCents) * 100)) : 0}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <h2 className="mt-6 mb-3 text-lg font-bold text-slate-900">🧾 {text.recent}</h2>
        <div className={`${card} overflow-x-auto p-4`}>
          {batches.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{text.noPayments}</p>
          ) : (
            <table className="w-full text-sm" data-testid="transparency-payments">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-1 font-semibold">{text.date}</th>
                  <th className="py-1 font-semibold">{text.amount}</th>
                  <th className="py-1 font-semibold">{text.to}</th>
                  <th className="py-1 font-semibold">{text.tx}</th>
                </tr>
              </thead>
              <tbody>
                {batches.slice(0, 30).map((b) => (
                  <tr key={b.tx} className="border-t border-black/5">
                    <td className="py-1.5 text-slate-600">{new Date(b.at).toLocaleDateString(locale)}</td>
                    <td className="py-1.5 font-semibold text-slate-800"><FoneAmount amount={centsToFone(b.cents)} size={14} /></td>
                    <td className="py-1.5 font-mono text-xs text-slate-500">{b.wallet ? short(b.wallet) : "—"}</td>
                    <td className="py-1.5 font-mono text-xs text-slate-500">{short(b.tx)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-3">
          <nav className="flex gap-4 text-xs font-medium text-slate-500">
            <Link to="/termos" className="hover:underline">{t(lang, "terms_of_use")}</Link>
            <Link to="/privacidade" className="hover:underline">{t(lang, "privacy_policy")}</Link>
          </nav>
          <PoweredByFone lang={lang} />
        </div>
      </div>
    </div>
  );
}
