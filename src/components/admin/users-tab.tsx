"use client";

import { useTransition } from "react";
import { UserRow } from "@/components/admin/user-row";
import { keepCardAction, revokeCardAction } from "@/lib/actions/cards";
import { CARD_REASON_LABELS, isCardReason } from "@/lib/cards";
import { formatDate } from "@/lib/utils";
import type { AdminCard, UserDetails } from "@/components/admin/user-sheet";

export function UsersTab({
  users,
  currentUserId,
  details,
  cardAppeals,
}: {
  users: {
    id: string;
    name: string;
    email: string;
    role: "citizen" | "moderator" | "admin";
    totalPoints: number;
    createdAt: Date;
    isBanned: boolean;
    banReason: string | null;
    bannedAt: Date | null;
    banAppealMessage: string | null;
    banAppealedAt: Date | null;
    suspendedUntil: Date | null;
    suspensionReason: string | null;
    walletVerifiedAt: Date | null;
  }[];
  currentUserId: string;
  details: Record<string, UserDetails>;
  cardAppeals: (AdminCard & { userId: string; userName: string })[];
}) {
  const [isPending, startTransition] = useTransition();
  return (
    <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
      {cardAppeals.length > 0 && (
        <div className="mb-5 rounded-2xl border border-sky-200 bg-sky-50 p-4" data-testid="card-appeals">
          <h3 className="font-bold text-sky-900">⚖️ Contestações de cartões ({cardAppeals.length})</h3>
          <ul className="mt-2 space-y-2">
            {cardAppeals.map((card) => (
              <li key={card.id} className="rounded-xl bg-white px-3 py-2 text-xs text-slate-700">
                <p className="font-bold">
                  {card.userName} · {card.type === "red" ? "🟥" : "🟨"} {isCardReason(card.reasonCode) ? CARD_REASON_LABELS[card.reasonCode].pt : card.reasonCode} ·{" "}
                  {formatDate(card.createdAt, "pt")}
                </p>
                <p className="mt-0.5 text-slate-500">Cartão: {card.note}</p>
                <p className="mt-0.5 text-sky-900">Contestação: “{card.appealMessage}”</p>
                <div className="mt-1.5 flex gap-2">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => revokeCardAction(card.id))}
                    className="rounded-lg border border-emerald-300 px-2.5 py-1 font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                  >
                    Aceitar (cancelar cartão)
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => startTransition(() => keepCardAction(card.id))}
                    className="rounded-lg border border-slate-300 px-2.5 py-1 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    Manter
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3 className="mb-3 font-bold text-slate-900">Usuários da plataforma</h3>
      <div className="space-y-2">
        {users.map((user) => (
          <UserRow key={user.id} user={user} currentUserId={currentUserId} details={details[user.id]} />
        ))}
      </div>
    </div>
  );
}
