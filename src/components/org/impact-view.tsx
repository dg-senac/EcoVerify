import { categoryEmoji, categoryLabels, type Lang } from "@/lib/i18n";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { formatKg } from "@/lib/impact";

export interface ImpactData {
  actions: number;
  people: number;
  points: number;
  /** kg of approved recycling deliveries (0 = no recycling missions). */
  recycledKg?: number;
  byCategory: { category: string; count: number }[];
  byMonth: { month: string; count: number }[];
}

const locale = (lang: Lang) => (lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US");

/** Numbers, actions by type and a monthly chart — shared by the public page and the printable report. */
export function ImpactView({ lang, impact, missionsCount }: { lang: Lang; impact: ImpactData; missionsCount: number }) {
  const text = ORG_TEXT[lang];
  const maxCategory = Math.max(1, ...impact.byCategory.map((c) => c.count));
  const months = impact.byMonth.slice(-12);
  const maxMonth = Math.max(1, ...months.map((m) => m.count));
  const monthLabel = (ym: string) => {
    const [y, m] = ym.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, 15)).toLocaleDateString(locale(lang), { month: "short", timeZone: "UTC" });
  };

  return (
    <div className="grid gap-5">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="impact-stats">
        {[
          { value: impact.actions, label: text.statActions, emoji: "✅" },
          { value: impact.people, label: text.statPeople, emoji: "🙋" },
          { value: impact.points, label: text.statPoints, emoji: "⭐" },
          { value: missionsCount, label: text.statMissions, emoji: "🎯" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm print:shadow-none">
            <p className="text-lg">{s.emoji}</p>
            <p className="text-3xl font-extrabold text-slate-900">{s.value.toLocaleString(locale(lang))}</p>
            <p className="text-xs font-medium text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {!!impact.recycledKg && impact.recycledKg > 0 && (
        <p className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-900 print:break-inside-avoid" data-testid="impact-recycled">
          <span className="text-2xl" aria-hidden="true">♻️</span>
          <span>
            <strong className="text-2xl font-extrabold">{formatKg(impact.recycledKg, lang)}</strong>{" "}
            <span className="text-sm font-medium">{text.statRecycled}</span>
          </span>
        </p>
      )}

      <div className="grid gap-5 md:grid-cols-2">
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none">
          <h2 className="font-bold text-slate-900">{text.reportByCategory}</h2>
          {impact.byCategory.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{text.impactEmpty}</p>
          ) : (
            <ul className="mt-3 grid gap-2.5">
              {impact.byCategory.map((c) => (
                <li key={c.category}>
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-semibold text-slate-700">
                      {categoryEmoji[c.category] ?? "🌱"} {categoryLabels[c.category]?.[lang] ?? c.category}
                    </span>
                    <span className="font-bold text-slate-900">{c.count}</span>
                  </div>
                  <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 print:bg-emerald-500" style={{ width: `${(c.count / maxCategory) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm print:break-inside-avoid print:shadow-none">
          <h2 className="font-bold text-slate-900">{text.reportTimeline}</h2>
          {months.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">{text.impactEmpty}</p>
          ) : (
            <div className="mt-4 flex h-40 items-end gap-2" data-testid="impact-months">
              {months.map((m) => (
                <div key={m.month} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-700">{m.count}</span>
                  <div className="w-full rounded-t-lg bg-gradient-to-t from-emerald-500 to-teal-400 print:bg-emerald-500" style={{ height: `${Math.max(6, (m.count / maxMonth) * 110)}px` }} />
                  <span className="text-[10px] uppercase text-slate-400">{monthLabel(m.month)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
