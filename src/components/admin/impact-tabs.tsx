"use client";

import { useState } from "react";
import {
  dataCsv,
  DATA_VIEW_LABELS,
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

function Bars({ buckets, label }: { buckets: (KgBucket & { emoji?: string })[]; label: (key: string) => string }) {
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
              <strong className="text-slate-800">{formatKg(b.kg)}</strong> · {b.deliveries} {b.deliveries === 1 ? "entrega" : "entregas"}
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

const monthLabel = (key: string) => {
  const [year, month] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, 15)).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
};

export function RecyclingTab({
  summary,
  exportBase,
  rows,
  demoNote,
}: {
  summary: RecyclingSummary;
  exportBase?: string;
  rows?: ImpactRow[];
  demoNote?: string;
}) {
  const day = new Date().toISOString().slice(0, 10);
  return (
    <div className="grid gap-6" data-testid="recycling-tab">
      {demoNote && <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{demoNote}</p>}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Material recolhido" value={formatKg(summary.totalKg)} hint="declarado e verificado por foto" />
        <Stat label="Entregas aprovadas" value={String(summary.deliveries)} />
        <Stat label="Pessoas que entregaram" value={String(summary.people)} />
        <Stat
          label="Média por entrega"
          value={summary.deliveries ? formatKg(summary.totalKg / summary.deliveries) : "—"}
        />
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-900">🧾 Coletas comprovadas</h2>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              Uma linha por entrega aprovada: data, cidade, ponto, material, kg e código da comprovação. <strong>Sem nomes.</strong> Serve de
              relatório para a cooperativa parceira e para a empresa que patrocina a campanha. O peso é uma estimativa (declarado pela pessoa e
              conferido pela foto), não uma pesagem certificada.
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
          Nenhuma entrega de reciclagem aprovada ainda. Missões da categoria ♻️ Reciclagem pedem o material e o peso na comprovação.
        </p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Por material</h2>
            <Bars
              buckets={summary.byMaterial.map((b) => ({ ...b, emoji: MATERIAL_EMOJI[b.material] }))}
              label={(key) => MATERIAL_LABELS[key as keyof typeof MATERIAL_LABELS]?.pt ?? key}
            />
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
            <h2 className="mb-4 font-bold text-slate-900">Por mês</h2>
            <Bars buckets={summary.byMonth.slice(0, 12)} label={monthLabel} />
          </section>
          <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="mb-4 font-bold text-slate-900">Por cidade</h2>
            <Bars buckets={summary.byCity.slice(0, 15)} label={(key) => key} />
          </section>
        </div>
      )}
    </div>
  );
}

export function DataTab({
  tables,
  exportBase,
  demoNote,
}: {
  tables: Record<DataView, DataTable>;
  exportBase?: string;
  demoNote?: string;
}) {
  const [view, setView] = useState<DataView>("city");
  const table = tables[view];
  const day = new Date().toISOString().slice(0, 10);
  const firstHeader = view === "city" ? "Cidade" : view === "month" ? "Mês" : view === "category" ? "Categoria" : "Centro da área (lat, lng)";

  return (
    <div className="grid gap-6" data-testid="data-tab">
      {demoNote && <p className="rounded-xl bg-sky-50 px-4 py-3 text-sm text-sky-900">{demoNote}</p>}
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <p className="font-bold">🔒 Só números agregados e anônimos</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs">
          <li>Nunca nome, e-mail, foto, relato ou a localização de uma pessoa.</li>
          <li>
            Linhas com <strong>menos de {MIN_PEOPLE_PER_ROW} pessoas diferentes</strong> são ocultadas, para ninguém ser identificado por exclusão.
          </li>
          <li>O mapa usa o ponto da missão arredondado para uma área de ~1 km. Missões feitas em casa ficam de fora do mapa.</li>
        </ul>
        <p className="mt-2 text-xs">
          Use para relatórios a prefeituras, universidades e consultorias. Antes de vender, confira se a Política de Privacidade menciona estatísticas
          anônimas (veja <code>docs/MONETIZACAO.md</code>).
        </p>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-slate-100 p-1.5" role="tablist" aria-label="Agrupar por">
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
              {DATA_VIEW_LABELS[key]}
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
        <Stat label="Ações verificadas" value={table.totals.people ? String(table.totals.actions) : "—"} />
        <Stat label="Pessoas" value={table.totals.people ? String(table.totals.people) : `< ${MIN_PEOPLE_PER_ROW}`} />
        <Stat label="Reciclado" value={table.totals.people ? formatKg(table.totals.kg) : "—"} />
      </div>

      <section className="overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm">
        {table.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">
            Ainda não há nenhum grupo com {MIN_PEOPLE_PER_ROW} pessoas ou mais nesta visão. Os dados aparecem conforme mais gente participa.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-4 py-2.5">{firstHeader}</th>
                  <th className="px-4 py-2.5 text-right">Ações</th>
                  <th className="px-4 py-2.5 text-right">Pessoas</th>
                  <th className="px-4 py-2.5 text-right">Reciclado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {table.rows.map((row) => (
                  <tr key={row.key} data-testid="data-row">
                    <td className="px-4 py-2.5 font-medium text-slate-800">{view === "month" ? monthLabel(row.key) : row.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.actions}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.people}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{row.kg ? formatKg(row.kg) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {table.hiddenRows > 0 && (
          <p className="border-t border-slate-100 bg-slate-50 px-4 py-2 text-xs text-slate-500" data-testid="data-hidden">
            🔒 {table.hiddenRows} {table.hiddenRows === 1 ? "grupo oculto" : "grupos ocultos"} ({table.hiddenActions}{" "}
            {table.hiddenActions === 1 ? "ação" : "ações"}) por ter menos de {MIN_PEOPLE_PER_ROW} pessoas.
          </p>
        )}
      </section>
    </div>
  );
}
