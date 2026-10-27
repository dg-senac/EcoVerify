import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LoginForm } from "@/components/auth/login-form";
import { safeNextPath } from "@/lib/utils";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string; deleted?: string; next?: string }> }) {
  const params = await searchParams;
  const next = safeNextPath(params.next);
  const user = await getCurrentUser();
  if (user) redirect(next ?? "/missions");
  const notice = params.reset === "1" ? "reset" : params.deleted === "1" ? "deleted" : undefined;

  // Seed credentials are only shown outside production (or when explicitly enabled for a demo server).
  const showDemoAccounts = process.env.NODE_ENV !== "production" || process.env.SHOW_SEED_ACCOUNTS === "1";

  return <LoginForm lang="pt" notice={notice} showDemoAccounts={showDemoAccounts} next={next} />;
}
