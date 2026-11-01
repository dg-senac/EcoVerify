"use client";

import { useState } from "react";
import { chatModText } from "@/lib/chat-moderation";
import type { Lang } from "@/lib/i18n";

/** "Blocked people (n)" with an unblock button for each one (web and APK). */
export function BlockedList({
  lang,
  blocked,
  onUnblock,
}: {
  lang: Lang;
  blocked: { id: string; name: string }[];
  onUnblock: (id: string) => void | Promise<unknown>;
}) {
  const text = chatModText(lang);
  const [open, setOpen] = useState(false);
  if (blocked.length === 0) return null;
  return (
    <div className="mt-3 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm" data-blocked-list>
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left font-semibold text-slate-600">
        🚫 {text.blockedTitle(blocked.length)} {open ? "▴" : "▾"}
      </button>
      {open && (
        <ul className="mt-2 space-y-1">
          {blocked.map((person) => (
            <li key={person.id} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-slate-700">{person.name}</span>
              <button
                type="button"
                onClick={() => onUnblock(person.id)}
                className="shrink-0 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {text.unblock}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
