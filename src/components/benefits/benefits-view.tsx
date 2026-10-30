"use client";

import { useState, useTransition } from "react";
import { Check, Copy, Gift, MapPin, ShieldCheck, Sparkles, Ticket } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { BENEFIT_TEXT, OFFER_EMOJI, formatRedemptionCode, isOfferKind, type RedeemError } from "@/lib/benefits";

export interface BenefitOffer {
  id: string;
  partnerName: string;
  title: string;
  description: string;
  kind: string;
  city: string | null;
  address: string | null;
  minPoints: number;
  adultsOnly: boolean;
  maxRedemptions: number | null;
  expiresAt: string | null;
  featured: boolean;
  redeemedCount: number;
}

export interface BenefitCode {
  offerId: string;
  code: string;
  createdAt: string;
  usedAt: string | null;
  /** For codes of offers no longer listed. */
  title?: string;
  partnerName?: string;
}

type RedeemResult = { error?: RedeemError | "invalid" | "too_many"; code?: string };
type Result = { error?: string; success?: boolean };

/**
 * Benefícios: offers from local businesses, unlocked by points (not spent). Server actions on the
 * web, local functions in the offline demo.
 */
export function BenefitsView({
  lang,
  points,
  adultDeclared,
  hiddenAdultCount,
  offers,
  codes,
  onRedeem,
  onDeclareAdult,
}: {
  lang: Lang;
  points: number;
  adultDeclared: boolean;
  /** 18+ offers hidden because the person hasn't declared 18+. */
  hiddenAdultCount: number;
  offers: BenefitOffer[];
  codes: BenefitCode[];
  onRedeem: (offerId: string) => Promise<RedeemResult>;
  onDeclareAdult: () => Promise<Result>;
}) {
  const text = BENEFIT_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fresh, setFresh] = useState<string | null>(null);
  const [adultChecked, setAdultChecked] = useState(false);
  const [pending, start] = useTransition();
  const codeOf = new Map(codes.map((c) => [c.offerId, c]));
  const offerTitle = new Map(offers.map((o) => [o.id, o]));

  return (
    <div className="grid gap-6" data-testid="benefits">
      <p className="flex items-start gap-2 rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
        <Sparkles className="mt-0.5 h-4 w-4 shrink-0" /> {text.freeNote}
        <span className="ml-auto shrink-0 rounded-full bg-white px-2.5 py-0.5 text-xs font-bold text-emerald-700" data-testid="benefits-points">
          {points.toLocaleString(locale)} pts
        </span>
      </p>

      {!adultDeclared && hiddenAdultCount > 0 && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4" data-testid="benefits-adult">
          <p className="flex items-center gap-2 font-bold text-amber-900">
            <ShieldCheck className="h-5 w-5" /> {text.adultTitle} ({hiddenAdultCount})
          </p>
          <p className="mt-1 text-sm text-amber-900/80">{text.adultBody}</p>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm font-semibold text-amber-950">
              <input type="checkbox" checked={adultChecked} onChange={(e) => setAdultChecked(e.target.checked)} className="h-4 w-4 accent-amber-600" data-testid="benefits-adult-check" />
              {text.adultConfirm}
            </label>
            <button
              type="button"
              disabled={!adultChecked || pending}
              onClick={() => start(async () => void (await onDeclareAdult()))}
              className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600 disabled:opacity-50"
              data-testid="benefits-adult-confirm"
            >
              OK
            </button>
          </div>
        </section>
      )}

      {offers.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500" data-testid="benefits-empty">
          {text.empty}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2" data-testid="benefits-list">
          {offers.map((offer) => {
            const mine = codeOf.get(offer.id);
            const locked = points < offer.minPoints;
            const soldOut = offer.maxRedemptions != null && offer.redeemedCount >= offer.maxRedemptions;
            return (
              <article
                key={offer.id}
                className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${offer.featured ? "border-amber-300 ring-2 ring-amber-100" : "border-black/5"}`}
                data-testid="benefit-card"
              >
                <div className="flex items-start gap-3">
                  <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-emerald-100 to-sky-100 text-2xl">
                    {OFFER_EMOJI[isOfferKind(offer.kind) ? offer.kind : "other"]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{offer.partnerName}</p>
                    <h3 className="font-bold text-slate-900">{offer.title}</h3>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {offer.featured && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">⭐ {text.featured}</span>}
                    {offer.adultsOnly && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-600">{text.adultBadge}</span>}
                  </div>
                </div>
                <p className="mt-2 flex-1 text-sm text-slate-600">{offer.description}</p>
                {(offer.address || offer.city) && (
                  <p className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <MapPin className="h-3.5 w-3.5" /> {[offer.address, offer.city].filter(Boolean).join(" · ")}
                  </p>
                )}
                <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold text-slate-500">
                  <span className={locked ? "text-amber-700" : "text-emerald-700"}>{text.minPoints(offer.minPoints)}</span>
                  {offer.expiresAt && <span>{text.validUntil(new Date(offer.expiresAt).toLocaleDateString(locale))}</span>}
                  {offer.maxRedemptions != null && <span>{text.left(Math.max(0, offer.maxRedemptions - offer.redeemedCount))}</span>}
                </p>

                {mine ? (
                  <CodeBox lang={lang} code={mine.code} usedAt={mine.usedAt} highlight={fresh === offer.id} />
                ) : (
                  <button
                    type="button"
                    disabled={pending || locked || soldOut}
                    onClick={() =>
                      start(async () => {
                        const result = await onRedeem(offer.id);
                        if (result.error) setErrors((e) => ({ ...e, [offer.id]: text.errors[result.error!] ?? text.errors.invalid }));
                        else {
                          setErrors((e) => ({ ...e, [offer.id]: "" }));
                          setFresh(offer.id);
                        }
                      })
                    }
                    className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:brightness-105 disabled:from-slate-300 disabled:to-slate-300 disabled:text-slate-600"
                    data-testid="benefit-redeem"
                  >
                    <Gift className="h-4 w-4" />
                    {soldOut ? text.errors.offer_sold_out : locked ? text.missing(offer.minPoints - points) : text.redeem}
                  </button>
                )}
                {errors[offer.id] && <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{errors[offer.id]}</p>}
              </article>
            );
          })}
        </div>
      )}

      {codes.length > 0 && (
        <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold text-slate-900">
            <Ticket className="h-5 w-5 text-emerald-600" /> {text.myCodes}
          </h2>
          <ul className="mt-3 divide-y divide-slate-100" data-testid="benefit-codes">
            {codes.map((c) => {
              const offer = offerTitle.get(c.offerId);
              return (
                <li key={c.code} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">
                    {offer?.title ?? c.title} <span className="font-normal text-slate-400">· {offer?.partnerName ?? c.partnerName}</span>
                  </span>
                  <span className="font-mono font-bold tracking-wider text-slate-700">{formatRedemptionCode(c.code)}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${c.usedAt ? "bg-slate-100 text-slate-500" : "bg-emerald-50 text-emerald-700"}`}>
                    {c.usedAt ? text.used(new Date(c.usedAt).toLocaleDateString(locale)) : text.redeemed}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}

function CodeBox({ lang, code, usedAt, highlight }: { lang: Lang; code: string; usedAt: string | null; highlight: boolean }) {
  const text = BENEFIT_TEXT[lang];
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [copied, setCopied] = useState(false);
  return (
    <div
      className={`mt-4 rounded-xl border-2 border-dashed p-3 text-center ${usedAt ? "border-slate-200 bg-slate-50" : "border-emerald-300 bg-emerald-50"} ${highlight ? "animate-slide-up" : ""}`}
      data-testid="benefit-code"
    >
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{text.yourCode}</p>
      <p className={`font-mono text-2xl font-extrabold tracking-[0.2em] ${usedAt ? "text-slate-400 line-through" : "text-emerald-800"}`}>{formatRedemptionCode(code)}</p>
      {usedAt ? (
        <p className="text-xs font-semibold text-slate-500">{text.used(new Date(usedAt).toLocaleDateString(locale))}</p>
      ) : (
        <div className="mt-1 flex items-center justify-center gap-3">
          <p className="text-xs text-emerald-900/80">{text.showAtCounter}</p>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard?.writeText(code).catch(() => {});
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
            className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700"
            aria-label="copy"
          >
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>
      )}
    </div>
  );
}
