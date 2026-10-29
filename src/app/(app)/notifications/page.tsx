import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { NotificationItem } from "@/components/notifications/notification-item";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read-button";
import { Bell } from "@/components/ui/icons";

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "notifications_title")}</h1>
        {rows.some((row) => !row.isRead) && <MarkAllReadButton lang={user.language} />}
      </div>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <Bell className="h-16 w-16 mx-auto" />
          <p className="mt-3 text-sm font-medium">{t(user.language, "notifications_empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((row) => (
            <NotificationItem key={row.id} lang={user.language} notification={row} />
          ))}
        </div>
      )}
    </div>
  );
}
