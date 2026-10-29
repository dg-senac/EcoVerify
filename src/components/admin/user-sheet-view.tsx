"use client";

import { useState, useTransition } from "react";
import {
  CARD_NOTE_MIN,
  CARD_REASONS,
  CARD_REASON_LABELS,
  countingYellows,
  isCardActive,
  isCardReason,
  isSuspended,
  YELLOWS_FOR_SUSPENSION,
  type CardReason,
  type CardType,
} from "@/lib/cards";
import type { CardView } from "@/components/cards/cards-panel";
import { formatDate } from "@/lib/utils";

export type AdminCard = CardView & { causedSuspension: boolean };

export type UserDetails = {
  cards: AdminCard[];
  approved: number;
  rejected: number;
  pending: number;
  fonePaid: string;
  foneOpen: string;
};

export type SheetUser = {
  id: string;
  name: string;
  email: string;
  role: "citizen" | "moderator" | "admin";
  totalPoints: number;
  createdAt: Date | string;
  isBanned: boolean;
  banReason: string | null;
  suspendedUntil: Date | string | null;
  suspensionReason: string | null;
  walletVerifiedAt: Date | string | null;
};

export type SheetResult = { error?: string; success?: boolean };
type MaybeAsync<T> = T | Promise<T>;

/** What the sheet can do; the web app passes server actions, the demo passes its local store. */
export type SheetHandlers = {
  onGive: (input: { type: CardType; reason: CardReason; note: string }) => MaybeAsync<SheetResult>;
  onRevoke: (cardId: string) => MaybeAsync<unknown>;
  onKeep: (cardId: string) => MaybeAsync<unknown>;
  onLift: () => MaybeAsync<unknown>;
};

const ROLE_LABEL = { citizen: "Cidadão", moderator: "Moderador", admin: "Administrador" } as const;

/** Badges shown on the user row: active yellow cards, red card, suspension. */
export function CardBadges({ cards, suspendedUntil }: { cards: AdminCard[]; suspendedUntil: Date | string | null }) {
  const yellows = countingYellows(cards).length;
  const red = cards.some((card) => card.type === "red" && isCardActive(card));
  return (
    <>
      {yellows > 0 && (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800" data-testid="yellow-badge">
          🟨 {yellows}/{YELLOWS_FOR_SUSPENSION}
        </span>
      )}
      {red && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">🟥</span>}
      {isSuspended(suspendedUntil) && suspendedUntil && (
        <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] font-bold text-orange-700" data-testid="suspended-badge">
          SUSPENSO até {formatDate(suspendedUntil, "pt")}
        </span>
      )}
    </>
  );
}

/**
 * User sheet (Admin → Users → Ficha): status, points, proofs, FONE, cards and the actions an admin
 * can take on them (give a yellow/red card, cancel a card, answer an appeal, end a suspension).
 * Presentational: shared by the web app and the offline demo.
 */
