import { Bell, CheckCheck } from "lucide-react";
import { t } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { dt } from "../i18n";
import { markAllNotificationsRead, markNotificationRead, useLang, useStore, type User } from "../store";
import { EmptyState, PageHeader, btnSecondary, card } from "../components/ui";

export function NotificationsScreen({ user }: { user: User }) {
  const lang = useLang();
  const all = useStore((s) => s.notifications);
  const mine = all.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unread = mine.some((n) => !n.isRead);

  return (
    <>
      <PageHeader
        title={t(lang, "notifications_title")}
        icon={Bell}
        action={
          unread ? (
            <button type="button" className={btnSecondary} onClick={markAllNotificationsRead}>
              <CheckCheck className="h-4 w-4" /> {dt(lang, "mark_all_read")}
            </button>
          ) : undefined
        }
      />
      {mine.length === 0 ? (
        <EmptyState emoji="🔔" text={t(lang, "notifications_empty")} />
      ) : (
        <div className="grid gap-2.5">
          {mine.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => !n.isRead && markNotificationRead(n.id)}
              className={`${card} flex gap-3 p-4 text-left animate-slide-up ${n.isRead ? "" : "ring-2 ring-emerald-200"}`}
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${n.isRead ? "bg-slate-200" : "bg-emerald-500"}`} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-bold text-slate-900">{n.title}</h3>
                  {!n.isRead && <span className="rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">{t(lang, "new_label")}</span>}
                </div>
                <p className="mt-0.5 text-sm text-slate-600">{n.message}</p>
                <p className="mt-1 text-xs text-slate-400">{formatDate(n.createdAt, lang)}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
