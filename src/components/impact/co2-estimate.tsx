import { tx, type Lang } from "@/lib/i18n";
import { MATERIALS, MATERIAL_EMOJI, MATERIAL_LABELS } from "@/lib/impact";
import { CAR_KG_CO2E_PER_KM, CO2_FACTORS, IMPACT_SOURCES, formatCo2, formatFactor, formatKm, type Co2Estimate } from "@/lib/impact-factors";

/**
 * CO₂e avoided by verified recycling — always shown as an ESTIMATE, with the factors and sources one tap away.
 * Shared by the web app and the APK (no hooks, no internal links). Methodology: docs/IMPACTO.md.
 */

export function EstimateTag({ lang }: { lang: Lang }) {
  return (
    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-800" data-testid="estimate-tag">
      {tx(lang, "estimativa", "estimate", "estimación")}
    </span>
  );
}

/** "How we calculate": factor per material, source links and caveats. */
export function Co2Methodology({ lang }: { lang: Lang }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return (
    <details className="group mt-2 text-xs text-slate-500" data-testid="co2-methodology">
      <summary className="cursor-pointer select-none font-semibold text-emerald-700 hover:text-emerald-800">
        ⓘ {T("Como calculamos", "How we calculate", "Cómo calculamos")}
      </summary>
      <div className="mt-2 grid gap-2 rounded-xl bg-slate-50 p-3 leading-relaxed">
        <p>
          {T(
            "Multiplicamos os kg de cada entrega aprovada pelo fator do material. Os fatores são médias de modelos de ciclo de vida (não medições das suas entregas) e o peso é estimado pela contagem ou pesado no ponto parceiro. Por isso é uma estimativa — e não é crédito de carbono.",
            "We multiply the kg of each approved delivery by the material's factor. The factors are life-cycle model averages (not measurements of your deliveries) and the weight is estimated from the count or weighed at the partner point. That is why it is an estimate — and it is not a carbon credit.",
            "Multiplicamos los kg de cada entrega aprobada por el factor del material. Los factores son promedios de modelos de ciclo de vida (no mediciones de tus entregas) y el peso se estima por el conteo o se pesa en el punto socio. Por eso es una estimación — y no es crédito de carbono.",
          )}
        </p>
        <table className="w-full text-left">
          <thead>
            <tr className="text-[11px] uppercase text-slate-400">
              <th className="py-1 font-semibold">{T("Material", "Material", "Material")}</th>
              <th className="py-1 text-right font-semibold">{T("kg CO₂e por kg", "kg CO₂e per kg", "kg CO₂e por kg")}</th>
            </tr>
          </thead>
          <tbody>
            {MATERIALS.map((m) => (
              <tr key={m} className="border-t border-slate-200/70 align-top">
                <td className="py-1 pr-2">
                  <span className="font-semibold text-slate-700">
                    {MATERIAL_EMOJI[m]} {MATERIAL_LABELS[m][lang]}
                  </span>
                  <span className="block text-[11px] text-slate-400">{CO2_FACTORS[m].basis[lang]}</span>
                </td>
                <td className="py-1 text-right font-bold tabular-nums text-slate-700">{formatFactor(CO2_FACTORS[m].kgPerKg, lang)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          {T("Comparação com carro", "Car comparison", "Comparación con auto")}: {formatFactor(CAR_KG_CO2E_PER_KM, lang)} kg CO₂e/km{" "}
          {T("(carro médio a gasolina, referência da EPA/EUA).", "(average gasoline car, US EPA reference).", "(auto promedio a gasolina, referencia de la EPA/EE. UU.).")}{" "}
          {T(
            "Água não entra na conta: não achamos fator por material com fonte primária confiável.",
            "Water is not included: we found no per-material factor from a reliable primary source.",
            "El agua no entra en la cuenta: no encontramos un factor por material con fuente primaria confiable.",
          )}
        </p>
        <ul className="grid gap-1">
          {Object.values(IMPACT_SOURCES).map((s) => (
            <li key={s.id}>
              <a href={s.url} target="_blank" rel="noopener noreferrer" className="break-words text-emerald-700 underline underline-offset-2">
                {s.name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}

/** Green banner: total CO₂e avoided, car km and the methodology. Renders nothing when there is no recycling. */
export function Co2Banner({ lang, estimate, scope }: { lang: Lang; estimate: Co2Estimate; scope: "me" | "group" }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  if (estimate.co2Kg <= 0) return null;
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 print:break-inside-avoid" data-testid="co2-banner">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-xl" aria-hidden="true">
          🌎
        </span>
        <strong className="text-xl font-extrabold text-emerald-900" data-testid="co2-total">
          {formatCo2(estimate.co2Kg, lang)}
        </strong>
        <span className="text-sm font-medium text-emerald-900">
          {scope === "me" ? T("que você evitou reciclando", "you avoided by recycling", "que evitaste reciclando") : T("evitados com a reciclagem", "avoided through recycling", "evitados con el reciclaje")}
        </span>
        <EstimateTag lang={lang} />
      </div>
      {estimate.carKm > 0 && (
        <p className="mt-1 text-xs text-emerald-800/80">
          🚗 {T("Equivale a", "Same as", "Equivale a")} ~{formatKm(estimate.carKm, lang)} {T("rodados por um carro médio a gasolina.", "driven by an average gasoline car.", "recorridos por un auto promedio a gasolina.")}
        </p>
      )}
      <Co2Methodology lang={lang} />
    </div>
  );
}
