"use client";

import { useActionState, useState, useTransition } from "react";
import {
  banUserAction,
  contactUserAction,
  unbanUserAction,
  updateUserRoleAction,
  type AdminActionState,
} from "@/lib/actions/admin";
import { formatDate } from "@/lib/utils";

const initialState: AdminActionState = {};

export function UserRow({
  user,
  currentUserId,
}: {
  user: {
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
  };
  currentUserId: string;
}) {
  const [role, setRole] = useState(user.role);
  const [isPending, startTransition] = useTransition();
  const [contactOpen, setContactOpen] = useState(false);
  const [banOpen, setBanOpen] = useState(false);
  const isSelf = user.id === currentUserId;

  const [contactState, contactFormAction, contactPending] = useActionState(
    async (prev: AdminActionState, formData: FormData) => {
      const result = await contactUserAction(prev, formData);
      if (result.success) setContactOpen(false);
      return result;
    },
    initialState,
  );
  const [banState, banFormAction, banPending] = useActionState(
    async (prev: AdminActionState, formData: FormData) => {
      const result = await banUserAction(prev, formData);
      if (result.success) setBanOpen(false);
      return result;
    },
    initialState,
  );

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-black/5 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-semibold text-slate-800">{user.name}</p>
          {user.isBanned && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-600">BANIDO</span>
          )}
        </div>
        <p className="text-xs text-slate-400">{user.email}</p>
        {user.isBanned && user.banReason && (
          <p className="mt-1 text-xs font-medium text-red-500">
            Motivo: {user.banReason}
            {user.bannedAt && <span className="font-normal text-red-400"> · desde {formatDate(user.bannedAt, "pt")}</span>}
          </p>
        )}
        {user.isBanned && user.banAppealedAt && (
          <div className="mt-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900" data-testid="ban-appeal">
            <p className="font-bold">⚖️ Contestação enviada em {formatDate(user.banAppealedAt, "pt")}</p>
            <p className="mt-0.5 whitespace-pre-line">“{user.banAppealMessage}”</p>
            <p className="mt-1 text-sky-700">Responda pelo e-mail {user.email} e, se for o caso, desbloqueie a conta.</p>
          </div>
        )}
        <p className="mt-0.5 text-xs text-slate-400">Desde {formatDate(user.createdAt, "pt")}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">⭐ {user.totalPoints}</span>
        <select
          value={role}
          disabled={isSelf || isPending}
          onChange={(e) => {
            const newRole = e.target.value as typeof role;
            setRole(newRole);
            startTransition(() => updateUserRoleAction(user.id, newRole));
          }}
          className="rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-50"
        >
          <option value="citizen">Cidadão</option>
          <option value="moderator">Moderador</option>
          <option value="admin">Administrador</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setContactOpen(true)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          Contato
        </button>
        {user.isBanned ? (
          <button
            type="button"
            disabled={isSelf}
            onClick={() => startTransition(() => unbanUserAction(user.id))}
            className="rounded-lg border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 disabled:opacity-40"
          >
            Desbanir
          </button>
        ) : (
          <button
            type="button"
            disabled={isSelf}
            onClick={() => setBanOpen(true)}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            Banir
          </button>
        )}
      </div>

      {contactOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900">Contatar {user.name}</h3>
            <form action={contactFormAction} className="mt-4 space-y-3">
              <input type="hidden" name="userId" value={user.id} />
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Título</label>
                <input
                  name="title"
                  required
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Mensagem</label>
                <textarea
                  name="message"
                  required
                  rows={4}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
                />
              </div>
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setContactOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={contactPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {contactPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  Enviar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {banOpen && (
        <div className="fixed inset-0 z-[60] grid place-items-center bg-black/50 p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-scale-in">
            <h3 className="text-lg font-bold text-slate-900">Banir {user.name}</h3>
            <p className="mt-1 text-sm text-slate-500">Esta ação impede o acesso da pessoa à plataforma.</p>
            <form action={banFormAction} className="mt-4 space-y-3">
              <input type="hidden" name="userId" value={user.id} />
              <textarea
                name="reason"
                required
                minLength={3}
                rows={3}
                placeholder="Motivo do banimento..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              {banState.error === "reason_required" && (
                <p className="text-xs font-medium text-red-500">Informe um motivo.</p>
              )}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setBanOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={banPending}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-70"
                >
                  {banPending && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                  Confirmar banimento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
