import { redirect } from "next/navigation";
import { getCurrentUser, takeBlockedSessionUserId } from "@/lib/auth";
import { createAuthToken } from "@/lib/auth-tokens";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/utils";
import { seedAccountsAllowed } from "@/lib/staff-config";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; deleted?: string; next?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const user = await getCurrentUser();
  if (user) redirect(next ?? "/missions");
  // Suspended/blocked while logged in: show the reason and the appeal form, not a silent logout.
  const blockedUserId = await takeBlockedSessionUserId();
  if (blockedUserId) redirect(`/conta-bloqueada?t=${await createAuthToken(blockedUserId, "ban_appeal")}`);
  const notice = params.reset === "1" ? "reset" : params.deleted === "1" ? "deleted" : undefined;

  // Seed credentials are only shown outside production (or when explicitly enabled for a demo server).
  const showDemoAccounts = seedAccountsAllowed() && (process.env.NODE_ENV !== "production" || process.env.SHOW_SEED_ACCOUNTS === "1");

  return <LoginForm lang="pt" notice={notice} showDemoAccounts={showDemoAccounts} next={next} />;
}
