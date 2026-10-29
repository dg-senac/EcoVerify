"use client";

import { useTransition } from "react";
import { markAllNotificationsReadAction } from "@/lib/actions/notifications";
import { t, type Lang } from "@/lib/i18n";

export function MarkAllReadButton({ lang }: { lang: Lang }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => markAllNotificationsReadAction())}
      className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-60"
      data-testid="mark-all-read"
    >
      ✓✓ {t(lang, "mark_all_read")}
    </button>
  );
}
