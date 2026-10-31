"use client";

import { useState, useTransition } from "react";
import { getUserHistory } from "@/lib/actions/moderation";
import { formatDate } from "@/lib/utils";
import { t, type Lang } from "@/lib/i18n";

type HistoryRow = {
  id: string;
  status: string;
  report: string;
  submittedAt: Date;
  missionTitle: string;
  rejectionReason: string | null;
};

const statusStyles: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700",
  approved: "bg-emerald-50 text-emerald-700",
  rejected: "bg-red-50 text-red-700",
};

export function HistoryPanel({ lang, userId, userName }: { lang: Lang; userId: string; userName: string }) {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<HistoryRow[] | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpen() {
    setOpen(true);
    if (!rows) {
      startTransition(async () => {
        const data = await getUserHistory(userId);
        setRows(data);
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="font-semibold text-emerald-700 underline decoration-emerald-300 underline-offset-2 hover:text-emerald-800"
      >
        {userName}
      </button>

      {open && (
        <div className="fixed inset-0 z-[70]">
          <div className="absolute inset-0 bg-black/40 animate-fade-in" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-sm overflow-y-auto bg-white p-5 shadow-2xl animate-slide-up">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900">{t(lang, "user_history_title")}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="grid h-9 w-9 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>
            <p className="mb-4 text-sm text-slate-500">{userName}</p>

            {isPending && !rows && (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="skeleton h-20 rounded-xl" />
                ))}
              </div>
            )}

            {rows && rows.length === 0 && (
              <p className="text-sm text-slate-400">{t(lang, "no_history")}</p>
            )}

            <div className="space-y-3">
              {rows?.map((row) => (
                <div key={row.id} className="rounded-xl border border-black/5 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-800">{row.missionTitle}</p>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${statusStyles[row.status]}`}>
                      {row.status === "approved" ? t(lang, "status_approved") : row.status === "rejected" ? t(lang, "status_rejected") : t(lang, "status_pending")}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{formatDate(row.submittedAt, lang)}</p>
                  <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">{row.report}</p>
                  {row.rejectionReason && (
                    <p className="mt-1 text-xs font-medium text-red-500">Motivo: {row.rejectionReason}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