export function UserSheetView({
  user,
  details,
  onClose,
  handlers,
}: {
  user: SheetUser;
  details: UserDetails;
  onClose: () => void;
  handlers: SheetHandlers;
}) {
  const [isPending, startTransition] = useTransition();
  const [type, setType] = useState<CardType>("yellow");
  const [reason, setReason] = useState<CardReason>("internet_copy");
  const [note, setNote] = useState("");
  const [state, setState] = useState<SheetResult>({});
  const [giving, setGiving] = useState(false);
  const run = (fn: () => MaybeAsync<unknown>) =>
    startTransition(async () => {
      await fn();
    });
  const give = async () => {
    setGiving(true);
    try {
      const result = await handlers.onGive({ type, reason, note });
      setState(result);
      if (result.success) setNote("");
    } finally {
      setGiving(false);
    }
  };
  const suspended = isSuspended(user.suspendedUntil);
  const yellows = countingYellows(details.cards).length;
  const status = user.isBanned ? "Bloqueado" : suspended ? "Suspenso" : "Ativo";

  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 animate-fade-in" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl animate-scale-in" data-testid="user-sheet">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">{user.name}</h3>
            <p className="text-xs text-slate-500">
              {user.email} · {ROLE_LABEL[user.role]} · desde {formatDate(user.createdAt, "pt")}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full px-3 py-1 text-sm font-semibold text-slate-500 hover:bg-slate-100" aria-label="Fechar">
            ✕
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <Stat label="Situação" value={status} tone={user.isBanned ? "red" : suspended ? "orange" : "green"} />
          <Stat label="Pontos" value={String(user.totalPoints)} />
          <Stat label="Cartões amarelos" value={`${yellows}/${YELLOWS_FOR_SUSPENSION}`} tone={yellows ? "amber" : undefined} />
          <Stat label="Carteira" value={user.walletVerifiedAt ? "Verificada" : "Não verificada"} />
          <Stat label="Aprovadas" value={String(details.approved)} />
          <Stat label="Rejeitadas" value={String(details.rejected)} />
          <Stat label="Pendentes" value={String(details.pending)} />
          <Stat label="FONE pago / a pagar" value={`${details.fonePaid} / ${details.foneOpen}`} />
        </div>
        {(user.isBanned || suspended) && Number(details.foneOpen) > 0 && (
          <p className="mt-2 text-xs text-orange-700">❄️ Os FONE a pagar ficam congelados enquanto a conta estiver suspensa ou bloqueada.</p>
        )}

        {suspended && user.suspendedUntil && (
          <div className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-900">
            <p className="font-bold">Suspenso até {formatDate(user.suspendedUntil, "pt")}</p>
            {user.suspensionReason && <p className="mt-1 text-xs">{user.suspensionReason}</p>}
            <button
              type="button"
              disabled={isPending}
              onClick={() => run(handlers.onLift)}
              className="mt-2 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-bold text-orange-800 hover:bg-orange-100 disabled:opacity-50"
              data-testid="lift-suspension"
            >
              Encerrar suspensão agora
            </button>
          </div>
        )}

        <h4 className="mt-5 font-bold text-slate-900">Cartões</h4>
        {details.cards.length === 0 ? (
          <p className="mt-1 text-sm text-slate-500">Nenhum cartão.</p>
        ) : (
          <ul className="mt-2 space-y-2">
            {details.cards.map((card) => {
              const active = isCardActive(card);
              const label = isCardReason(card.reasonCode) ? CARD_REASON_LABELS[card.reasonCode].pt : card.reasonCode;
              const appealOpen = !!card.appealedAt && !card.revokedAt && !card.appealRejectedAt;
              return (
                <li key={card.id} className={`rounded-xl border px-3 py-2 text-xs ${active ? (card.type === "red" ? "border-red-200 bg-red-50" : "border-amber-200 bg-amber-50") : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  <p className="font-bold">
                    {card.type === "red" ? "🟥 Vermelho" : "🟨 Amarelo"} · {label} · {formatDate(card.createdAt, "pt")}
                    {card.revokedAt ? " · cancelado" : !active ? " · expirado" : card.consumedAt ? " · cumprido (suspensão)" : ""}
                  </p>
                  <p className="mt-0.5">{card.note}</p>
                  {card.appealedAt && (
                    <p className="mt-1 rounded-lg bg-white/80 px-2 py-1 text-sky-900">
                      ⚖️ Contestação: “{card.appealMessage}” {card.appealRejectedAt ? "(mantido)" : ""}
                    </p>
                  )}
                  {!card.revokedAt && (
                    <div className="mt-1.5 flex gap-2">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => run(() => handlers.onRevoke(card.id))}
                        className="rounded-lg border border-emerald-300 bg-white px-2.5 py-1 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                      >
                        {appealOpen ? "Aceitar contestação (cancelar cartão)" : "Cancelar cartão"}
                      </button>
                      {appealOpen && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => run(() => handlers.onKeep(card.id))}
                          className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        >
                          Manter cartão
                        </button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {!user.isBanned && user.role !== "admin" && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void give();
            }}
            className="mt-5 space-y-2 rounded-2xl border border-slate-200 p-4"
            data-testid="give-card-form"
          >
            <h4 className="font-bold text-slate-900">Dar cartão</h4>
            <p className="text-xs text-slate-500">
              Só para tentativa de fraude ou ofensa, nunca para erro honesto. O 3º amarelo válido suspende por 14 dias. O vermelho bloqueia a conta (reincidência ou caso grave).
            </p>
            <div className="flex flex-wrap gap-2">
              <select
                name="type"
                value={type}
                onChange={(e) => setType(e.target.value === "red" ? "red" : "yellow")}
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold"
                data-testid="card-type"
              >
                <option value="yellow">🟨 Amarelo</option>
                <option value="red">🟥 Vermelho (bloqueia)</option>
              </select>
              <select
                name="reason"
                value={reason}
                onChange={(e) => isCardReason(e.target.value) && setReason(e.target.value)}
                data-testid="card-reason"
                className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold">
                {CARD_REASONS.map((reason) => (
                  <option key={reason} value={reason}>
                    {CARD_REASON_LABELS[reason].pt}
                  </option>
                ))}
              </select>
            </div>
            <textarea
              name="note"
              required
              minLength={CARD_NOTE_MIN}
              maxLength={1000}
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Explique para a pessoa o que aconteceu (ela vai ler)."
              data-testid="card-note"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
            />
            {state.error && <p className="text-xs font-medium text-red-600">{state.error === "card_note_short" ? "Explique com pelo menos 15 caracteres." : "Não foi possível dar o cartão."}</p>}
            {state.success && <p className="text-xs font-medium text-emerald-700">Cartão registrado e pessoa avisada.</p>}
            <button
              type="submit"
              data-testid="give-card-submit"
              disabled={giving || note.trim().length < CARD_NOTE_MIN}
              className={`rounded-xl px-4 py-2 text-sm font-bold text-white disabled:opacity-60 ${type === "red" ? "bg-red-600" : "bg-amber-500"}`}
            >
              {type === "red" ? "Dar cartão vermelho" : "Dar cartão amarelo"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "red" | "orange" | "green" | "amber" }) {
  const color = tone === "red" ? "text-red-700" : tone === "orange" ? "text-orange-700" : tone === "green" ? "text-emerald-700" : tone === "amber" ? "text-amber-700" : "text-slate-900";
  return (
    <div className="rounded-xl bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}
