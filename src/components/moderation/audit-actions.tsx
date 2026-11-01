"use client";

import { useState } from "react";
import { tx, type Lang } from "@/lib/i18n";
import { REJECTION_CODES, REJECTION_REASONS, type RejectionCode } from "@/lib/ai/decision";

const AUDIT_CODES = REJECTION_CODES.filter((code) => code !== "extra_proof_missing" && code !== "partner_missing");

/**
 * Sample audit of an automatic approval (src/lib/verification.ts): keep it or revoke it.
 * Revoking takes the points back; the auditor explains why (and may add a yellow card).
 * Shared by the web app and the APK: the caller does the work in onConfirm / onRevoke.
 */
export function AuditActions({
  lang,
  pending = false,
  error,
  canGiveCard = true,
  onConfirm,
  onRevoke,
}: {
  lang: Lang;
  pending?: boolean;
  error?: string | null;
  canGiveCard?: boolean;
  onConfirm: () => void;
  onRevoke: (input: { code: RejectionCode | null; reason: string; giveCard: boolean }) => void;
}) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [revoking, setRevoking] = useState(false);
  const [code, setCode] = useState<RejectionCode | "">("");
  const [reason, setReason] = useState("");
  const [giveCard, setGiveCard] = useState(false);
  const text = reason.trim() || (code ? REJECTION_REASONS[code][lang] : "");

  return (
    <div className="mt-3 grid gap-2" data-testid="audit-actions">
      {!revoking ? (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-emerald-600 disabled:opacity-60"
            data-testid="audit-confirm"
          >
            ✓ {T("Está tudo certo", "It is fine", "Está todo bien")}
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => setRevoking(true)}
            className="flex-1 rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-600 ring-1 ring-red-200 hover:bg-red-50 disabled:opacity-60"
            data-testid="audit-revoke-open"
          >
            ↩️ {T("Revogar aprovação", "Revoke approval", "Revocar aprobación")}
          </button>
        </div>
      ) : (
        <div className="grid gap-2 rounded-xl border border-red-200 bg-red-50/60 p-3 text-sm">
          <p className="text-xs text-red-900">
            {T(
              "A comprovação vira recusada e os pontos são retirados. A pessoa recebe sua explicação.",
              "The proof becomes rejected and the points are taken back. The person gets your explanation.",
              "La comprobación pasa a rechazada y se retiran los puntos. La persona recibe tu explicación.",
            )}
          </p>
          <select value={code} onChange={(e) => setCode(e.target.value as RejectionCode | "")} className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm">
            <option value="">{T("Motivo (opcional)", "Reason (optional)", "Motivo (opcional)")}</option>
            {AUDIT_CODES.map((c) => (
              <option key={c} value={c}>
                {REJECTION_REASONS[c][lang].slice(0, 70)}
              </option>
            ))}
          </select>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            maxLength={1000}
            placeholder={T("Explique o que a auditoria encontrou", "Explain what the audit found", "Explica lo que encontró la auditoría")}
            className="rounded-lg border border-red-200 bg-white px-2 py-1.5 text-sm"
            data-testid="audit-reason"
          />
          {canGiveCard && (
            <label className="flex items-center gap-2 text-xs font-semibold text-red-900">
              <input type="checkbox" checked={giveCard} onChange={(e) => setGiveCard(e.target.checked)} className="accent-amber-500" />
              🟨 {T("Dar cartão amarelo (tentativa de fraude)", "Give a yellow card (attempted fraud)", "Dar tarjeta amarilla (intento de fraude)")}
            </label>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={() => setRevoking(false)} className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-white">
              {T("Cancelar", "Cancel", "Cancelar")}
            </button>
            <button
              type="button"
              disabled={pending || text.length < 10}
              onClick={() => onRevoke({ code: code || null, reason: reason.trim(), giveCard })}
              className="ml-auto rounded-lg bg-red-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
              data-testid="audit-revoke"
            >
              {T("Revogar", "Revoke", "Revocar")}
            </button>
          </div>
        </div>
      )}
      {error && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">{error}</p>}
    </div>
  );
}
