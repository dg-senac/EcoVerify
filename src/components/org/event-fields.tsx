"use client";

import { useState } from "react";
import { CalendarDays } from "lucide-react";
import type { Lang } from "@/lib/i18n";
import { EVENT_TEXT } from "@/lib/saas/events";

const field = "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100";

export interface EventWindowValue {
  isEvent: boolean;
  /** ISO strings, built in the browser's time zone (null while incomplete). */
  startsAt: string | null;
  endsAt: string | null;
}

function nextSaturday(): string {
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function toIso(date: string, time: string): string | null {
  if (!date || !time) return null;
  const value = new Date(`${date}T${time}`);
  return Number.isNaN(value.getTime()) ? null : value.toISOString();
}

/**
 * "It's an event" toggle + date and time. In forms it posts isEvent/startsAt/endsAt (ISO, converted
 * from the organizer's local time); the offline demo reads the values through onChange.
 */
export function EventFields({ lang, onChange }: { lang: Lang; onChange?: (value: EventWindowValue) => void }) {
  const text = EVENT_TEXT[lang];
  const [on, setOn] = useState(false);
  const [date, setDate] = useState(nextSaturday);
  const [start, setStart] = useState("08:00");
  const [end, setEnd] = useState("12:00");
  const startsAt = toIso(date, start);
  // Ending before the start means "past midnight" (e.g. 22:00 → 02:00).
  let endsAt = toIso(date, end);
  if (startsAt && endsAt && endsAt <= startsAt) endsAt = new Date(new Date(endsAt).getTime() + 86_400_000).toISOString();

  const update = (next: { on?: boolean; date?: string; start?: string; end?: string }) => {
    const v = { on, date, start, end, ...next };
    setOn(v.on);
    setDate(v.date);
    setStart(v.start);
    setEnd(v.end);
    if (onChange) {
      const s = toIso(v.date, v.start);
      let e = toIso(v.date, v.end);
      if (s && e && e <= s) e = new Date(new Date(e).getTime() + 86_400_000).toISOString();
      onChange({ isEvent: v.on, startsAt: s, endsAt: e });
    }
  };

  return (
    <div className={`rounded-xl border p-3 ${on ? "border-violet-200 bg-violet-50/60" : "border-slate-200 bg-white"}`} data-testid="event-fields">
      <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-700">
        <input type="checkbox" name="isEvent" checked={on} onChange={(e) => update({ on: e.target.checked })} className="h-4 w-4 accent-violet-600" data-testid="event-toggle" />
        <CalendarDays className="h-4 w-4 text-violet-600" /> {text.toggle}
      </label>
      {on && (
        <>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              {text.date}
              <input type="date" value={date} onChange={(e) => update({ date: e.target.value })} required className={field} data-testid="event-date" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              {text.start}
              <input type="time" value={start} onChange={(e) => update({ start: e.target.value })} required className={field} data-testid="event-start" />
            </label>
            <label className="grid gap-1 text-xs font-semibold text-slate-600">
              {text.end}
              <input type="time" value={end} onChange={(e) => update({ end: e.target.value })} required className={field} data-testid="event-end" />
            </label>
          </div>
          <input type="hidden" name="startsAt" value={startsAt ?? ""} />
          <input type="hidden" name="endsAt" value={endsAt ?? ""} />
          <p className="mt-2 text-xs text-slate-500">{text.hint}</p>
        </>
      )}
    </div>
  );
}
