"use client";

import { useState, useTransition } from "react";
import { confirmAuditAction, revokeAuditAction } from "@/lib/actions/moderation";
import { categoryEmoji, tx, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { AuditActions } from "@/components/moderation/audit-actions";
import { TrustScore } from "@/components/moderation/trust-score";
import { ProofEvidence } from "@/components/moderation/proof-evidence";
import type { WeightSource } from "@/lib/proof";

export type AuditItem = {
  id: string;
  photoUrl: string;
  photoBeforeUrl: string | null;
  extraPhotoUrl: string | null;
  report: string;
  missionTitle: string;
  missionCategory: string;
  authorName: string;
  reviewedAt: Date | null;
  trustScore: number | null;
  trustFactors: { key: string; points: number }[] | null;
  aiSummary: string | null;
  itemCount: number | null;
  aiItemCount: number | null;
  weightKg: string | null;
  weightSource: WeightSource | null;
  countItem: string | null;
  isOwn: boolean;
};

/** One automatic approval picked for the sample audit (web). */
export function AuditCard({ lang, item }: { lang: Lang; item: AuditItem }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [pending, start] = useTransition();
  const [done, setDone] = useState<"ok" | "revoked" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const errorText = (code: string) =>
    code === "audit_fone_already_paid"
      ? T("Aprovação revogada. O FONE já tinha sido pago: avise o admin.", "Approval revoked. The FONE had already been paid: tell the admin.", "Aprobación revocada. El FONE ya se había pagado: avisa al admin.")
      : code === "own_submission"
        ? T("Você não pode auditar a sua própria comprovação.", "You cannot audit your own proof.", "No puedes auditar tu propia comprobación.")
        : T("Não foi possível concluir. Atualize a página.", "Could not finish. Reload the page.", "No se pudo terminar. Recarga la página.");

  if (done) {
    return (
      <div className={`rounded-2xl border p-4 text-sm font-semibold ${done === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-800"}`}>
        {done === "ok" ? `✓ ${T("Auditoria concluída: aprovação mantida.", "Audit done: approval kept.", "Auditoría hecha: aprobación mantenida.")}` : `↩️ ${T("Aprovação revogada e pontos retirados.", "Approval revoked and points taken back.", "Aprobación revocada y puntos retirados.")}`}
        {error && <p className="mt-1 text-xs font-medium">{error}</p>}
      </div>
    );
  }

  const run = (action: typeof confirmAuditAction, data: Record<string, string>, next: "ok" | "revoked") =>
    start(async () => {
      const form = new FormData();
      for (const [k, v] of Object.entries(data)) form.set(k, v);
      const result = await action({}, form);
      if (result.success) {
        if (result.error) setError(errorText(result.error));
        setDone(next);
      } else setError(errorText(result.error ?? ""));
    });

  return (
    <div className="card-surface overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm md:flex" data-testid="audit-card">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.photoUrl} alt={item.missionTitle} className="h-48 w-full object-cover md:h-auto md:w-56" />
      <div className="flex-1 p-4">
        <p className="font-bold text-slate-900">
          {categoryEmoji[item.missionCategory] ?? "🌱"} {item.missionTitle}
        </p>
        <p className="mt-0.5 text-xs text-slate-500">
          {item.authorName} · 🤖 {T("aprovada automaticamente", "approved automatically", "aprobada automáticamente")}
          {item.reviewedAt ? ` · ${formatDate(item.reviewedAt, lang)}` : ""}
        </p>
        <p className="mt-2 text-sm text-slate-700">{item.report}</p>
        {item.aiSummary && <p className="mt-1 text-xs italic text-slate-500">🤖 {item.aiSummary}</p>}
        <ProofEvidence
          lang={lang}
          countItem={item.countItem}
          itemCount={item.itemCount}
          aiItemCount={item.aiItemCount}
          weightKg={item.weightKg}
          weightSource={item.weightSource}
          beforeUrl={item.photoBeforeUrl}
          afterUrl={item.photoUrl}
        />
        {item.extraPhotoUrl && (
          <p className="mt-2 text-xs">
            <a href={item.extraPhotoUrl} target="_blank" rel="noreferrer" className="font-semibold text-violet-700 hover:underline">
              📸 {T("Ver a prova extra", "See the extra proof", "Ver la prueba extra")}
            </a>
          </p>
        )}
        <TrustScore lang={lang} score={item.trustScore} factors={item.trustFactors} />
        {item.isOwn ? (
          <p className="mt-3 text-xs text-slate-500">{errorText("own_submission")}</p>
        ) : (
          <AuditActions
            lang={lang}
            pending={pending}
            error={error}
            onConfirm={() => run(confirmAuditAction, { submissionId: item.id }, "ok")}
            onRevoke={({ code, reason, giveCard }) =>
              run(revokeAuditAction, { submissionId: item.id, reasonCode: code ?? "", reason, ...(giveCard ? { giveCard: "on" } : {}) }, "revoked")
            }
          />
        )}
      </div>
    </div>
  );
}
