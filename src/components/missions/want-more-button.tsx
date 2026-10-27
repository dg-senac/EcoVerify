"use client";

import { useState, useTransition } from "react";
import { t, type Lang } from "@/lib/i18n";
import { requestMissionsHereAction } from "@/lib/actions/region";

/** "I want more missions here": demand signal per city, shown to admins. */
export function WantMoreButton({ lang, requested }: { lang: Lang; requested: boolean }) {
  const [done, setDone] = useState(requested);
  const [pending, startTransition] = useTransition();
  if (done) {
    return <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700" data-testid="want-more-done">{t(lang, "region_want_more_done")}</span>;
  }
  return (
    <button
      type="button"
      disabled={pending}
      data-testid="want-more"
      onClick={() =>
        startTransition(async () => {
          const result = await requestMissionsHereAction();
          if (result.success) setDone(true);
        })
      }
      className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:brightness-105 disabled:opacity-60"
    >
      🙋 {t(lang, "region_want_more")}
    </button>
  );
}
