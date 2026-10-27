import { useState } from "react";
import { Check, MapPin, Shield, X as XIcon, AlertTriangle, Navigation } from "lucide-react";
import { categoryEmoji, t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { dt, errorText } from "../i18n";
import { approveSubmission, localizedTitle, rejectSubmission, useLang, useStore, type User } from "../store";
import { distanceMeters, formatDistance } from "../media";
import { Avatar, EmptyState, Modal, PageHeader, btnDanger, btnPrimary, btnSecondary, card, toast } from "../components/ui";
import { PhotoViewer } from "../components/PhotoViewer";
import { AiPanel } from "@/components/moderation/ai-panel";
import { isRejectionCode, REJECTION_CODES, REJECTION_REASONS, rejectionReasonText, type RejectionCode } from "@/lib/ai/decision";

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

  // Appeals first (a person must answer them), then oldest first.
  const pending = submissions
    .filter((s) => s.status === "pending")
    .sort((a, b) => Number(!!b.appealedAt) - Number(!!a.appealedAt) || a.submittedAt.localeCompare(b.submittedAt));
  const recentAuto = submissions
    .filter((s) => s.decidedBy === "ai" && s.reviewedAt)
    .sort((a, b) => (b.reviewedAt ?? "").localeCompare(a.reviewedAt ?? ""))
    .slice(0, 10);

  const openReject = (id: string) => {
    const sub = submissions.find((s) => s.id === id);
    const suggested = sub?.aiVerdict === "reject" && isRejectionCode(sub.aiReasonCode) ? sub.aiReasonCode : null;
    setRejecting(id);
    setReasonCode(suggested);
    setReason(suggested ? (rejectionReasonText(suggested, lang) ?? "") : "");
    setReasonError(null);
  };
  const pickCode = (code: RejectionCode) => {
    setReasonCode(code);
    setReason(rejectionReasonText(code, lang) ?? "");
  };

  const approve = (id: string) => {
    const result = approveSubmission(id);
    if (result.error) toast(errorText(lang, result.error), "error");
    else toast(`${t(lang, "status_approved")} ✓`);
  };

  const confirmReject = () => {
    if (!rejecting) return;
    const preset = reasonCode && reason.trim() === (rejectionReasonText(reasonCode, lang) ?? "").trim();
    const result = rejectSubmission(rejecting, reason, preset ? reasonCode : null);
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
          <textarea
            rows={4}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            autoFocus
            maxLength={500}
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
          {reasonError && <p className="mt-2 text-sm text-red-600">{reasonError}</p>}
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" className={btnSecondary} onClick={() => setRejecting(null)}>{t(lang, "cancel")}</button>
            <button type="button" className={btnDanger} onClick={confirmReject}>{t(lang, "confirm_rejection")}</button>
          </div>
        </Modal>
      )}
      {viewing && <PhotoViewer src={viewing} onClose={() => setViewing(null)} />}
    </>
  );
}
