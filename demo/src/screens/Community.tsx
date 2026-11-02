import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Ban, Flag, MessageSquare, Reply, Send, Trash2, X } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { chatModText, isChatMuted, type ChatSendIssue } from "@/lib/chat-moderation";
import { formatDate } from "@/lib/utils";
import { BlockedList } from "@/components/community/blocked-list";
import { ReportReasonDialog } from "@/components/community/report-reason-dialog";
import { dt, errorText } from "../i18n";
import { blockChatUser, deleteChatMessage, myOrgs, reportChatMessage, sendChatMessage, unblockChatUser, useLang, useStore, type User } from "../store";
import { Link } from "../router";
import { Avatar, EmptyState, PageHeader, card, toast } from "../components/ui";

function timeLabel(iso: string, lang: string) {
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale, sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

/**
 * Community = the chat of an organization (each one has its own, only for its members), like the
 * real app. People in no organization are invited to join or create one.
 */
export function CommunityScreen({ user }: { user: User }) {
  const lang = useLang();
  const orgs = useStore((s) => s.orgs);
  const orgMembers = useStore((s) => s.orgMembers);
  const communities = useMemo(
    () => myOrgs({ orgs, orgMembers } as Parameters<typeof myOrgs>[0], user.id).map((x) => x.org).sort((a, b) => a.name.localeCompare(b.name)),
    [orgs, orgMembers, user.id],
  );
  const [picked, setPicked] = useState<string | null>(null);
  const current = communities.find((o) => o.id === picked) ?? communities[0] ?? null;
  const allChat = useStore((s) => s.chat);
  const users = useStore((s) => s.users);
  const blocks = useStore((s) => s.chatBlocks);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [reporting, setReporting] = useState<string | null>(null);
  const mod = chatModText(lang);
  const blockedIds = new Set((blocks ?? []).filter((b) => b.blockerId === user.id).map((b) => b.blockedId));
  // Same as the server: hidden messages only reach their author; blocked people disappear.
  const chat = allChat.filter((m) => !!current && m.orgId === current.id && !blockedIds.has(m.userId) && (!m.hiddenAt || m.userId === user.id));
  const mutedUntil = users.find((u) => u.id === user.id)?.chatMutedUntil ?? null;
  const muted = isChatMuted(mutedUntil);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length]);

  if (user.role === "admin") return <EmptyState emoji="💬" text={dt(lang, "community_citizens_only")} />;
  if (!current) {
    return (
      <div className="flex flex-col">
        <PageHeader title={t(lang, "nav_community")} icon={MessageSquare} />
        <div className={`${card} flex flex-col items-center gap-3 px-6 py-12 text-center animate-fade-in`} data-testid="community-no-org">
          <span className="text-5xl">💬</span>
          <h2 className="text-lg font-bold text-slate-900">{t(lang, "community_no_org_title")}</h2>
          <p className="max-w-md text-sm text-slate-500">{t(lang, "community_no_org_text")}</p>
          <Link to="/org" className="mt-2 inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md">
            {t(lang, "community_no_org_cta")}
          </Link>
        </div>
      </div>
    );
  }

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const replyMessage = replyTo ? chat.find((m) => m.id === replyTo) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = sendChatMessage(text, replyTo, current.id);
    if (result.error) return toast(result.error in mod.errors ? mod.errors[result.error as ChatSendIssue] : errorText(lang, result.error), "error");
    setText("");
    setReplyTo(null);
  };

  return (
    <div className="flex flex-col">
      <PageHeader title={t(lang, "nav_community")} subtitle={tf(lang, "community_subtitle", { org: current.name })} icon={MessageSquare} />
      {communities.length > 1 && (
        <nav aria-label={t(lang, "community_pick")} className="-mt-3 mb-4 flex gap-2 overflow-x-auto pb-1" data-testid="community-switch">
          {communities.map((org) => {
            const active = org.id === current.id;
            return (
              <button
                key={org.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => {
                  setPicked(org.id);
                  setReplyTo(null);
                }}
                className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  active ? "bg-emerald-600 text-white shadow-sm" : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                }`}
              >
                {org.name}
              </button>
            );
          })}
        </nav>
      )}
      <div className={`${card} flex min-h-[50vh] flex-col`}>
        <div className="flex-1 space-y-3 overflow-y-auto p-4">
          {chat.length === 0 && <p className="py-10 text-center text-sm text-slate-400">{t(lang, "chat_empty")}</p>}
          {chat.map((msg) => {
            const mine = msg.userId === user.id;
            const quoted = msg.replyToId ? chat.find((m) => m.id === msg.replyToId) : null;
            return (
              <div key={msg.id} className={`flex gap-2 animate-fade-in ${mine ? "flex-row-reverse" : ""}`}>
                {!mine && <Avatar name={nameOf(msg.userId)} size={32} />}
                <div className={`group max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!mine && <span className="mb-0.5 text-xs font-semibold text-slate-500">{nameOf(msg.userId)}</span>}
                  <div className={`rounded-2xl px-3.5 py-2 text-sm ${mine ? "rounded-tr-sm bg-emerald-500 text-white" : "rounded-tl-sm bg-slate-100 text-slate-800"}`}>
                    {quoted && (
                      <div className={`mb-1.5 rounded-lg border-l-4 px-2 py-1 text-xs ${mine ? "border-white/60 bg-white/15" : "border-emerald-400 bg-white"}`}>
                        <b>{nameOf(quoted.userId)}</b>
                        <p className="line-clamp-1 opacity-80">{quoted.deleted ? dt(lang, "message_deleted") : quoted.message}</p>
                      </div>
                    )}
                    {mine && msg.hiddenAt && !msg.deleted && <p className="mb-1 rounded-lg bg-black/20 px-2 py-0.5 text-xs font-semibold">{mod.hiddenOwn}</p>}
                    {msg.deleted ? <i className="opacity-70">{dt(lang, "message_deleted")}</i> : <span className="whitespace-pre-wrap break-words">{msg.message}</span>}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{timeLabel(msg.createdAt, lang)}</span>
                    {!msg.deleted && (
                      <button type="button" onClick={() => setReplyTo(msg.id)} className="flex items-center gap-0.5 hover:text-emerald-600">
                        <Reply className="h-3 w-3" /> {t(lang, "chat_reply")}
                      </button>
                    )}
                    {mine && !msg.deleted && (
                      <button type="button" onClick={() => deleteChatMessage(msg.id)} className="flex items-center gap-0.5 hover:text-red-600">
                        <Trash2 className="h-3 w-3" /> {t(lang, "chat_delete")}
                      </button>
                    )}
                    {!mine && !msg.deleted && (
                      <button type="button" data-chat-report={msg.id} onClick={() => setReporting(msg.id)} className="flex items-center gap-0.5 hover:text-red-600">
                        <Flag className="h-3 w-3" /> {t(lang, "chat_report")}
                      </button>
                    )}
                    {!mine && (
                      <button
                        type="button"
                        data-chat-block={msg.userId}
                        onClick={() => {
                          if (window.confirm(mod.blockConfirm(nameOf(msg.userId)))) blockChatUser(msg.userId);
                        }}
                        className="flex items-center gap-0.5 hover:text-slate-700"
                        aria-label={mod.block}
                        title={mod.block}
                      >
                        <Ban className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
        {muted && mutedUntil ? (
          <p className="border-t border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-600" data-chat-muted>
            🔇 {mod.mutedBanner(formatDate(mutedUntil, lang))}
          </p>
        ) : (
        <form onSubmit={submit} className="border-t border-slate-100 p-3">
          {replyMessage && (
            <div className="mb-2 flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              <Reply className="h-3.5 w-3.5 shrink-0" />
              <span className="min-w-0 flex-1 truncate">
                {t(lang, "chat_reply_to")} <b>{nameOf(replyMessage.userId)}</b>: {replyMessage.message}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label={t(lang, "cancel")}><X className="h-4 w-4" /></button>
            </div>
          )}
          <div className="flex gap-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              maxLength={1000}
              placeholder={t(lang, "chat_placeholder")}
              className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
            <button type="submit" disabled={!text.trim()} aria-label={t(lang, "chat_send")} className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white disabled:opacity-50">
              <Send className="h-5 w-5" />
            </button>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">🛡️ {mod.safetyNote}</p>
        </form>
        )}
      </div>
      <BlockedList
        lang={lang}
        blocked={[...blockedIds].map((id) => ({ id, name: nameOf(id) }))}
        onUnblock={(id) => unblockChatUser(id)}
      />
      {reporting && (
        <ReportReasonDialog
          lang={lang}
          onClose={() => setReporting(null)}
          onSubmit={(reason, detail) => reportChatMessage(reporting, reason, detail).error}
        />
      )}
    </div>
  );
}
