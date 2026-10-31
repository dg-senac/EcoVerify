"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Pause, Play, RefreshCw } from "lucide-react";
import { formatBRL } from "@/lib/plans";
import { OFFER_EMOJI, OFFER_KINDS, isOfferKind, type OfferInput } from "@/lib/benefits";

export interface AdminOffer {
  id: string;
  partnerName: string;
  title: string;
  kind: string;
  city: string | null;
  minPoints: number;
  adultsOnly: boolean;
  featured: boolean;
  isActive: boolean;
  monthlyFeeCents: number;
  maxRedemptions: number | null;
  expiresAt: string | null;
  partnerToken: string;
  generated: number;
  used: number;
  /** Codes used in the last 30 days (the renewal argument). */
  used30: number;
}

type Result = { error?: string; success?: boolean };
export interface BenefitsActions {
  createOffer: (input: OfferInput) => Promise<Result>;
  toggleOffer: (offerId: string) => Promise<Result>;
  regenerateToken: (offerId: string) => Promise<Result>;
}

const KIND_LABEL: Record<string, string> = { food: "Alimentação", bike: "Bicicleta", sport: "Esporte", shop: "Loja", culture: "Cultura", other: "Outro" };
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const EMPTY: OfferInput = { partnerName: "", title: "", description: "", kind: "food", city: "", address: "", minPoints: "100", maxRedemptions: "", expiresAt: "", monthlyFee: "49", adultsOnly: true, featured: false };

