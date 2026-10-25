import { redirect } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { AppShell } from "@/components/nav/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned) redirect("/login");

  const [{ value: unreadCount }] = await db
    .select({ value: count() })
    .from(notifications)
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} lang={user.language} unreadCount={unreadCount}>
      {children}
    </AppShell>
  );
}
