import { useEffect, useRef, useState, type FormEvent } from "react";
import { MessageSquare, Reply, Send, Trash2, X } from "lucide-react";
import { t } from "@/lib/i18n";
import { dt, errorText } from "../i18n";
import { deleteChatMessage, sendChatMessage, useLang, useStore, type User } from "../store";
import { Avatar, EmptyState, PageHeader, card, toast } from "../components/ui";

function timeLabel(iso: string, lang: string) {
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const date = new Date(iso);
  const sameDay = date.toDateString() === new Date().toDateString();
  return new Intl.DateTimeFormat(locale, sameDay ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function CommunityScreen({ user }: { user: User }) {
  const lang = useLang();
  const chat = useStore((s) => s.chat);
  const users = useStore((s) => s.users);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.length]);

  if (user.role !== "citizen") return <EmptyState emoji="💬" text={dt(lang, "community_citizens_only")} />;

  const nameOf = (id: string) => users.find((u) => u.id === id)?.name ?? "—";
  const replyMessage = replyTo ? chat.find((m) => m.id === replyTo) : null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = sendChatMessage(text, replyTo);
    if (result.error) return toast(errorText(lang, result.error), "error");
    setText("");
    setReplyTo(null);
  };

  return (
    <div className="flex flex-col">
      <PageHeader title={t(lang, "nav_community")} subtitle={dt(lang, "community_subtitle")} icon={MessageSquare} />
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
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
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
        </form>
      </div>
    </div>
  );
}
