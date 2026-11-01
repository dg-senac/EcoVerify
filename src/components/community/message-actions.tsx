"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  editMessageAction,
  deleteMessageAction,
  toggleFavoriteAction,
  reportMessageAction,
  blockChatUserAction,
  type ActionState,
} from "@/lib/actions/community";
import { chatModText } from "@/lib/chat-moderation";
import { ReportReasonDialog } from "./report-reason-dialog";
import { t, type Lang } from "@/lib/i18n";
import { Edit, Trash2, Star, AlertTriangle } from "@/components/ui/icons";

interface MessageActionsProps {
  lang: Lang;
  messageId: string;
  isOwnMessage: boolean;
  isEdited: boolean;
  isFavorited: boolean;
  authorId: string;
  authorName: string;
  onClose: () => void;
  /** Called after a block, so the chat refreshes at once. */
  onChanged?: () => void;
}

export function MessageActions({
  lang,
  messageId,
  isOwnMessage,
  isEdited,
  isFavorited,
  authorId,
  authorName,
  onClose,
  onChanged,
}: MessageActionsProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  const [editState, editFormAction, editPending] = useActionState(editMessageAction, {});
  const [deleteState, deleteFormAction, deletePending] = useActionState(deleteMessageAction, {});
  const [favoriteState, favoriteFormAction, favoritePending] = useActionState(toggleFavoriteAction, {});
  const mod = chatModText(lang);

  async function block() {
    if (!window.confirm(mod.blockConfirm(authorName))) return;
    await blockChatUserAction(authorId);
    onClose();
    onChanged?.();
  }

  const handleFavorite = () => {
    const formData = new FormData();
    formData.append("messageId", messageId);
    favoriteFormAction(formData);
    onClose();
  };

  return (
    <>
      <div className="absolute right-2 top-2 bg-white rounded-lg shadow-lg border border-slate-200 py-1 z-10">
        {isOwnMessage && !isEdited && (
          <button
            onClick={() => setShowEditModal(true)}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Edit className="h-4 w-4" /> {t(lang, "chat_edit")}
          </button>
        )}
        {isOwnMessage && (
          <button
            onClick={() => setShowDeleteModal(true)}
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" /> {t(lang, "chat_delete")}
          </button>
        )}
        <button
          onClick={handleFavorite}
          disabled={favoritePending}
          className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2 disabled:opacity-50"
        >
          <Star className={`h-4 w-4 ${isFavorited ? "fill-amber-400 text-amber-400" : ""}`} /> {isFavorited ? t(lang, "chat_unfavorite") : t(lang, "chat_favorite")}
        </button>
        {!isOwnMessage && (
          <button
            onClick={() => setShowReportModal(true)}
            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
          >
            <AlertTriangle className="h-4 w-4" /> {t(lang, "chat_report")}
          </button>
        )}
        {!isOwnMessage && (
          <button
            onClick={block}
            data-chat-block
            className="w-full px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2"
          >
            🚫 {mod.block}
          </button>
        )}
      </div>

      {showEditModal && (
        <EditModal
          lang={lang}
          messageId={messageId}
          onClose={() => setShowEditModal(false)}
          state={editState}
          pending={editPending}
          formAction={editFormAction}
        />
      )}

      {showDeleteModal && (
        <DeleteModal
          lang={lang}
          messageId={messageId}
          onClose={() => setShowDeleteModal(false)}
          state={deleteState}
          pending={deletePending}
          formAction={deleteFormAction}
        />
      )}

      {showReportModal && (
        <ReportReasonDialog
          lang={lang}
          onClose={() => {
            setShowReportModal(false);
            onClose();
            onChanged?.();
          }}
          onSubmit={async (reason, detail) => {
            const formData = new FormData();
            formData.append("messageId", messageId);
            formData.append("reasonCode", reason);
            formData.append("reason", detail);
            const result = await reportMessageAction({}, formData);
            return result.error;
          }}
        />
      )}
    </>
  );
}

function EditModal({
  lang,
  messageId,
  onClose,
  state,
  pending,
  formAction,
}: {
  lang: Lang;
  messageId: string;
  onClose: () => void;
  state: ActionState;
  pending: boolean;
  formAction: (formData: FormData) => void;
}) {
  const [messageText, setMessageText] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    const formData = new FormData();
    formData.append("messageId", messageId);
    formData.append("message", messageText);
    formAction(formData);
    if (!state.error) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{t(lang, "chat_edit_title")}</h3>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="messageId" value={messageId} />
          <textarea
            name="message"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            rows={4}
            maxLength={1000}
            placeholder={t(lang, "chat_edit_placeholder")}
          />
          {state.error === "already_edited" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_already_edited")}</p>
          )}
          {state.error === "not_owner" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_not_owner")}</p>
          )}
          {state.error === "not_found" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_not_found")}</p>
          )}
          {state.error === "message_too_long" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_long")}</p>
          )}
          {(state.error === "contact_info" || state.error === "link") && (
            <p className="mt-2 text-xs font-medium text-red-500">{chatModText(lang).errors[state.error]}</p>
          )}
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t(lang, "cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {pending ? "..." : t(lang, "chat_save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DeleteModal({
  lang,
  messageId,
  onClose,
  state,
  pending,
  formAction,
}: {
  lang: Lang;
  messageId: string;
  onClose: () => void;
  state: ActionState;
  pending: boolean;
  formAction: (formData: FormData) => void;
}) {
  const [deleteForEveryone, setDeleteForEveryone] = useState(false);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.append("messageId", messageId);
    formData.append("deleteForEveryone", deleteForEveryone ? "true" : "false");
    formAction(formData);
    if (!state.error) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-slate-900 mb-4">{t(lang, "chat_delete_title")}</h3>
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="messageId" value={messageId} />
          <label className="flex items-center gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={deleteForEveryone}
              onChange={(e) => setDeleteForEveryone(e.target.checked)}
              className="accent-emerald-600"
            />
            <span className="text-sm text-slate-700">{t(lang, "chat_delete_for_everyone")}</span>
          </label>
          {state.error === "not_owner" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_not_owner")}</p>
          )}
          {state.error === "not_found" && (
            <p className="mt-2 text-xs font-medium text-red-500">{t(lang, "chat_error_not_found")}</p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              {t(lang, "cancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="flex-1 rounded-xl bg-red-500 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70"
            >
              {pending ? "..." : t(lang, "chat_delete_confirm")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
