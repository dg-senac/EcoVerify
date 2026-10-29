"use client";

import { useState } from "react";
import { CARD_APPEAL_MIN, CARD_REASON_LABELS, isCardActive, isCardReason, type CardType } from "@/lib/cards";
import { t, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

/** What the panel needs about a card (server rows and demo objects both fit). */
export type CardView = {
  id: string;
  type: CardType;
  reasonCode: string;
  note: string;
  createdAt: Date | string;
  expiresAt: Date | string | null;
  consumedAt: Date | string | null;
  revokedAt: Date | string | null;
  appealMessage: string | null;
  appealedAt: Date | string | null;
  appealRejectedAt: Date | string | null;
};

export type AppealHandler = (cardId: string, message: string) => Promise<{ error?: string }> | { error?: string };

/**
 * "My cards" on the profile: every card with its reason, validity and a one-time appeal.
 * Presentational: shared by the web app (server action) and the offline demo (local store).
 */
export function CardsPanel({ lang, cards, onAppeal, errorText }: { lang: Lang; cards: CardView[]; onAppeal: AppealHandler; errorText: (code: string) => string }) {
  return (
    <section className="card-surface rounded-3xl border border-black/5 bg-white p-5 shadow-sm" data-testid="cards-panel">
      <h2 className="flex items-center gap-2 font-bold text-slate-900">🟨 {t(lang, "cards_title")}</h2>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{t(lang, "cards_rules")}</p>
      {cards.length === 0 ? (
        <p className="mt-3 rounded-xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{t(lang, "cards_none")}</p>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {cards.map((card) => (
            <CardItem key={card.id} lang={lang} card={card} onAppeal={onAppeal} errorText={errorText} />
          ))}
        </ul>
      )}
    </section>
  );
}

function CardItem({ lang, card, onAppeal, errorText }: { lang: Lang; card: CardView; onAppeal: AppealHandler; errorText: (code: string) => string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const active = isCardActive(card);
  const label = isCardReason(card.reasonCode) ? CARD_REASON_LABELS[card.reasonCode][lang] : card.reasonCode;
  const status = card.revokedAt
    ? t(lang, "card_cancelled")
    : !active
      ? t(lang, "card_expired")
      : card.consumedAt
        ? t(lang, "card_used_suspension")
        : card.expiresAt
          ? `${t(lang, "card_valid_until")} ${formatDate(card.expiresAt, lang)}`
          : "";

  const send = async () => {
    setSending(true);
    const result = await onAppeal(card.id, message);
    setSending(false);
    if (result.error) setError(errorText(result.error));
    else setOpen(false);
  };

  return (
    <li
      className={`rounded-2xl border px-4 py-3 text-sm ${active ? (card.type === "red" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50") : "border-slate-200 bg-slate-50 opacity-75"}`}
      data-testid="card-item"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span aria-hidden="true" className={`inline-block h-5 w-3.5 rounded-sm ${card.type === "red" ? "bg-red-500" : "bg-amber-400"}`} />
        <span className="font-bold text-slate-900">{t(lang, card.type === "red" ? "card_red" : "card_yellow")}</span>
        <span className="text-slate-600">· {label}</span>
        <span className="ml-auto text-xs text-slate-500">{formatDate(card.createdAt, lang)}</span>
      </div>
      <p className="mt-1.5 text-slate-700">{card.note}</p>
      {status && <p className="mt-1 text-xs font-semibold text-slate-500">{status}</p>}
      {card.appealedAt && (
        <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-xs text-slate-600">
          ⚖️ {card.revokedAt ? t(lang, "card_cancelled") : card.appealRejectedAt ? t(lang, "card_appeal_kept") : t(lang, "card_appeal_sent")}
        </p>
      )}
      {active && !card.appealedAt && !open && (
        <button type="button" onClick={() => setOpen(true)} className="mt-2 text-xs font-bold text-sky-700 hover:underline" data-testid="card-appeal-open">
          ⚖️ {t(lang, "card_appeal")}
        </button>
      )}
      {open && (
        <div className="mt-2 space-y-2">
          <textarea
            rows={3}
            maxLength={1500}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t(lang, "card_appeal_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            data-testid="card-appeal-message"
          />
          {message.length > 0 && message.trim().length < CARD_APPEAL_MIN && <p className="text-xs text-amber-700">{t(lang, "banned_appeal_too_short")}</p>}
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setOpen(false)} className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600">
              {t(lang, "cancel")}
            </button>
            <button
              type="button"
              disabled={sending || message.trim().length < CARD_APPEAL_MIN}
              onClick={send}
              className="flex-1 rounded-xl bg-sky-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
              data-testid="card-appeal-send"
            >
              {t(lang, "banned_appeal_send")}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
