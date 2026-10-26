import { useState } from "react";
import { Check, MapPin, Shield, X as XIcon, AlertTriangle, Navigation } from "lucide-react";
import { categoryEmoji, t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { dt, errorText } from "../i18n";
import { approveSubmission, localizedTitle, rejectSubmission, useLang, useStore, type User } from "../store";
import { distanceMeters, formatDistance } from "../media";
import { Avatar, EmptyState, Modal, PageHeader, btnDanger, btnPrimary, btnSecondary, card, toast } from "../components/ui";
import { PhotoViewer } from "../components/PhotoViewer";

export function ModerationScreen({ user }: { user: User }) {
  const lang = useLang();
  const submissions = useStore((s) => s.submissions);
  const missions = useStore((s) => s.missions);
  const users = useStore((s) => s.users);
  const [viewing, setViewing] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  const pending = submissions.filter((s) => s.status === "pending").sort((a, b) => a.submittedAt.localeCompare(b.submittedAt));

  const approve = (id: string) => {
    const result = approveSubmission(id);
    if (result.error) toast(errorText(lang, result.error), "error");
    else toast(`${t(lang, "status_approved")} ✓`);
  };

  const confirmReject = () => {
    if (!rejecting) return;
    const result = rejectSubmission(rejecting, reason);
    if (result.error) return setReasonError(errorText(lang, result.error));
    toast(t(lang, "status_rejected"));
    setRejecting(null);
    setReason("");
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
              <div key={sub.id} className={`${card} overflow-hidden animate-slide-up`}>
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
                      <button type="button" className={btnSecondary} onClick={() => setRejecting(sub.id)}>
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
