"use client";

import { tx, type Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import { COUNT_ITEM_INFO, countItemName, countRule, estimatedKg, type CountMission } from "@/lib/proof";

/**
 * Count missions: "how many items are in your photo?". Nobody weighs anything: the weight is
 * estimated from the count. Shared by the web app (posts "itemCount") and the APK.
 */
export function CountField({ lang, mission, value, onChange }: { lang: Lang; mission: CountMission; value: string; onChange: (value: string) => void }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const { item, target } = countRule(mission);
  const info = COUNT_ITEM_INFO[item];
  const count = Number(value);
  const kg = count > 0 ? estimatedKg(item, count) : null;
  const below = value !== "" && count < target;
  return (
    <fieldset className="space-y-2 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4" data-testid="count-field">
      <legend className="sr-only">{T("Contagem", "Count", "Conteo")}</legend>
      <label htmlFor="itemCount" className="flex items-center gap-2 text-sm font-semibold text-slate-700">
        <span className="text-lg" aria-hidden="true">
          {info.emoji}
        </span>
        {T("Quantos itens aparecem na foto?", "How many items are in the photo?", "¿Cuántos artículos salen en la foto?")}
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <input
          id="itemCount"
          name="itemCount"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={String(target)}
          value={value}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 3))}
          className="w-24 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
          aria-describedby="count-hint"
          data-testid="count-input"
        />
        <span className="text-sm font-medium text-slate-600">{countItemName(item, lang)}</span>
      </div>
      <p id="count-hint" className={`text-xs ${below ? "font-semibold text-amber-700" : "text-slate-500"}`}>
        {T("Mínimo da missão", "Mission minimum", "Mínimo de la misión")}: {target}
        {kg !== null && !below ? ` · ≈ ${formatKg(kg, lang)} ${T("(estimado)", "(estimated)", "(estimado)")}` : ""}
      </p>
      <p className="text-xs text-slate-500">
        💡{" "}
        {T(
          "Espalhe os itens no chão ou numa mesa para todos aparecerem. Não precisa pesar: a IA conta pela foto.",
          "Spread the items on the floor or a table so they all show. No need to weigh: the AI counts from the photo.",
          "Extiende los artículos en el suelo o una mesa para que se vean todos. No hace falta pesar: la IA cuenta por la foto.",
        )}
      </p>
    </fieldset>
  );
}
