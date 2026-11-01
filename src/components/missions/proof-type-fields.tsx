"use client";

import { useState } from "react";
import { tx, type Lang } from "@/lib/i18n";
import { COUNT_ITEM_INFO, COUNT_ITEMS, countItemName, PROOF_TYPE_INFO, PROOF_TYPES, proofTypeHint, proofTypeName, type CountItem, type ProofType } from "@/lib/proof";

/**
 * "How is this mission proven?" in the mission forms (admin, organizations; web and APK).
 * Posts "proofType", "countItem" and "countTarget". Controlled from outside when `value` is given.
 */
export function ProofTypeFields({
  lang,
  defaultType = "photo",
  value,
  onChange,
  points,
  className = "",
}: {
  lang: Lang;
  /** Collection points that can weigh deliveries. Without it the "collection point" type is hidden. */
  points?: { id: string; name: string; city?: string | null }[];
  defaultType?: ProofType;
  value?: { proofType: ProofType; countItem: CountItem; countTarget: string };
  onChange?: (value: { proofType: ProofType; countItem: CountItem; countTarget: string }) => void;
  className?: string;
}) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [inner, setInner] = useState({ proofType: defaultType, countItem: "pet_bottle" as CountItem, countTarget: "10" });
  const current = value ?? inner;
  const set = (patch: Partial<typeof current>) => {
    const next = { ...current, ...patch };
    if (onChange) onChange(next);
    else setInner(next);
  };
  const input = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";
  return (
    <fieldset className={`grid gap-2 rounded-2xl border border-sky-100 bg-sky-50/60 p-3 ${className}`} data-testid="proof-type-fields">
      <legend className="px-1 text-sm font-semibold text-slate-700">{T("Como a pessoa prova", "How people prove it", "Cómo se comprueba")}</legend>
      <div className="grid gap-1.5 sm:grid-cols-3">
        {PROOF_TYPES.filter((type) => type !== "partner" || points).map((type) => (
          <label
            key={type}
            className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
              current.proofType === type ? "border-sky-500 bg-white text-sky-900 shadow-sm" : "border-slate-200 bg-white/70 text-slate-600"
            }`}
          >
            <input type="radio" name="proofType" value={type} checked={current.proofType === type} onChange={() => set({ proofType: type })} className="sr-only" />
            <span aria-hidden="true">{PROOF_TYPE_INFO[type].emoji}</span> {proofTypeName(type, lang)}
          </label>
        ))}
      </div>
      <p className="text-[11px] text-slate-500">{proofTypeHint(current.proofType, lang)}</p>
      {current.proofType === "partner" && points && (
        points.length === 0 ? (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900" data-testid="no-points">
            {T("Nenhum ponto de coleta cadastrado ainda. A equipe EcoVerify cadastra os pontos parceiros.", "No collection points yet. The EcoVerify team registers partner points.", "Aún no hay puntos de recolección. El equipo EcoVerify registra los puntos socios.")}
          </p>
        ) : (
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            {T("Ponto de coleta que pesa", "Collection point that weighs", "Punto de recolección que pesa")}
            <select name="collectionPointId" defaultValue={points[0].id} className={input} data-testid="collection-point-select">
              {points.map((p) => (
                <option key={p.id} value={p.id}>
                  ⚖️ {p.name}
                  {p.city ? ` · ${p.city}` : ""}
                </option>
              ))}
            </select>
            <span className="text-[11px] font-normal text-slate-500">
              {T("Use o endereço do ponto como local da missão: a prova é enviada de lá.", "Use the point's address as the mission location: the proof is sent from there.", "Usa la dirección del punto como ubicación de la misión: la prueba se envía desde allí.")}
            </span>
          </label>
        )
      )}
      {current.proofType === "count" && (
        <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            {T("O que contar", "What to count", "Qué contar")}
            <select name="countItem" value={current.countItem} onChange={(e) => set({ countItem: e.target.value as CountItem })} className={input}>
              {COUNT_ITEMS.map((item) => (
                <option key={item} value={item}>
                  {COUNT_ITEM_INFO[item].emoji} {countItemName(item, lang)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium text-slate-600">
            {T("Mínimo", "Minimum", "Mínimo")}
            <input
              name="countTarget"
              inputMode="numeric"
              value={current.countTarget}
              onChange={(e) => set({ countTarget: e.target.value.replace(/\D/g, "").slice(0, 3) })}
              className={`${input} sm:w-24`}
            />
          </label>
        </div>
      )}
    </fieldset>
  );
}
