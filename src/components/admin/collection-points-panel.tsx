"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Pause, Play, Plus, RefreshCw, Scale } from "lucide-react";
import { tx, type Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";

export interface AdminPoint {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  token: string;
  isActive: boolean;
  /** Deliveries weighed by this point. */
  confirmed: number;
  totalKg: number;
  /** Deliveries still waiting for the point. */
  waiting: number;
}

type Result = { error?: string; success?: boolean };
export interface CollectionPointActions {
  create: (input: { name: string; address: string; city: string }) => Promise<Result>;
  toggle: (pointId: string) => Promise<Result>;
  regenerate: (pointId: string) => Promise<Result>;
}

const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100";

/**
 * Admin → ♻️ Recycling: collection points (cooperativas, ecopontos) that weigh deliveries with a
 * secret link, no account. Shared by the web app and the APK.
 */
export function CollectionPointsPanel({ lang, points, pointBase, actions }: { lang: Lang; points: AdminPoint[]; pointBase: string; actions: CollectionPointActions }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [form, setForm] = useState({ name: "", address: "", city: "" });
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const create = () =>
    start(async () => {
      const result = await actions.create(form);
      setError(!!result.error);
      if (!result.error) setForm({ name: "", address: "", city: "" });
    });
  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="collection-points">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">
        <Scale className="h-5 w-5 text-teal-600" /> {T("Pontos de coleta que pesam", "Collection points that weigh", "Puntos de recolección que pesan")}
      </h2>
      <p className="mt-1 max-w-2xl text-xs text-slate-500">
        {T(
          "Cooperativas e ecopontos parceiros. Cada ponto recebe um link secreto: a equipe lê o QR da pessoa, pesa na balança e confirma. Missões do tipo “Ponto de coleta” usam esse peso (mais confiável que a estimativa).",
          "Partner cooperatives and drop-off points. Each point gets a secret link: the team scans the person's QR, weighs it on the scale and confirms. “Collection point” missions use that weight (more reliable than the estimate).",
          "Cooperativas y ecopuntos socios. Cada punto recibe un enlace secreto: el equipo lee el QR de la persona, lo pesa en la balanza y confirma. Las misiones del tipo “Punto de recolección” usan ese peso (más fiable que la estimación).",
        )}
      </p>
      <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_10rem_auto]">
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={T("Nome (ex.: Cooperativa Recicla)", "Name (e.g. Recycling Co-op)", "Nombre (ej.: Cooperativa Recicla)")} className={field} data-testid="point-name" />
        <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder={T("Endereço", "Address", "Dirección")} className={field} />
        <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder={T("Cidade", "City", "Ciudad")} className={field} />
        <button
          type="button"
          disabled={pending || form.name.trim().length < 3}
          onClick={create}
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-50"
          data-testid="point-create"
        >
          <Plus className="h-4 w-4" /> {T("Cadastrar", "Add", "Registrar")}
        </button>
      </div>
      {error && <p className="mt-2 text-xs text-red-600">{T("Não foi possível cadastrar. Confira o nome.", "Could not add it. Check the name.", "No se pudo registrar. Revisa el nombre.")}</p>}
      {points.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-400">{T("Nenhum ponto cadastrado.", "No points yet.", "Ningún punto registrado.")}</p>
      ) : (
        <ul className="mt-4 divide-y divide-slate-100">
          {points.map((p) => (
            <PointRow key={p.id} lang={lang} point={p} pointBase={pointBase} actions={actions} />
          ))}
        </ul>
      )}
    </section>
  );
}

function PointRow({ lang, point, pointBase, actions }: { lang: Lang; point: AdminPoint; pointBase: string; actions: CollectionPointActions }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const link = `${pointBase}${point.token}`;
  const button = "inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50";
  return (
    <li className="grid gap-2 py-3" data-testid="admin-point">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">⚖️</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{point.name}</p>
          <p className="text-xs text-slate-500">{[point.address, point.city].filter(Boolean).join(" · ") || "—"}</p>
        </div>
        <div className="text-right text-sm" data-testid="admin-point-stats">
          <p className="font-extrabold text-slate-900">{formatKg(point.totalKg, lang)}</p>
          <p className="text-xs text-slate-500">
            {T(`${point.confirmed} pesada(s) · ${point.waiting} aguardando`, `${point.confirmed} weighed · ${point.waiting} waiting`, `${point.confirmed} pesada(s) · ${point.waiting} esperando`)}
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${point.isActive ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
          {point.isActive ? T("Ativo", "Active", "Activo") : T("Pausado", "Paused", "Pausado")}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-10 text-xs">
        <code className="max-w-full truncate rounded-lg bg-slate-50 px-2 py-1 text-slate-500" data-testid="point-link">
          {link}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-teal-700 ring-1 ring-teal-200 hover:bg-teal-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? T("Copiado", "Copied", "Copiado") : T("Copiar link", "Copy link", "Copiar enlace")}
        </button>
        <a href={link} target="_blank" rel="noreferrer" className={button} data-testid="point-open">
          <ExternalLink className="h-3.5 w-3.5" /> {T("Abrir", "Open", "Abrir")}
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(T("Gerar um link novo? O link antigo para de funcionar (use se ele vazou).", "Generate a new link? The old one stops working (use it if the link leaked).", "¿Generar un enlace nuevo? El anterior deja de funcionar (úsalo si se filtró).")))
              start(async () => void (await actions.regenerate(point.id)));
          }}
          className={button}
        >
          <RefreshCw className="h-3.5 w-3.5" /> {T("Novo link", "New link", "Nuevo enlace")}
        </button>
        <button type="button" disabled={pending} onClick={() => start(async () => void (await actions.toggle(point.id)))} className={button} data-testid="point-toggle">
          {point.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {point.isActive ? T("Pausar", "Pause", "Pausar") : T("Reativar", "Resume", "Reactivar")}
        </button>
      </div>
    </li>
  );
}
