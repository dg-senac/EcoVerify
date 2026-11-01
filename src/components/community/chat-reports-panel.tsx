"use client";

import { useState } from "react";
import { CARD_NOTE_MIN } from "@/lib/cards";
import { CHAT_MUTE_HOURS, chatModText, isChatMuted, isChatReportReason, type ChatReportItem } from "@/lib/chat-moderation";
import type { Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";

type Result = { error?: string } | void | undefined;

/**
 * Staff queue of reported / AI-stopped chat messages (web Moderation page and APK).
 * Moderators keep or remove (optionally with a yellow card); admins can also mute the author.
 */
export function ChatReportsPanel({
  lang,
  items,
  isAdmin,
  onKeep,
  onRemove,
  onMute,
}: {
  lang: Lang;
  items: ChatReportItem[];
  isAdmin: boolean;
  onKeep: (messageId: string) => Result | Promise<Result>;
  onRemove: (messageId: string, cardNote?: string) => Result | Promise<Result>;
  onMute: (userId: string, hours: number) => Result | Promise<Result>;
}) {
  const text = chatModText(lang);
  return (
    <section className="rounded-3xl border border-black/5 bg-white p-5 shadow-sm" data-chat-reports>
      <h2 className="text-lg font-bold text-slate-900">💬 {text.panelTitle}</h2>
      <p className="mt-1 text-sm text-slate-500">{text.panelHint}</p>
      {items.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-slate-50 p-4 text-center text-sm text-slate-500">{text.panelEmpty}</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3">
          {items.map((item) => (
            <ReportCard key={item.messageId} lang={lang} item={item} isAdmin={isAdmin} onKeep={onKeep} onRemove={onRemove} onMute={onMute} />
          ))}
        </div>
      )}
    </section>
  );
}

function ReportCard({
  lang,
  item,
  isAdmin,
  onKeep,
  onRemove,
  onMute,
}: {
  lang: Lang;
  item: ChatReportItem;
  isAdmin: boolean;
  onKeep: (messageId: string) => Result | Promise<Result>;
  onRemove: (messageId: string, cardNote?: string) => Result | Promise<Result>;
  onMute: (userId: string, hours: number) => Result | Promise<Result>;
}) {
  const text = chatModText(lang);
  const [showMedia, setShowMedia] = useState(false);
  const [carding, setCarding] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const muted = isChatMuted(item.authorMutedUntil);

  async function run(action: () => Result | Promise<Result>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result && result.error) setError(result.error === "card_note_short" ? text.cardNote : text.errorGeneric);
  }

  return (
    <article className="min-w-0 rounded-2xl border border-slate-200 p-4" data-chat-report={item.messageId}>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-900">{item.authorName}</span>
        <span className="text-slate-400">{formatDate(item.createdAt, lang)}</span>
        <span
          className={`rounded-full px-2 py-0.5 font-semibold ${
            item.hidden ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700"
          }`}
        >
          {item.hidden && item.hiddenReason ? text.hiddenBy[item.hiddenReason] : text.visible}
        </span>
        {item.reports.length > 0 && <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600">{text.reportsCount(item.reports.length)}</span>}
        {muted && item.authorMutedUntil && (
          <span className="rounded-full bg-slate-800 px-2 py-0.5 font-semibold text-white">🔇 {text.mutedUntil(formatDate(item.authorMutedUntil, lang))}</span>
        )}
      </div>

      {item.text && <p className="mt-2 break-words rounded-xl bg-slate-50 p-3 text-sm text-slate-800">{item.text}</p>}
      {item.mediaUrl && item.messageType !== "text" && (
        <div className="mt-2">
          {showMedia ? (
            item.messageType === "audio" ? (
              <audio src={item.mediaUrl} controls className="w-full" />
            ) : item.messageType === "video" ? (
              <video src={item.mediaUrl} controls className="max-h-64 max-w-full rounded-xl" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.mediaUrl} alt="" className="max-h-64 max-w-full rounded-xl" />
            )
          ) : (
            <button type="button" onClick={() => setShowMedia(true)} className="rounded-xl border border-dashed border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600">
              👁 {text.showMedia} ({item.messageType})
            </button>
          )}
        </div>
      )}

      {item.reports.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-slate-600">
          {item.reports.map((report, index) => (
            <li key={index} className="break-words">
              <span className="font-semibold text-red-600">{isChatReportReason(report.reason) ? text.reasons[report.reason] : report.reason}</span>
              {report.detail && <span> — “{report.detail}”</span>}
              <span className="text-slate-400"> · {report.reporterName}</span>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy}
          data-chat-keep
          onClick={() => run(() => onKeep(item.messageId))}
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 disabled:opacity-60"
        >
          ✓ {text.keep}
        </button>
        <button
          type="button"
          disabled={busy}
          data-chat-remove
          onClick={() => run(() => onRemove(item.messageId))}
          className="rounded-xl bg-red-500 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
        >
          🗑 {text.remove}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setCarding(!carding)}
          className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 disabled:opacity-60"
        >
          🟨 {text.yellowCard}
        </button>
      </div>

      {carding && (
        <div className="mt-2 grid grid-cols-1 gap-2">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder={text.cardNote}
            className="w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-amber-400"
          />
          <button
            type="button"
            disabled={busy || note.trim().length < CARD_NOTE_MIN}
            onClick={() => run(() => onRemove(item.messageId, note.trim()))}
            className="rounded-xl bg-amber-500 px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
          >
            {text.cardSend}
          </button>
        </div>
      )}

      {isAdmin && (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 text-xs">
          <span className="font-semibold text-slate-500">🔇 {text.mute}:</span>
          {CHAT_MUTE_HOURS.map((hours) => (
            <button
              key={hours}
              type="button"
              disabled={busy}
              data-chat-mute={hours}
              onClick={() => run(() => onMute(item.authorId, hours))}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
            >
              {text.muteFor(hours)}
            </button>
          ))}
          {muted && (
            <button
              type="button"
              disabled={busy}
              onClick={() => run(() => onMute(item.authorId, 0))}
              className="rounded-lg border border-slate-200 px-2 py-1 font-semibold text-slate-500 hover:bg-slate-50 disabled:opacity-60"
            >
              {text.unmute}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-xs font-medium text-red-500">{error}</p>}
    </article>
  );
}
