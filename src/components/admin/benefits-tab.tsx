"use client";

import { useState, useTransition } from "react";
import { Check, Copy, ExternalLink, Pause, Play, RefreshCw } from "lucide-react";
import { formatBRL } from "@/lib/plans";
import { OFFER_EMOJI, OFFER_KINDS, isOfferKind, type OfferInput } from "@/lib/benefits";
import { tx, type Lang } from "@/lib/i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";

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

const KIND_LABEL: Record<string, Record<Lang, string>> = {
  food: { pt: "Alimentação", en: "Food", es: "Comida" },
  bike: { pt: "Bicicleta", en: "Bike", es: "Bicicleta" },
  sport: { pt: "Esporte", en: "Sport", es: "Deporte" },
  shop: { pt: "Loja", en: "Shop", es: "Tienda" },
  culture: { pt: "Cultura", en: "Culture", es: "Cultura" },
  other: { pt: "Outro", en: "Other", es: "Otro" },
};
const locale = (lang: Lang) => (lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US");
const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";
const EMPTY: OfferInput = { partnerName: "", title: "", description: "", titleEn: "", titleEs: "", descriptionEn: "", descriptionEs: "", kind: "food", city: "", address: "", minPoints: "100", maxRedemptions: "", expiresAt: "", monthlyFee: "49", adultsOnly: true, featured: false };

/** Admin → 🎁 Perks: local partners, their offers and how many codes were generated and used. */
export function BenefitsTab({ lang, offers, actions, partnerBase }: { lang: Lang; offers: AdminOffer[]; actions: BenefitsActions; partnerBase: string }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [form, setForm] = useState<OfferInput>(EMPTY);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const active = offers.filter((o) => o.isActive);
  const generated = offers.reduce((s, o) => s + o.generated, 0);
  const used = offers.reduce((s, o) => s + o.used, 0);
  const set = (patch: Partial<OfferInput>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <div className="grid gap-6" data-testid="benefits-tab">
      <div className={`grid grid-cols-2 gap-3 ${PAYMENTS_ENABLED ? "lg:grid-cols-4" : "lg:grid-cols-3"}`}>
        {[
          { label: T("Benefícios ativos", "Active perks", "Beneficios activos"), value: String(active.length), hint: T(`${offers.length} cadastrados`, `${offers.length} in total`, `${offers.length} registrados`) },
          ...(PAYMENTS_ENABLED
            ? [{ label: T("Mensalidades (vitrines)", "Monthly fees (listings)", "Mensualidades (vitrinas)"), value: formatBRL(active.reduce((s, o) => s + o.monthlyFeeCents, 0)), hint: T("por mês, cobradas por fora (Pix/boleto)", "per month, billed outside the app", "por mes, cobradas por fuera") }]
            : []),
          { label: T("Códigos gerados", "Codes generated", "Códigos generados"), value: String(generated), hint: T("resgates no app", "redeemed in the app", "canjes en la app") },
          { label: T("Códigos usados", "Codes used", "Códigos usados"), value: String(used), hint: generated ? T(`${Math.round((used / generated) * 100)}% de uso no balcão`, `${Math.round((used / generated) * 100)}% used at the counter`, `${Math.round((used / generated) * 100)}% de uso en caja`) : "—" },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="text-xs text-slate-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">🎁 {T("Parceiros e benefícios", "Partners and perks", "Socios y beneficios")}</h2>
        <p className="mt-1 text-xs text-slate-500">
          {T(
            "Envie o link de validação para o comércio (ele não precisa de conta). No fim do mês, mande o número de códigos usados: mostra o resultado da parceria.",
            "Send the validation link to the shop (no account needed). At the end of the month, share how many codes were used: it shows what the partnership achieved.",
            "Envía el enlace de validación al comercio (no necesita cuenta). A fin de mes, comparte cuántos códigos se usaron: muestra el resultado de la alianza.",
          )}
        </p>
        {offers.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">{T("Nenhum benefício cadastrado ainda.", "No perks yet.", "Todavía no hay beneficios.")}</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100" data-testid="admin-offers">
            {offers.map((o) => (
              <OfferRow key={o.id} lang={lang} offer={o} actions={actions} partnerBase={partnerBase} />
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
            if (result.error) setMessage({ ok: false, text: T("Confira os campos: nome do parceiro, título (4+ letras) e descrição (10+ letras).", "Check the fields: partner name, title (4+ letters) and description (10+ letters).", "Revisa los campos: nombre del socio, título (4+ letras) y descripción (10+ letras).") });
            else {
              setMessage({ ok: true, text: T("Benefício criado. Copie o link de validação e envie ao parceiro.", "Perk created. Copy the validation link and send it to the partner.", "Beneficio creado. Copia el enlace de validación y envíalo al socio.") });
              setForm(EMPTY);
            }
          });
        }}
      >
        <h2 className="font-bold text-slate-900">{T("Novo benefício", "New perk", "Nuevo beneficio")}</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Parceiro (comércio)", "Partner (shop)", "Socio (comercio)")}
            <input value={form.partnerName} onChange={(e) => set({ partnerName: e.target.value })} required maxLength={80} className={field} name="partnerName" />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Tipo", "Type", "Tipo")}
            <select value={form.kind} onChange={(e) => set({ kind: e.target.value })} className={field}>
              {OFFER_KINDS.map((k) => (
                <option key={k} value={k}>
                  {OFFER_EMOJI[k]} {KIND_LABEL[k][lang]}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          {T("Benefício (título)", "Perk (title)", "Beneficio (título)")}
          <input value={form.title} onChange={(e) => set({ title: e.target.value })} required maxLength={120} placeholder={T("10% de desconto no açaí", "10% off açaí bowls", "10% de descuento en açaí")} className={field} name="title" />
        </label>
        <label className="grid gap-1 text-xs font-semibold text-slate-600">
          {T("Regras / descrição", "Rules / description", "Reglas / descripción")}
          <textarea value={form.description} onChange={(e) => set({ description: e.target.value })} required maxLength={600} rows={2} placeholder={T("Válido de segunda a sexta, um por pessoa, não cumulativo.", "Valid Monday to Friday, one per person, not combinable.", "Válido de lunes a viernes, uno por persona, no acumulable.")} className={field} name="description" />
        </label>
        <details className="rounded-xl border border-slate-200 px-3 py-2" data-testid="offer-translations">
          <summary className="cursor-pointer text-xs font-semibold text-slate-600">
            🌐 {T("Traduções (opcional): quem usa outro idioma vê este texto", "Translations (optional): people using another language see this text", "Traducciones (opcional): quien usa otro idioma ve este texto")}
          </summary>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(
              [
                ["titleEn", "🇺🇸 Title (English)", 120],
                ["titleEs", "🇪🇸 Título (Español)", 120],
                ["descriptionEn", "🇺🇸 Rules (English)", 600],
                ["descriptionEs", "🇪🇸 Reglas (Español)", 600],
              ] as const
            ).map(([key, text, max]) => (
              <label key={key} className="grid gap-1 text-xs font-semibold text-slate-600">
                {text}
                <input value={form[key] ?? ""} onChange={(e) => set({ [key]: e.target.value })} maxLength={max} className={field} name={key} />
              </label>
            ))}
          </div>
        </details>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Cidade", "City", "Ciudad")}
            <input value={form.city} onChange={(e) => set({ city: e.target.value })} maxLength={80} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Endereço", "Address", "Dirección")}
            <input value={form.address} onChange={(e) => set({ address: e.target.value })} maxLength={160} className={field} />
          </label>
        </div>
        <div className={`grid gap-3 ${PAYMENTS_ENABLED ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Pontos mínimos", "Minimum points", "Puntos mínimos")}
            <input type="number" min={0} value={form.minPoints} onChange={(e) => set({ minPoints: e.target.value })} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Limite de códigos", "Code limit", "Límite de códigos")}
            <input type="number" min={1} value={form.maxRedemptions} onChange={(e) => set({ maxRedemptions: e.target.value })} placeholder={T("sem limite", "no limit", "sin límite")} className={field} />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-slate-600">
            {T("Validade", "Valid until", "Vigencia")}
            <input type="date" value={form.expiresAt} onChange={(e) => set({ expiresAt: e.target.value })} className={field} />
          </label>
          {PAYMENTS_ENABLED && (
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              {T("Mensalidade (R$)", "Monthly fee (R$)", "Mensualidad (R$)")}
              <input inputMode="decimal" value={form.monthlyFee} onChange={(e) => set({ monthlyFee: e.target.value })} className={field} />
            </label>
          )}
        </div>
        <div className="flex flex-wrap gap-5 text-sm font-semibold text-slate-700">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.adultsOnly} onChange={(e) => set({ adultsOnly: e.target.checked })} className="h-4 w-4 accent-emerald-600" data-testid="offer-adults" />
            {T("Somente 18+", "18+ only", "Solo 18+")}
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.featured} onChange={(e) => set({ featured: e.target.checked })} className="h-4 w-4 accent-amber-500" />
            {T("Destaque (aparece primeiro)", "Featured (shown first)", "Destacado (aparece primero)")}
          </label>
        </div>
        {!form.adultsOnly && (
          <p className="rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
            {T(
              "Sem \"Somente 18+\", menores também veem o benefício. Use só para ofertas neutras e educativas (museu, livraria, transporte) — nunca bebidas, apostas ou produtos adultos (ECA e Resolução Conanda 163/2014).",
              "Without \"18+ only\", minors also see the perk. Use it only for neutral, educational offers (museum, bookshop, transport) — never drinks, betting or adult products (ECA and Conanda Resolution 163/2014).",
              "Sin \"Solo 18+\", los menores también ven el beneficio. Úsalo solo para ofertas neutras y educativas (museo, librería, transporte) — nunca bebidas, apuestas o productos para adultos (ECA y Resolución Conanda 163/2014).",
            )}
          </p>
        )}
        {message && <p className={`rounded-xl px-3 py-2 text-sm ${message.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>{message.text}</p>}
        <button type="submit" disabled={pending} className="justify-self-start rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-600 disabled:opacity-60" data-testid="offer-create">
          {T("Criar benefício", "Create perk", "Crear beneficio")}
        </button>
      </form>
    </div>
  );
}

function OfferRow({ lang, offer, actions, partnerBase }: { lang: Lang; offer: AdminOffer; actions: BenefitsActions; partnerBase: string }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
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
            {offer.city ?? T("todas as cidades", "all cities", "todas las ciudades")} · {offer.minPoints} pts · {offer.adultsOnly ? "18+" : T("livre", "all ages", "todas las edades")}
            {offer.featured ? ` · ⭐ ${T("destaque", "featured", "destacado")}` : ""}
            {PAYMENTS_ENABLED && offer.monthlyFeeCents ? ` · ${formatBRL(offer.monthlyFeeCents)}/${T("mês", "month", "mes")}` : ""}
            {offer.expiresAt ? ` · ${T("até", "until", "hasta")} ${new Date(offer.expiresAt).toLocaleDateString(locale(lang))}` : ""}
          </p>
        </div>
        <div className="text-right text-sm" data-testid="admin-offer-stats">
          <p className="font-extrabold text-slate-900">
            {offer.used}/{offer.generated}
            {offer.maxRedemptions != null ? <span className="font-semibold text-slate-400"> ({T("máx.", "max.", "máx.")} {offer.maxRedemptions})</span> : null}
          </p>
          <p className="text-xs text-slate-500">{T(`usados/gerados · ${offer.used30} em 30 dias`, `used/generated · ${offer.used30} in 30 days`, `usados/generados · ${offer.used30} en 30 días`)}</p>
        </div>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-bold ${!offer.isActive ? "bg-slate-100 text-slate-500" : expired ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}
        >
          {!offer.isActive ? T("Pausado", "Paused", "Pausado") : expired ? T("Expirado", "Expired", "Vencido") : T("Ativo", "Active", "Activo")}
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
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {copied ? T("Copiado", "Copied", "Copiado") : T("Copiar link", "Copy link", "Copiar enlace")}
        </button>
        <a href={link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50">
          <ExternalLink className="h-3.5 w-3.5" /> {T("Abrir", "Open", "Abrir")}
        </a>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (window.confirm(T("Gerar um link novo? O link antigo para de funcionar (use se ele vazou).", "Generate a new link? The old one stops working (use it if the link leaked).", "¿Generar un enlace nuevo? El anterior deja de funcionar (úsalo si se filtró)."))) start(async () => void (await actions.regenerateToken(offer.id)));
          }}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> {T("Novo link", "New link", "Nuevo enlace")}
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => void (await actions.toggleOffer(offer.id)))}
          className="inline-flex items-center gap-1 rounded-lg px-2 py-1 font-semibold text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          data-testid="offer-toggle"
        >
          {offer.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />} {offer.isActive ? T("Pausar", "Pause", "Pausar") : T("Reativar", "Resume", "Reactivar")}
        </button>
      </div>
    </li>
  );
}
