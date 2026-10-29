import type { Lang } from "@/lib/i18n";

const LANGS: { id: Lang; label: string }[] = [
  { id: "pt", label: "PT" },
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];

/** PT / EN / ES pills. Links (web app: ?lang=) or buttons (demo: onSelect). */
export function LangPills({ lang, hrefFor, onSelect }: { lang: Lang; hrefFor?: (l: Lang) => string; onSelect?: (l: Lang) => void }) {
  return (
    <div className="flex gap-0.5 rounded-xl bg-slate-100 p-0.5" data-testid="lang-pills">
      {LANGS.map((l) => {
        const cls = `rounded-lg px-2 py-1 text-xs font-bold ${lang === l.id ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-800"}`;
        return onSelect ? (
          <button key={l.id} type="button" onClick={() => onSelect(l.id)} className={cls} aria-pressed={lang === l.id}>
            {l.label}
          </button>
        ) : (
          <a key={l.id} href={hrefFor?.(l.id) ?? `?lang=${l.id}`} className={cls} aria-current={lang === l.id ? "true" : undefined}>
            {l.label}
          </a>
        );
      })}
    </div>
  );
}
