"use client";

import { useState } from "react";
import { categoryLabels, tx, type Lang } from "@/lib/i18n";
import {
  cityLabel,
  dataCsv,
  DATA_VIEWS,
  formatKg,
  MATERIAL_EMOJI,
  MATERIAL_LABELS,
  MIN_PEOPLE_PER_ROW,
  recyclingCsv,
  type DataTable,
  type DataView,
  type ImpactRow,
  type KgBucket,
  type RecyclingSummary,
} from "@/lib/impact";
import { co2Estimate, formatCo2 } from "@/lib/impact-factors";
import { Co2Banner } from "@/components/impact/co2-estimate";
import { heatPinsFromTable } from "@/lib/map";
import { EcoMap } from "@/components/map/eco-map";

/**
 * Admin → ♻️ Reciclagem and Admin → 📊 Dados (docs/MONETIZACAO.md, sections 6 and 7).
 * Shared by the web app and the offline demo:
 *   - web app: `exportBase="/api/admin/export"` (the server builds the CSV);
 *   - demo: `rows` (the CSV is built in the browser).
 */

function downloadText(text: string, filename: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function CsvButton({ href, build, filename, testId }: { href?: string; build?: () => string; filename: string; testId: string }) {
  const className =
    "inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-500";
  if (href) {
    return (
      <a href={href} download={filename} className={className} data-testid={testId}>
        ⬇️ Baixar CSV
      </a>
    );
  }
  return (
    <button type="button" onClick={() => build && downloadText(build(), filename)} className={className} data-testid={testId}>
      ⬇️ Baixar CSV
    </button>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-slate-900">{value}</p>
      {hint && <p className="text-xs text-slate-400">{hint}</p>}
    </div>
  );
}

function Bars({ lang, buckets, label }: { lang: Lang; buckets: (KgBucket & { emoji?: string })[]; label: (key: string) => string }) {
  const max = Math.max(1, ...buckets.map((b) => b.kg));
  return (
    <ul className="space-y-2">
      {buckets.map((b) => (
        <li key={b.key} className="text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium text-slate-700">
              {b.emoji && <span aria-hidden="true">{b.emoji} </span>}
              {label(b.key)}
            </span>
            <span className="shrink-0 tabular-nums text-slate-500">
              <strong className="text-slate-800">{formatKg(b.kg, lang)}</strong> · {b.deliveries} {b.deliveries === 1 ? tx(lang, "entrega", "delivery", "entrega") : tx(lang, "entregas", "deliveries", "entregas")}
            </span>
          </div>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" style={{ width: `${Math.max(3, (b.kg / max) * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

const locale = (lang: Lang) => (lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US");
const monthLabel = (key: string, lang: Lang) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString(locale(lang), { month: "long", year: "numeric", timeZone: "UTC" });
};
const placeLabel = (label: string, lang: Lang) => (label === cityLabel({ city: null, stateCode: null }) ? tx(lang, label, "No city (missions at home)", "Sin ciudad (misiones en casa)") : label);
const VIEW_LABELS: Record<DataView, Record<Lang, string>> = {
  city: { pt: "Por cidade", en: "By city", es: "Por ciudad" },
  month: { pt: "Por mês", en: "By month", es: "Por mes" },
  category: { pt: "Por categoria", en: "By category", es: "Por categoría" },
  grid: { pt: "Por área (~1 km)", en: "By area (~1 km)", es: "Por área (~1 km)" },
};

/** CO₂e avoided, total and by material — always labelled as an estimate (src/lib/impact-factors.ts). */
function ClimateEstimate({ lang, summary }: { lang: Lang; summary: RecyclingSummary }) {
  const estimate = co2Estimate(summary.byMaterial.map((b) => ({ material: b.material, kg: b.kg })));
  if (estimate.co2Kg <= 0) return null;
  return (
    <section className="grid gap-3" data-testid="climate-estimate">
      <Co2Banner lang={lang} scope="group" estimate={estimate} />
      <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {estimate.byMaterial.map((b) => (
          <li key={b.material} className="flex min-w-0 items-center justify-between gap-2 rounded-xl border border-black/5 bg-white px-3 py-2 text-sm shadow-sm">
            <span className="min-w-0 truncate font-semibold text-slate-700">
              {MATERIAL_EMOJI[b.material]} {MATERIAL_LABELS[b.material][lang]} · <span className="font-normal text-slate-500">{formatKg(b.kg, lang)}</span>
            </span>
            <span className="shrink-0 font-bold text-emerald-700">{formatCo2(b.co2Kg, lang)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function RecyclingTab({
  lang = "pt",
  summary,
  exportBase,
  rows,
}: {
  lang?: Lang;
  summary: RecyclingSummary;
  exportBase?: string;
  rows?: ImpactRow[];
}) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const day = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6" data-testid="recycling-tab">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label={T("Material recolhido", "Material collected", "Material recogido")} value={formatKg(summary.totalKg, lang)} hint={T("estimado pela contagem ou pesado no ponto", "estimated from the count or weighed at the point", "estimado por el conteo o pesado en el punto")} />
        <Stat label={T("Entregas aprovadas", "Approved deliveries", "Entregas aprobadas")} value={String(summary.deliveries)} />
        <Stat label={T("Pessoas que entregaram", "People who delivered", "Personas que entregaron")} value={String(summary.people)} />
        <Stat
          label={T("Média por entrega", "Average per delivery", "Promedio por entrega")}
          value={summary.deliveries ? formatKg(summary.totalKg / summary.deliveries, lang) : "—"}
        />
      </div>

      {summary.deliveries > 0 && <ClimateEstimate lang={lang} summary={summary} />}

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">🧾 {T("Coletas comprovadas", "Verified collections", "Recolecciones comprobadas")}</h2>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              {T("Uma linha por entrega aprovada: data, cidade, ponto, material, kg, CO₂e estimado e código da comprovação. Sem nomes. Serve de relatório para a cooperativa parceira e para a empresa que patrocina a campanha. O peso vem da balança do ponto de coleta parceiro ou é estimado pela contagem de itens; não é uma pesagem certificada.", "One row per approved delivery: date, city, point, material, kg, estimated CO₂e and proof code. No names. Works as a report for the partner cooperative and the company sponsoring the campaign. The weight comes from the partner collection point's scale or is estimated from the item count; it is not a certified weighing.", "Una fila por entrega aprobada: fecha, ciudad, punto, material, kg, CO₂e estimado y código del comprobante. Sin nombres. Sirve de informe para la cooperativa aliada y la empresa que patrocina la campaña. El peso viene de la balanza del punto de recolección socio o se estima por el conteo de artículos; no es un pesaje certificado.")}
            </p>
          </div>
          <CsvButton
            href={exportBase ? `${exportBase}/recycling` : undefined}
            build={rows ? () => recyclingCsv(rows) : undefined}
            filename={`ecoverify-coletas-${day}.csv`}
            testId="recycling-csv"
          />
        </div>
      </section>

      {summary.deliveries === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          {T("Nenhuma entrega de reciclagem aprovada ainda. Missões da categoria ♻️ Reciclagem pedem o material e o peso na comprovação.", "No approved recycling deliveries yet. ♻️ Recycling missions ask for the material and weight in the proof.", "Todavía no hay entregas de reciclaje aprobadas. Las misiones de ♻️ Reciclaje piden el material y el peso en el comprobante.")}
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">{T("Por material", "By material", "Por material")}</h2>
            <Bars
              lang={lang}
              buckets={summary.byMaterial.map((b) => ({ ...b, emoji: MATERIAL_EMOJI[b.material] }))}
              label={(key) => MATERIAL_LABELS[key as keyof typeof MATERIAL_LABELS]?.[lang] ?? key}
            />
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">{T("Por mês", "By month", "Por mes")}</h2>
            <Bars lang={lang} buckets={summary.byMonth.slice(0, 12)} label={(key) => monthLabel(key, lang)} />
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-bold text-slate-900">{T("Por cidade", "By city", "Por ciudad")}</h2>
            <Bars lang={lang} buckets={summary.byCity.slice(0, 15)} label={(key) => placeLabel(key, lang)} />
          </section>
        </div>
      )}
    </div>
  );
}

export function DataTab({
  lang = "pt",
  tables,
  exportBase,
}: {
  lang?: Lang;
  tables: Record<DataView, DataTable>;
  exportBase?: string;
}) {
  const [view, setView] = useState<DataView>("city");
  const table = tables[view];
  const day = new Date().toISOString().slice(0, 10);
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const firstHeader = view === "city" ? T("Cidade", "City", "Ciudad") : view === "month" ? T("Mês", "Month", "Mes") : view === "category" ? T("Categoria", "Category", "Categoría") : T("Centro da área (lat, lng)", "Area centre (lat, lng)", "Centro del área (lat, lng)");
  const rowLabel = (row: { key: string; label: string }) =>
    view === "month" ? monthLabel(row.key, lang) : view === "category" ? (categoryLabels[row.key]?.[lang] ?? row.label) : view === "city" ? placeLabel(row.label, lang) : row.label;

  return (
    <div className="grid gap-6" data-testid="data-tab">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">🔒 {T("Só números agregados e anônimos", "Only aggregated, anonymous numbers", "Solo números agregados y anónimos")}</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
          <li>{T("Nunca nome, e-mail, foto, relato ou a localização de uma pessoa.", "Never a person's name, email, photo, report or location.", "Nunca nombre, e-mail, foto, relato o la ubicación de una persona.")}</li>
          <li>
            {T("Linhas com menos de ", "Rows with fewer than ", "Las filas con menos de ")}
            <strong>
              {MIN_PEOPLE_PER_ROW} {T("pessoas diferentes", "different people", "personas distintas")}
            </strong>{" "}
            {T("são ocultadas, para ninguém ser identificado por exclusão.", "are hidden, so nobody can be identified by elimination.", "se ocultan, para que nadie sea identificado por descarte.")}
          </li>
          <li>{T("O mapa usa o ponto da missão arredondado para uma área de ~1 km. Missões feitas em casa ficam de fora do mapa.", "The map uses the mission point rounded to a ~1 km area. Missions done at home are left off the map.", "El mapa usa el punto de la misión redondeado a un área de ~1 km. Las misiones hechas en casa quedan fuera del mapa.")}</li>
        </ul>
        <p className="mt-2 text-xs">
          {T("Use para relatórios a prefeituras, universidades e consultorias. Antes de compartilhar, confira se a Política de Privacidade menciona estatísticas anônimas.", "Use it for reports to city halls, universities and consultancies. Before sharing, check that the Privacy Policy mentions anonymous statistics.", "Úsalo para informes a municipios, universidades y consultoras. Antes de compartir, revisa que la Política de Privacidad mencione estadísticas anónimas.")}
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label={T("Agrupar por", "Group by", "Agrupar por")}>
          {DATA_VIEWS.map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={view === key}
              onClick={() => setView(key)}
              className={`rounded-xl px-3 py-1.5 text-sm font-semibold transition ${
                view === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
              }`}
              data-testid={`data-view-${key}`}
            >
              {VIEW_LABELS[key][lang]}
            </button>
          ))}
        </div>
        <CsvButton
          href={exportBase ? `${exportBase}/data-${view}` : undefined}
          build={exportBase ? undefined : () => dataCsv(table)}
          filename={`ecoverify-dados-${view}-${day}.csv`}
          testId="data-csv"
        />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Stat label={T("Ações verificadas", "Verified actions", "Acciones verificadas")} value={table.totals.people ? String(table.totals.actions) : "—"} />
        <Stat label={T("Pessoas", "People", "Personas")} value={table.totals.people ? String(table.totals.people) : `< ${MIN_PEOPLE_PER_ROW}`} />
        <Stat label={T("Reciclado", "Recycled", "Reciclado")} value={table.totals.people ? formatKg(table.totals.kg, lang) : "—"} />
      </div>

      {view === "grid" && table.rows.length > 0 && (
        <section className="grid gap-2" data-testid="data-heat-map">
          <EcoMap pins={heatPinsFromTable(table, lang)} label={T("Mapa de calor das ações verificadas", "Heat map of verified actions", "Mapa de calor de las acciones verificadas")} className="h-[420px]" />
          <p className="text-xs text-slate-500">
            🔥 {T(`Cada quadrado é uma área de ~1 km com ${MIN_PEOPLE_PER_ROW} pessoas ou mais; quanto mais vermelho, mais ações verificadas.`, `Each square is a ~1 km area with ${MIN_PEOPLE_PER_ROW} or more people; the redder, the more verified actions.`, `Cada cuadrado es un área de ~1 km con ${MIN_PEOPLE_PER_ROW} personas o más; cuanto más rojo, más acciones verificadas.`)}
          </p>
        </section>
      )}

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        {table.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            {T(`Ainda não há nenhum grupo com ${MIN_PEOPLE_PER_ROW} pessoas ou mais nesta visão. Os dados aparecem conforme mais gente participa.`, `There is no group with ${MIN_PEOPLE_PER_ROW} or more people in this view yet. Data appears as more people take part.`, `Todavía no hay ningún grupo con ${MIN_PEOPLE_PER_ROW} personas o más en esta vista. Los datos aparecen a medida que más gente participa.`)}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{firstHeader}</th>
                  <th className="px-4 py-2.5 text-right">{T("Ações", "Actions", "Acciones")}</th>
                  <th className="px-4 py-2.5 text-right">{T("Pessoas", "People", "Personas")}</th>
                  <th className="px-4 py-2.5 text-right">{T("Reciclado", "Recycled", "Reciclado")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.map((row) => (
                  <tr key={row.key} data-testid="data-row">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{rowLabel(row)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.actions}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.people}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.kg ? formatKg(row.kg, lang) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {table.hiddenRows > 0 && (
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500" data-testid="data-hidden">
            🔒 {table.hiddenRows} {table.hiddenRows === 1 ? T("grupo oculto", "hidden group", "grupo oculto") : T("grupos ocultos", "hidden groups", "grupos ocultos")} ({table.hiddenActions}{" "}
            {table.hiddenActions === 1 ? T("ação", "action", "acción") : T("ações", "actions", "acciones")}) {T("por ter menos de", "with fewer than", "por tener menos de")} {MIN_PEOPLE_PER_ROW} {T("pessoas.", "people.", "personas.")}
          </p>
        )}
      </section>
    </div>
  );
}
