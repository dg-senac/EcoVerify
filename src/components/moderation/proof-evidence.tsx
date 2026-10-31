import { tx, type Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import { COUNT_ITEM_INFO, countCheck, countItemName, isCountItem, weightSourceLabel, type WeightSource } from "@/lib/proof";

/**
 * What a proof brings besides the main photo: the item count (declared vs counted by the AI, with
 * the estimated weight) and the "before" photo of before/after missions.
 * Shared by moderation (web + APK), organization moderation and the person's own proofs.
 */
export function ProofEvidence({
  lang,
  countItem,
  itemCount,
  aiItemCount,
  weightKg,
  weightSource,
  beforeUrl,
  afterUrl,
}: {
  lang: Lang;
  countItem?: string | null;
  itemCount?: number | null;
  aiItemCount?: number | null;
  weightKg?: number | string | null;
  weightSource?: WeightSource | null;
  /** Before/after missions: both photos, shown side by side. */
  beforeUrl?: string | null;
  afterUrl?: string | null;
}) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const item = isCountItem(countItem) ? countItem : null;
  const check = countCheck(itemCount, aiItemCount);
  const kg = weightKg == null || weightKg === "" ? null : Number(weightKg);
  return (
    <>
      {beforeUrl && (
        <div className="mt-3 grid grid-cols-2 gap-2" data-testid="before-after">
          {[
            { url: beforeUrl, label: T("Antes", "Before", "Antes") },
            { url: afterUrl, label: T("Depois", "After", "Después") },
          ].map((photo) =>
            photo.url ? (
              <figure key={photo.label} className="relative overflow-hidden rounded-xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.label} className="aspect-[4/3] w-full object-cover" />
                <figcaption className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold text-white">{photo.label}</figcaption>
              </figure>
            ) : null,
          )}
        </div>
      )}
      {item && itemCount != null && (
        <div
          className={`mt-3 rounded-xl px-3 py-2 text-sm ${check === "low" ? "bg-amber-50 text-amber-900" : "bg-emerald-50 text-emerald-900"}`}
          data-testid="count-evidence"
        >
          <p className="font-semibold">
            <span aria-hidden="true">{COUNT_ITEM_INFO[item].emoji}</span> {itemCount} · {countItemName(item, lang)}
          </p>
          <p className="mt-0.5 text-xs">
            {aiItemCount != null
              ? `${T("A IA contou", "The AI counted", "La IA contó")} ${aiItemCount}${check === "low" ? ` · ${T("bem menos que o informado", "far fewer than declared", "muchos menos que lo informado")}` : " ✓"}`
              : T("A IA não contou os itens", "The AI did not count the items", "La IA no contó los artículos")}
            {kg !== null && kg > 0 ? ` · ≈ ${formatKg(kg, lang)} (${weightSourceLabel(weightSource ?? "estimated", lang)})` : ""}
          </p>
        </div>
      )}
    </>
  );
}
