import type { Lang } from "@/lib/i18n";
import { EVENT_TEXT, eventPhase, formatEventWindow, type EventLike } from "@/lib/saas/events";

const PHASE_STYLE = {
  upcoming: "bg-violet-50 text-violet-700",
  open: "bg-emerald-50 text-emerald-700",
  closed: "bg-slate-100 text-slate-500",
} as const;

/** "🎪 Event · Sat, 08:00–12:00 · Happening now" (renders nothing for regular missions). */
export function EventBadge({ lang, mission, now }: { lang: Lang; mission: EventLike; now?: Date }) {
  const phase = eventPhase(mission, now);
  if (!phase) return null;
  const text = EVENT_TEXT[lang];
  return (
    <p className={`mt-1 inline-flex w-fit flex-wrap items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold ${PHASE_STYLE[phase]}`} data-testid="event-badge">
      🎪 {text.badge} · {formatEventWindow(mission, lang)} · <span className="font-bold">{text[phase]}</span>
    </p>
  );
}
