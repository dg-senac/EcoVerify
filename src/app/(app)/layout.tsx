import { isSuspended } from "@/lib/cards";
import { moderatorsEnabled } from "@/lib/staff-config";
import { redirect } from "next/navigation";
import { eq, and, count } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { hasCommunity } from "@/lib/community";
import { AppShell } from "@/components/nav/app-shell";
import { EmailBanner } from "@/components/account/email-banner";
import { TERMS_VERSION } from "@/lib/legal";
import { isEmailVerificationRequired } from "@/lib/email";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.isBanned || user.deletedAt || isSuspended(user.suspendedUntil)) redirect("/login");
  // New version of the Terms/Privacy Policy (or an account created before they existed): ask for acceptance first.
  if (user.termsVersion !== TERMS_VERSION) redirect("/accept-terms");

  const [[{ value: unreadCount }], inOrganization] = await Promise.all([
    db
      .select({ value: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false))),
    user.role === "admin" ? Promise.resolve(false) : hasCommunity(user.id),
  ]);

  const showEmailBanner = !user.emailVerifiedAt && isEmailVerificationRequired();

  return (
    <AppShell user={{ name: user.name, email: user.email, role: user.role }} lang={user.language} unreadCount={unreadCount} moderatorsEnabled={moderatorsEnabled()} hasCommunity={inOrganization}>
      {showEmailBanner && <EmailBanner lang={user.language} email={user.email} />}
      {children}
    </AppShell>
  );
}
