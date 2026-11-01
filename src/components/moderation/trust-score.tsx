import { tx, type Lang } from "@/lib/i18n";
import { trustBand, trustFactorLabel, type TrustFactorKey } from "@/lib/verification";

/**
 * Confidence score of a proof (src/lib/verification.ts) with the signals behind it.
 * Shared by moderation and audit (web + APK). No hooks.
 */
export function TrustScore({ lang, score, factors }: { lang: Lang; score: number | null | undefined; factors?: { key: string; points: number }[] | null }) {
  if (score == null) return null;
  const band = trustBand(score);
  const tone =
    band === "high" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : band === "medium" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900";
  const bar = band === "high" ? "bg-emerald-500" : band === "medium" ? "bg-amber-500" : "bg-red-500";
  return (
    <details className={`mt-3 rounded-xl border px-3 py-2 text-xs ${tone}`} data-testid="trust-score">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-semibold">
        <span>🛡️ {tx(lang, "Nota de confiança", "Confidence score", "Nota de confianza")}</span>
        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/70">
          <span className={`block h-full rounded-full ${bar}`} style={{ width: `${score}%` }} />
        </span>
        <span className="tabular-nums">{score}/100</span>
      </summary>
      {factors && factors.length > 0 && (
        <ul className="mt-2 grid gap-0.5">
          {factors.map((f, i) => (
            <li key={`${f.key}-${i}`} className="flex justify-between gap-3">
              <span>{trustFactorLabel(f.key as TrustFactorKey, lang)}</span>
              <span className="font-semibold tabular-nums">{f.points > 0 ? `+${f.points}` : f.points}</span>
            </li>
          ))}
        </ul>
      )}
    </details>
  );
}
