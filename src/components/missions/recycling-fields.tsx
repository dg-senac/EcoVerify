"use client";

import { t, type Lang } from "@/lib/i18n";
import { MATERIAL_EMOJI, MATERIAL_LABELS, MATERIALS, type Material } from "@/lib/impact";

export interface RecyclingValue {
  material: Material | "";
  weight: string;
}

/**
 * Material + approximate weight of a recycling delivery. Shared by the web app (submit-proof-form)
 * and the offline demo. The inputs carry `name`, so a plain <form> posts them as "material" and "weightKg".
 */
export function RecyclingFields({
  lang,
  value,
  onChange,
}: {
  lang: Lang;
  value: RecyclingValue;
  onChange: (value: RecyclingValue) => void;
}) {
  return (
    <fieldset className="space-y-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4" data-testid="recycling-fields">
      <legend className="sr-only">{t(lang, "recycling_delivery")}</legend>
      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="text-lg" aria-hidden="true">♻️</span>
          {t(lang, "recycling_material_label")}
        </p>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={t(lang, "recycling_material_label")}>
          {MATERIALS.map((material) => {
            const active = value.material === material;
            return (
              <label
                key={material}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition focus-within:ring-2 focus-within:ring-emerald-200 ${
                  active ? "border-emerald-500 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300"
                }`}
              >
                <input
                  type="radio"
                  name="material"
                  value={material}
                  checked={active}
                  onChange={() => onChange({ ...value, material })}
                  className="sr-only"
                  data-testid={`material-${material}`}
                />
                <span aria-hidden="true">{MATERIAL_EMOJI[material]}</span>
                {MATERIAL_LABELS[material][lang]}
              </label>
            );
          })}
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="weightKg" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
          <span className="text-lg" aria-hidden="true">⚖️</span>
          {t(lang, "recycling_weight_label")}
        </label>
        <input
          id="weightKg"
          name="weightKg"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          placeholder="Ex.: 2,5"
          value={value.weight}
          onChange={(e) => onChange({ ...value, weight: e.target.value.replace(/[^\d.,]/g, "").slice(0, 6) })}
          className="w-32 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          aria-describedby="weight-hint"
          data-testid="weight-input"
        />
        <p id="weight-hint" className="text-xs text-slate-500">{t(lang, "recycling_weight_hint")}</p>
      </div>
    </fieldset>
  );
}
