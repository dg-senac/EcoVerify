import { useState } from "react";
import { Check, MapPin, Shield, X as XIcon, AlertTriangle, Navigation } from "lucide-react";
import { categoryEmoji, t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { dt, errorText } from "../i18n";
import { approveSubmission, confirmAudit, localizedTitle, rejectSubmission, revokeAudit, useLang, useStore, type Submission, type User } from "../store";
import { distanceMeters, formatDistance } from "../media";
import { Avatar, EmptyState, Modal, PageHeader, btnDanger, btnPrimary, btnSecondary, card, toast } from "../components/ui";
import { PhotoViewer } from "../components/PhotoViewer";
import { AiPanel } from "@/components/moderation/ai-panel";
import {
  INTERNET_COPY_MIN_EXPLANATION,
  isInternetCopyFlag,
  isRejectionCode,
  ownWords,
  REJECTION_CODES,
  REJECTION_REASONS,
  rejectionReasonText,
  type RejectionCode,
} from "@/lib/ai/decision";
import { CARDABLE_REJECTIONS } from "@/lib/cards";
import { formatKg, MATERIAL_EMOJI, MATERIAL_LABELS } from "@/lib/impact";
import { ProofEvidence } from "@/components/moderation/proof-evidence";
import { TrustScore } from "@/components/moderation/trust-score";
import { ExtraProofNote } from "@/components/moderation/extra-proof-note";
import { AuditActions } from "@/components/moderation/audit-actions";
import { tx, type Lang } from "@/lib/i18n";

export function ModerationScreen({ user }: { user: User }) {
  const lang = useLang();
  const submissions = useStore((s) => s.submissions);
  const missions = useStore((s) => s.missions);
  const users = useStore((s) => s.users);
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [reasonCode, setReasonCode] = useState<RejectionCode | null>(null);
  const [giveCard, setGiveCard] = useState(false);
  /** Weight typed by the reviewer for recycling deliveries (submission id → text). */
  const [weights, setWeights] = useState<Record<string, string>>({});

  // Appeals first (a person must answer them), then possible internet copies, then oldest first.
  // The moderator is the last resort: proofs waiting for the extra photo are not shown yet.
  const waitingExtra = submissions.filter((s) => s.status === "pending" && s.extraProofStatus === "requested").length;
  const audits = submissions.filter((s) => s.status === "approved" && s.auditStatus === "pending");
  const pending = submissions
    .filter((s) => s.status === "pending" && s.extraProofStatus !== "requested")
    .sort(
      (a, b) =>
        Number(!!b.appealedAt) - Number(!!a.appealedAt) ||
        Number(isInternetCopyFlag(b.aiReasonCode)) - Number(isInternetCopyFlag(a.aiReasonCode)) ||
        a.submittedAt.localeCompare(b.submittedAt),
    );
  const rejectingSub = rejecting ? submissions.find((s) => s.id === rejecting) : undefined;
  const flagged = isInternetCopyFlag(rejectingSub?.aiReasonCode);
  const ownLength = ownWords(reason).length;
  const recentAuto = submissions
    .filter((s) => s.decidedBy === "ai" && s.reviewedAt)
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
    .slice(0, 10);

  const openReject = (id: string) => {
    const sub = submissions.find((s) => s.id === id);
    // A flagged internet copy: the reason is pre-selected but the moderator writes the explanation.
    if (isInternetCopyFlag(sub?.aiReasonCode)) {
      setRejecting(id);
      setReasonCode("internet_copy");
      setGiveCard(false);
      setReason("");
      setReasonError(null);
      return;
    }
    const suggested = sub?.aiVerdict === "reject" && isRejectionCode(sub.aiReasonCode) ? sub.aiReasonCode : null;
    setRejecting(id);
    setGiveCard(false);
    setReasonCode(suggested);
    setReason(suggested ? (rejectionReasonText(suggested, lang) ?? "") : "");
    setReasonError(null);
  };
  const pickCode = (code: RejectionCode) => {
    setReasonCode(code);
    if (!flagged) setReason(rejectionReasonText(code, lang) ?? "");
  };

  const approve = (id: string) => {
    const result = approveSubmission(id, weights[id]);
    if (result.error) toast(errorText(lang, result.error), "error");
    else toast(`${t(lang, "status_approved")} ✓`);
  };

  const confirmReject = () => {
    if (!rejecting) return;
    const preset = reasonCode && reason.trim() === (rejectionReasonText(reasonCode, lang) ?? "").trim();
    const cardable = !!reasonCode && CARDABLE_REJECTIONS.has(reasonCode);
    const result = rejectSubmission(rejecting, reason, flagged || preset ? reasonCode : null, giveCard && cardable);
    if (result.error) return setReasonError(errorText(lang, result.error));
    toast(t(lang, "status_rejected"));
    setRejecting(null);
    setReason("");
    setReasonCode(null);
    setReasonError(null);
  };

  return (
    <>
      <PageHeader title={t(lang, "moderation_title")} subtitle={t(lang, "moderation_subtitle")} icon={Shield} />
      {waitingExtra > 0 && (
        <p className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" data-testid="auto-verifying">
          🔎 {waitingExtra}{" "}
          {tx(
            lang,
            "comprovação(ões) em verificação automática (aguardando prova extra). Só chegam aqui se a dúvida continuar.",
            "proof(s) under automatic verification (waiting for an extra proof). They only come here if the doubt remains.",
            "comprobación(es) en verificación automática (esperando prueba extra). Solo llegan aquí si la duda continúa.",
          )}
        </p>
      )}
      {pending.length === 0 ? (
        <EmptyState emoji="✅" text={t(lang, "moderation_empty")} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {pending.map((sub) => {
            const mission = missions.find((m) => m.id === sub.missionId);
            const author = users.find((u) => u.id === sub.userId);
            const history = submissions.filter((s) => s.userId === sub.userId && s.id !== sub.id);
            const own = sub.userId === user.id;
            const distance = mission ? distanceMeters(sub.latitude, sub.longitude, mission.latitude, mission.longitude) : null;
            return (
              <div key={sub.id} className={`${card} overflow-hidden animate-slide-up`} data-testid={sub.appealedAt ? "appeal" : undefined}>
                <button type="button" onClick={() => setViewing(sub.photo)} className="block aspect-video w-full bg-slate-100">
                  <img src={sub.photo} alt="" className="h-full w-full object-cover" />
                </button>
                <div className="grid gap-3 p-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={author?.name ?? "?"} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{author?.name ?? "—"}</p>
                      <p className="text-xs text-slate-400">{formatDate(sub.submittedAt, lang)}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500" title={t(lang, "user_history_title")}>
                      {t(lang, "user_history_title")}: ✅ {history.filter((h) => h.status === "approved").length} · ❌ {history.filter((h) => h.status === "rejected").length}
                    </span>
                  </div>
                  {mission && (
                    <p className="text-sm font-bold text-slate-800">
                      {categoryEmoji[mission.category] ?? "🌱"} {localizedTitle(mission, lang)}
                    </p>
                  )}
                  <p className="text-sm text-slate-600">{sub.report}</p>
                  <div className="-mt-3">
                    <ProofEvidence
                      lang={lang}
                      countItem={mission?.countItem ?? null}
                      itemCount={sub.itemCount ?? null}
                      aiItemCount={sub.aiChecks?.itemCount ?? null}
                      weightKg={sub.weightKg ?? null}
                      weightSource={sub.weightSource ?? null}
                      beforeUrl={sub.photoBefore ?? null}
                      afterUrl={sub.photo}
                    />
                  </div>
                  <div className="-mt-3">
                    <ExtraProofNote lang={lang} code={sub.extraProofCode} status={sub.extraProofStatus} photoUrl={sub.extraPhoto} />
                    <TrustScore lang={lang} score={sub.trustScore} factors={sub.aiChecks?.trustFactors} />
                  </div>
                  {sub.itemCount != null && !own && (
                    <label className="flex items-center justify-between gap-2 rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                      🔢 {t(lang, "recycling_count_review")}
                      <input
                        inputMode="numeric"
                        value={weights[sub.id] ?? String(sub.itemCount)}
                        onChange={(e) => setWeights({ ...weights, [sub.id]: e.target.value })}
                        className="w-20 rounded-lg border border-slate-200 bg-white px-2 py-1 text-right text-sm text-slate-900 outline-none focus:border-emerald-500"
                        data-testid="review-count"
                      />
                    </label>
                  )}
                  {sub.material && sub.itemCount == null && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800" data-testid="delivery">
                      <span className="font-semibold">
                        {MATERIAL_EMOJI[sub.material]} {t(lang, "recycling_delivery")}: {MATERIAL_LABELS[sub.material][lang]} · {formatKg(sub.weightKg ?? 0, lang)}
                      </span>
                      {!own && (
                        <label className="flex items-center gap-1.5 text-xs font-semibold">
                          ⚖️ {t(lang, "recycling_weight_review")}
                          <input
                            inputMode="decimal"
                            value={weights[sub.id] ?? String(sub.weightKg ?? "").replace(".", ",")}
                            onChange={(e) => setWeights({ ...weights, [sub.id]: e.target.value })}
                            className="w-16 rounded-lg border border-emerald-200 bg-white px-2 py-1 text-right text-sm text-slate-900 outline-none focus:border-emerald-500"
                            data-testid="review-weight"
                          />
                        </label>
                      )}
                    </div>
                  )}
                  {sub.appealedAt && (
                    <div className="rounded-xl border border-sky-200 bg-sky-50 p-3 text-xs text-sky-900">
                      <p className="font-bold">⚖️ {t(lang, "appeal_badge")}</p>
                      {sub.rejectionReason && (
                        <p className="mt-1">
                          <b>{t(lang, "appeal_previous_reason")}:</b> {rejectionReasonText(sub.rejectionCode ?? null, lang) ?? sub.rejectionReason}
                        </p>
                      )}
                      <p className="mt-1">
                        <b>{t(lang, "appeal_from_user")}:</b> “{sub.appealMessage}”
                      </p>
                    </div>
                  )}
                  <div className="-mt-4">
                    <AiPanel
                      lang={lang}
                      photoUrl={sub.photo}
                      data={{
                        aiStatus: sub.aiStatus ?? null,
                        aiVerdict: sub.aiVerdict ?? null,
                        aiConfidence: sub.aiConfidence ?? null,
                        aiReasonCode: sub.aiReasonCode ?? null,
                        aiSummary: sub.aiSummary ?? null,
                        aiChecks: sub.aiChecks ?? null,
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs font-semibold">
                    {sub.aiModel && (
                      <span className={`rounded-full px-2 py-1 ${sub.aiModel === "simulated" ? "bg-slate-100 text-slate-600" : "bg-violet-50 text-violet-700"}`} data-testid="ai-source">
                        🤖 {dt(lang, sub.aiModel === "simulated" ? "ai_source_simulated" : "ai_source_gemini")}
                      </span>
                    )}
                    <span className={`flex items-center gap-1 rounded-full px-2 py-1 ${sub.simulatedLocation ? "bg-amber-100 text-amber-800" : "bg-emerald-50 text-emerald-700"}`}>
                      {sub.simulatedLocation ? <Navigation className="h-3.5 w-3.5" /> : <MapPin className="h-3.5 w-3.5" />}
                      {dt(lang, sub.simulatedLocation ? "location_simulated" : "location_real")}
                    </span>
                    {distance !== null && (
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-slate-600">
                        {formatDistance(distance)} · ± {Math.round(sub.accuracy)} m
                      </span>
                    )}
                  </div>
                  {own ? (
                    <p className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
                      <AlertTriangle className="h-4 w-4 shrink-0" /> {t(lang, "own_submission_warning")}
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button type="button" className={btnSecondary} onClick={() => openReject(sub.id)}>
                        <XIcon className="h-4 w-4 text-red-500" /> {t(lang, "reject")}
                      </button>
                      <button type="button" className={btnPrimary} onClick={() => approve(sub.id)}>
                        <Check className="h-4 w-4" /> {t(lang, "approve")}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {audits.length > 0 && (
        <section className="mt-8" data-testid="audits">
          <h2 className="text-lg font-bold text-slate-900">🔍 {tx(lang, "Auditoria por amostragem", "Sample audit", "Auditoría por muestreo")}</h2>
          <p className="text-xs text-slate-500">
            {tx(
              lang,
              "Algumas aprovações automáticas são sorteadas para conferência. Confirme ou revogue (os pontos voltam).",
              "Some automatic approvals are drawn for a check. Confirm or revoke them (the points are taken back).",
              "Algunas aprobaciones automáticas se sortean para revisión. Confírmalas o revócalas (los puntos se retiran).",
            )}
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {audits.map((sub) => (
              <AuditItem
                key={sub.id}
                lang={lang}
                sub={sub}
                own={sub.userId === user.id}
                missionTitle={(() => {
                  const m = missions.find((mm) => mm.id === sub.missionId);
                  return m ? localizedTitle(m, lang) : "";
                })()}
                countItem={missions.find((m) => m.id === sub.missionId)?.countItem ?? null}
                authorName={users.find((u) => u.id === sub.userId)?.name ?? ""}
              />
            ))}
          </div>
        </section>
      )}

      {recentAuto.length > 0 && (
        <section className="mt-8" data-testid="ai-recent">
          <h2 className="text-lg font-bold text-slate-900">🤖 {t(lang, "ai_recent_title")}</h2>
          <p className="text-xs text-slate-500">{t(lang, "ai_recent_hint")}</p>
          <div className={`${card} mt-3 divide-y divide-slate-100`}>
            {recentAuto.map((sub) => {
              const mission = missions.find((m) => m.id === sub.missionId);
              const author = users.find((u) => u.id === sub.userId);
              return (
                <div key={sub.id} className="flex items-center gap-3 p-3">
                  <img src={sub.photo} alt="" className="h-10 w-10 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-slate-900">{mission ? localizedTitle(mission, lang) : "—"}</p>
                    <p className="truncate text-xs text-slate-400">{author?.name ?? "—"} · {formatDate(sub.reviewedAt ?? sub.submittedAt, lang)}</p>
                    {sub.status === "rejected" && <p className="truncate text-xs text-red-600">{sub.rejectionReason}</p>}
                    <span
                      className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-bold ${sub.status === "approved" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
                    >
                      {t(lang, sub.status === "approved" ? "decided_ai_approved" : "decided_ai_rejected")}
                      {sub.aiConfidence != null && ` · ${sub.aiConfidence}%`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {rejecting && (
        <Modal title={t(lang, "rejection_reason_title")} onClose={() => setRejecting(null)}>
          {flagged && (
            <div className="mb-3 grid gap-1.5">
              <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800">⚠️ {t(lang, "internet_explain_required")}</p>
              {reasonCode && <p className="text-xs text-slate-600">{REJECTION_REASONS[reasonCode][lang]}</p>}
              <label htmlFor="reject-reason" className="text-xs font-bold text-slate-700">{t(lang, "internet_explain_label")}</label>
            </div>
          )}
          <textarea
            id="reject-reason"
            data-testid="reject-reason"
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={flagged ? t(lang, "internet_explain_placeholder") : undefined}
            autoFocus
            maxLength={1000}
            className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {REJECTION_CODES.map((code) => (
              <button
                key={code}
                type="button"
                onClick={() => pickCode(code)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                  reasonCode === code ? "border-red-300 bg-red-50 text-red-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {REJECTION_REASONS[code][lang].split(/[.!]/)[0]}
              </button>
            ))}
          </div>
          {reasonCode && CARDABLE_REJECTIONS.has(reasonCode) && (
            <label className="mt-3 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              <input
                type="checkbox"
                checked={giveCard}
                onChange={(e) => setGiveCard(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-amber-500"
                data-testid="give-card"
              />
              <span>
                <span className="font-bold">{t(lang, "card_give_label")}</span>
                <span className="mt-0.5 block text-amber-800">{t(lang, "card_give_hint")}</span>
              </span>
            </label>
          )}
          {flagged && reason.length > 0 && ownLength < INTERNET_COPY_MIN_EXPLANATION && (
            <p className="mt-2 text-xs font-medium text-amber-600">{ownLength}/{INTERNET_COPY_MIN_EXPLANATION}</p>
          )}
          {reasonError && <p className="mt-2 text-sm text-red-600">{reasonError}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => setRejecting(null)}>{t(lang, "cancel")}</button>
            <button
              type="button"
              className={`${btnDanger} disabled:opacity-60`}
              disabled={flagged && ownLength < INTERNET_COPY_MIN_EXPLANATION}
              onClick={confirmReject}
              data-testid="confirm-reject"
            >
              {t(lang, "confirm_rejection")}
            </button>
          </div>
        </Modal>
      )}
      {viewing && <PhotoViewer src={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}

/** One automatic approval drawn for the sample audit (same as AuditCard on the web). */
function AuditItem({ lang, sub, own, missionTitle, countItem, authorName }: { lang: Lang; sub: Submission; own: boolean; missionTitle: string; countItem: string | null; authorName: string }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <div className={`${card} overflow-hidden`} data-testid="audit-card">
      <img src={sub.photo} alt={missionTitle} className="h-44 w-full object-cover" />
      <div className="p-4">
        <p className="font-bold text-slate-900">{missionTitle}</p>
        <p className="mt-0.5 text-xs text-slate-500">
          {authorName} · 🤖 {tx(lang, "aprovada automaticamente", "approved automatically", "aprobada automáticamente")}
          {sub.reviewedAt ? ` · ${formatDate(sub.reviewedAt, lang)}` : ""}
        </p>
        <p className="mt-2 text-sm text-slate-700">{sub.report}</p>
        {sub.aiSummary && <p className="mt-1 text-xs italic text-slate-500">🤖 {sub.aiSummary}</p>}
        <ProofEvidence
          lang={lang}
          countItem={countItem}
          itemCount={sub.itemCount ?? null}
          aiItemCount={sub.aiChecks?.itemCount ?? null}
          weightKg={sub.weightKg ?? null}
          weightSource={sub.weightSource ?? null}
          beforeUrl={sub.photoBefore ?? null}
          afterUrl={sub.photo}
        />
        <ExtraProofNote lang={lang} code={sub.extraProofCode} status={sub.extraProofStatus} photoUrl={sub.extraPhoto} />
        <TrustScore lang={lang} score={sub.trustScore} factors={sub.aiChecks?.trustFactors} />
        {own ? (
          <p className="mt-3 text-xs text-slate-500">{tx(lang, "Você não pode auditar a sua própria comprovação.", "You cannot audit your own proof.", "No puedes auditar tu propia comprobación.")}</p>
        ) : (
          <AuditActions
            lang={lang}
            error={error}
            onConfirm={() => {
              const result = confirmAudit(sub.id);
              if (result.error) setError(errorText(lang, result.error));
              else toast(tx(lang, "Auditoria concluída: aprovação mantida.", "Audit done: approval kept.", "Auditoría hecha: aprobación mantenida."));
            }}
            onRevoke={({ code, reason, giveCard }) => {
              const result = revokeAudit(sub.id, code, reason, giveCard);
              if (result.error) return setError(errorText(lang, result.error));
              toast(tx(lang, "Aprovação revogada e pontos retirados.", "Approval revoked and points taken back.", "Aprobación revocada y puntos retirados."));
              if (result.paidFone) toast(tx(lang, "O FONE já tinha sido pago: avise o admin.", "The FONE had already been paid: tell the admin.", "El FONE ya se había pagado: avisa al admin."), "error");
            }}
          />
        )}
      </div>
    </div>
  );
}
