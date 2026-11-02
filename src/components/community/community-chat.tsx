"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sendMessageAction, unblockChatUserAction, type ActionState } from "@/lib/actions/community";
import { chatModText, isChatMuted, type ChatSendIssue } from "@/lib/chat-moderation";
import { t, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { BlockedList } from "./blocked-list";
import { MessageActions } from "./message-actions";
import { MediaUpload } from "./media-upload";
import { MessageSquare, Star, X, MoreVertical, Send } from "@/components/ui/icons";

const initialState: ActionState = {};

export function CommunityChat({
  lang,
  organizationId,
  messages,
  currentUserId,
  currentUserName,
  favoriteMessageIds,
  blocked,
  chatMutedUntil,
  adult,
  onChanged,
}: {
  lang: Lang;
  /** The organization whose community chat this is (each organization has its own). */
  organizationId: string;
  messages: Array<{
    id: string;
    message: string | null;
    messageType: string;
    mediaUrl: string | null;
    replyToId: string | null;
    replyToMessage: string | null;
    userId: string;
    userName: string | null;
    createdAt: Date;
    editedAt: Date | null;
    deletedAt: Date | null;
    deleteForEveryone: boolean | null;
    hidden?: boolean;
    checking?: boolean;
  }>;
  currentUserId: string;
  currentUserName: string;
  favoriteMessageIds: Set<string>;
  blocked: { id: string; name: string }[];
  chatMutedUntil: string | null;
  adult: boolean;
  onChanged: () => void;
}) {
  const mod = chatModText(lang);
  const muted = isChatMuted(chatMutedUntil);
  const [state, formAction, pending] = useActionState(sendMessageAction, initialState);
  const [messageText, setMessageText] = useState("");
  const [showActionsFor, setShowActionsFor] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"image" | "audio" | "video" | "gif" | null>(null);
  const [replyTo, setReplyTo] = useState<{ id: string; message: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Show the new message right after sending (instead of waiting for the next refresh).
  const lastState = useRef(state);
  useEffect(() => {
    if (state === lastState.current) return;
    lastState.current = state;
    if (!state.error) onChanged();
  }, [state, onChanged]);

  const handleMediaUploaded = (url: string, type: "image" | "audio" | "video" | "gif") => {
    setMediaUrl(url);
    setMediaType(type);
  };

  const clearMedia = () => {
    setMediaUrl(null);
    setMediaType(null);
  };

  const handleReply = (messageId: string, message: string) => {
    setReplyTo({ id: messageId, message });
  };

  const clearReply = () => {
    setReplyTo(null);
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    if (!messageText.trim() && !mediaUrl) {
      e.preventDefault();
      return;
    }
    setMessageText("");
    clearMedia();
    clearReply();
  };

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filtrar mensagens deletadas para o usuário atual
  const visibleMessages = messages.filter((msg) => {
    if (!msg.deletedAt) return true;
    if (msg.deleteForEveryone) return false;
    if (msg.userId === currentUserId) return false;
    return true;
  });

  const renderMedia = (msg: typeof messages[0]) => {
    if (!msg.mediaUrl) {
      return msg.checking ? <p className="mb-2 text-xs italic opacity-80">{mod.checkingImage}</p> : null;
    }

    switch (msg.messageType) {
      case "image":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.mediaUrl}
            alt="Imagem"
            className="max-w-full rounded-lg mb-2"
          />
        );
      case "audio":
        return (
          <audio
            src={msg.mediaUrl}
            controls
            className="w-full mb-2"
          />
        );
      case "video":
        return (
          <video
            src={msg.mediaUrl}
            controls
            className="max-w-full rounded-lg mb-2"
          />
        );
      case "gif":
        return (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={msg.mediaUrl}
            alt="GIF"
            className="max-w-full rounded-lg mb-2"
          />
        );
      default:
        return null;
    }
  };

  return (
    <>
    <div className="mt-6 bg-white rounded-3xl border border-black/5 shadow-sm overflow-hidden">
      <div className="h-[500px] flex flex-col">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {visibleMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-400">
              <MessageSquare className="h-12 w-12 mb-3" />
              <p className="text-sm font-medium">{t(lang, "chat_empty")}</p>
            </div>
          ) : (
            visibleMessages.map((msg) => {
              const isOwnMessage = msg.userId === currentUserId;
              const isFavorited = favoriteMessageIds.has(msg.id);
              const isEdited = !!msg.editedAt;

              return (
                <div
                  key={msg.id}
                  className={`flex ${isOwnMessage ? "justify-end" : "justify-start"} relative`}
                >
                  <div
                    className={`max-w-[70%] rounded-2xl px-4 py-2 ${
                      isOwnMessage
                        ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white"
                        : "bg-slate-100 text-slate-900"
                    }`}
                  >
                    {!isOwnMessage && (
                      <p className="text-xs font-semibold mb-1 opacity-75">
                        {msg.userName || t(lang, "user_fallback")}
                      </p>
                    )}
                    {msg.replyToMessage && (
                      <div className="mb-2 p-2 bg-black/10 rounded-lg text-xs opacity-75">
                        <p className="font-semibold">{t(lang, "chat_reply_to")}:</p>
                        <p className="truncate">{msg.replyToMessage}</p>
                      </div>
                    )}
                    {msg.hidden && isOwnMessage && (
                      <p className="mb-2 rounded-lg bg-black/20 px-2 py-1 text-xs font-semibold">{mod.hiddenOwn}</p>
                    )}
                    {msg.checking && isOwnMessage && msg.mediaUrl && (
                      <p className="mb-1 text-xs italic opacity-80">{mod.checkingImage}</p>
                    )}
                    {renderMedia(msg)}
                    {msg.message && (
                      <p className="text-sm break-words">{msg.message}</p>
                    )}
                    <div className="flex items-center justify-between mt-1">
                      <p
                        className={`text-xs ${
                          isOwnMessage ? "text-white/70" : "text-slate-500"
                        }`}
                      >
                        {formatTime(msg.createdAt)}
                        {isEdited && (
                          <span className="ml-1">({t(lang, "chat_edited")})</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2">
                        {isFavorited && (
                          <Star className="h-3 w-3" />
                        )}
                        <button
                          onClick={() => handleReply(msg.id, msg.message || "")}
                          className="text-xs opacity-50 hover:opacity-100"
                          title={t(lang, "chat_reply")}
                        >
                          ↩️
                        </button>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowActionsFor(showActionsFor === msg.id ? null : msg.id)}
                    className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>
                  {showActionsFor === msg.id && (
                    <MessageActions
                      lang={lang}
                      messageId={msg.id}
                      isOwnMessage={isOwnMessage}
                      isEdited={isEdited}
                      isFavorited={isFavorited}
                      authorId={msg.userId}
                      authorName={msg.userName || t(lang, "user_fallback")}
                      onClose={() => setShowActionsFor(null)}
                      onChanged={onChanged}
                    />
                  )}
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {muted && chatMutedUntil ? (
          <p className="border-t border-slate-100 bg-slate-50 p-4 text-sm font-medium text-slate-600" data-chat-muted>
            🔇 {mod.mutedBanner(formatDate(chatMutedUntil, lang))}
          </p>
        ) : (
        <form
          ref={formRef}
          onSubmit={handleSubmit}
          action={formAction}
          className="border-t border-slate-100 p-4"
        >
          <input type="hidden" name="organizationId" value={organizationId} />
          {replyTo && (
            <div className="mb-2 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold">{t(lang, "chat_reply_to")}:</span>
                <span className="ml-1 truncate">{replyTo.message}</span>
              </div>
              <button
                type="button"
                onClick={clearReply}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {mediaUrl && (
            <div className="mb-2 p-2 bg-slate-50 rounded-lg flex items-center justify-between">
              <div className="text-xs">
                <span className="font-semibold">{mediaType}:</span>
                <span className="ml-1 truncate">{mediaUrl}</span>
              </div>
              <button
                type="button"
                onClick={clearMedia}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          <div className="flex gap-2 items-center">
            <MediaUpload
              lang={lang}
              onMediaUploaded={handleMediaUploaded}
              allowAudioVideo={adult}
            />
            <input
              type="hidden"
              name="messageType"
              value={mediaType || "text"}
            />
            <input
              type="hidden"
              name="mediaUrl"
              value={mediaUrl || ""}
            />
            <input
              type="hidden"
              name="replyToId"
              value={replyTo?.id || ""}
            />
            <input
              type="hidden"
              name="replyToMessage"
              value={replyTo?.message || ""}
            />
            <input
              type="text"
              name="message"
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder={t(lang, "chat_placeholder")}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              maxLength={1000}
            />
            <button
              type="submit"
              disabled={pending || (!messageText.trim() && !mediaUrl)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {pending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <span>{t(lang, "chat_send")}</span>
              )}
            </button>
          </div>
          {state.error === "empty_message" && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {t(lang, "chat_error_empty")}
            </p>
          )}
          {state.error === "message_too_long" && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {t(lang, "chat_error_long")}
            </p>
          )}
          {state.error === "too_many_messages" && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {t(lang, "error_too_many_attempts")}
            </p>
          )}
          {(state.error === "invalid" || state.error === "not_member") && (
            <p className="mt-2 text-xs font-medium text-red-500">
              {t(lang, "error_generic")}
            </p>
          )}
          {state.error && state.error in mod.errors && (
            <p className="mt-2 text-xs font-medium text-red-500" data-chat-error>
              {mod.errors[state.error as ChatSendIssue]}
            </p>
          )}
          <p className="mt-2 text-[11px] text-slate-400">🛡️ {mod.safetyNote}</p>
        </form>
        )}
      </div>
    </div>
      <BlockedList
        lang={lang}
        blocked={blocked}
        onUnblock={async (id) => {
          await unblockChatUserAction(id);
          onChanged();
        }}
      />
    </>
  );
}
