import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { dumpText } from "@/lib/dumps";

export const DUMP_CTA_BUTTON = "shrink-0 rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700";

/** Small card on the missions screen that leads to the irregular-dumping report. */
export function DumpCta({ lang, action }: { lang: Lang; action: ReactNode }) {
  const text = dumpText(lang);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3" data-testid="dump-cta">
      <div className="min-w-0">
        <p className="text-sm font-bold text-orange-950">{text.cardTitle}</p>
        <p className="text-xs text-orange-900">{text.cardText}</p>
      </div>
      {action}
    </div>
  );
}