/** Admin → 🎁 Benefícios: local partners, their offers and how many codes were generated and used. */
export function BenefitsTab({ offers, actions, partnerBase }: { offers: AdminOffer[]; actions: BenefitsActions; partnerBase: string }) {
  const [form, setForm] = useState<OfferInput>(EMPTY);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const active = offers.filter((o) => o.isActive);
  const generated = offers.reduce((s, o) => s + o.generated, 0);
  const used = offers.reduce((s, o) => s + o.used, 0);
  const set = (patch: Partial<OfferInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="grid gap-6" data-testid="benefits-tab">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Vitrines ativas", value: String(active.length), hint: `${offers.length} cadastradas` },
          { label: "Mensalidades (vitrines)", value: formatBRL(active.reduce((s, o) => s + o.monthlyFeeCents, 0)), hint: "por mês, cobradas por fora (Pix/boleto)" },
          { label: "Códigos gerados", value: String(generated), hint: "resgates no app" },
          { label: "Códigos usados", value: String(used), hint: generated ? `${Math.round((used / generated) * 100)}% de uso no balcão` : "—" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">🎁 Parceiros e benefícios</h2>
        <p className="mt-1 text-xs text-slate-500">
          Envie o <b>link de validação</b> para o comércio (ele não precisa de conta). No fim do mês, mande o número de códigos usados: é o argumento para renovar.
        </p>
        {offers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">Nenhum benefício cadastrado ainda.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="admin-offers">
            {offers.map((o) => (
              <OfferRow key={o.id} offer={o} actions={actions} partnerBase={partnerBase} />
            ))}
          </ul>
        )}
      </section>

      <form
        className="grid gap-3 rounded-2xl border border-black/5 bg-white p-5 shadow-sm"
        data-testid="offer-form"
        onSubmit={(e) => {
          e.preventDefault();
          start(async () => {
            const result = await actions.createOffer(form);
            if (result.error) setMessage({ ok: false, text: "Confira os campos: nome do parceiro, título (4+ letras) e descrição (10+ letras)." });
            else {
              setMessage({ ok: true, text: "Benefício criado. Copie o link de validação e envie ao parceiro." });
              setForm(EMPTY);
            }
          });
        }}
      >
        <h2 className="font-bold text-slate-900">Novo benefício</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Parceiro (comércio)
            <input value={form.partnerName} onChange={(e) => set({ partnerName: e.target.value })} required maxLength={80} className={field} name="partnerName" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Tipo
            <select value={form.kind} onChange={(e) => set({ kind: e.target.value })} className={field}>
              {OFFER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {OFFER_EMOJI[k]} {KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Benefício (título)
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} required maxLength={120} placeholder="10% de desconto no açaí" className={field} name="title" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          Regras / descrição
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} required maxLength={600} rows={2} placeholder="Válido de segunda a sexta, um por pessoa, não cumulativo." className={field} name="description" />
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Cidade
            <input value={form.city} onChange={(e) => set({ city: e.target.value })} maxLength={80} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Endereço
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={160} className={field} />
          </label>
        </div>
        <div className="grid gap-3 sm:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Pontos mínimos
            <input type="number" min={0} value={form.minPoints} onChange={(e) => set({ minPoints: e.target.value })} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Limite de códigos
            <input type="number" min={1} value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} placeholder="sem limite" className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Validade
            <input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            Mensalidade (R$)
            <input inputMode="decimal" value={form.monthlyFee} onChange={(e) => set({ monthlyFee: e.target.value })} className={field} />
          </label>
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.adultsOnly} onChange={(e) => set({ adultsOnly: e.target.checked })} className="h-4 w-4 accent-emerald-600" data-testid="offer-adults" />
            Somente 18+
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-amber-500" />
            Vitrine destaque (aparece primeiro)
          </label>
        </div>
        {!form.adultsOnly && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            Sem &quot;Somente 18+&quot;, menores também veem o benefício. Use só para ofertas neutras e educativas (museu, livraria, transporte) — nunca bebidas, apostas ou produtos adultos (ECA e Resolução Conanda 163/2014).
          </p>
        )}
        {message && <p className={`rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
        <button type="submit" disabled={pending} className="justify-self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60" data-testid="offer-create">
          Criar benefício
        </button>
      </form>
    </div>
  );
}

function OfferRow({ offer, actions, partnerBase }: { offer: AdminOffer; actions: BenefitsActions; partnerBase: string }) {
  const [pending, start] = useTransition();
  const [copied, setCopied] = useState(false);
  const link = `${partnerBase}${offer.partnerToken}`;
  const expired = !!offer.expiresAt && new Date(offer.expiresAt) < new Date();
  return (
    <li className="grid gap-2 py-3" data-testid="admin-offer">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-2xl">{OFFER_EMOJI[isOfferKind(offer.kind) ? offer.kind : "other"]}</span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">
            {offer.partnerName} · {offer.title}
          </p>
          <p className="text-xs text-slate-500">
            {offer.city ?? "todas as cidades"} · {offer.minPoints} pts · {offer.adultsOnly ? "18+" : "livre"}
            {offer.featured ? " · ⭐ destaque" : ""}
            {offer.monthlyFeeCents ? ` · ${formatBRL(offer.monthlyFeeCents)}/mês` : ""}
            {offer.expiresAt ? ` · até ${new Date(offer.expiresAt).toLocaleDateString("pt-BR")}` : ""}
          </p>
        </div>
        <div className="text-right text-sm" data-testid="admin-offer-stats">
          <p className="font-extrabold text-slate-900">
            {offer.used}/{offer.generated}
            {offer.maxRedemptions != null ? <span className="font-semibold text-slate-400"> (máx. {offer.maxRedemptions})</span> : null}
          </p>
          <p className="text-xs text-slate-500">usados/gerados · {offer.used30} em 30 dias</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${!offer.isActive ? "bg-slate-100 text-slate-500" : expired ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {!offer.isActive ? "Pausado" : expired ? "Expirado" : "Ativo"}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 pl-10 text-xs">
        <code className="max-w-full truncate rounded-lg bg-slate-50 px-2 py-1 text-slate-500" data-testid="partner-link">
          {link}
        </code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard?.writeText(link).catch(() => {});
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-50"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copiado" : "Copiar link"}
        </button>
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
          <ExternalLink className="h-3.5 w-3.5" /> Abrir
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm("Gerar um link novo? O link antigo para de funcionar (use se ele vazou).")) start(async () => void (await actions.regenerateToken(offer.id)));
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Novo link
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await actions.toggleOffer(offer.id)))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          data-testid="offer-toggle"
        >
          {offer.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {offer.isActive ? "Pausar" : "Reativar"}
        </button>
      </div>
    </li>
  );
}
