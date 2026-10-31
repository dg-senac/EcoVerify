import Link from "next/link";
import { eq, isNull, and } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeAuthToken } from "@/lib/auth-tokens";
import { getCurrentUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";
import { promoteOwnerIfNeeded } from "@/lib/admin-bootstrap";
import { t } from "@/lib/i18n";

export const metadata = { referrer: "no-referrer" as const };

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const current = await getCurrentUser();
  const lang = await guestLang(null, current);

  let ok = false;
  if (token.length > 0 && token.length <= 128) {
    const userId = await consumeAuthToken(token, "verify_email");
    if (userId) {
      const [verified] = await db
        .update(users)
        .set({ emailVerifiedAt: new Date() })
        .where(and(eq(users.id, userId), isNull(users.emailVerifiedAt)))
        .returning();
      // ADMIN_EMAILS: the owner becomes admin right after confirming the e-mail.
      if (verified) await promoteOwnerIfNeeded(verified);
      ok = true;
    }
  } else if (current?.emailVerifiedAt) {
    ok = true;
  }

  return (
    <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface">
      <div className="mb-3 text-5xl">{ok ? "✅" : "⏳"}</div>
      <h1 className="text-xl font-bold text-slate-900">{t(lang, ok ? "verify_ok_title" : "verify_fail_title")}</h1>
      <p className="mt-2 text-sm text-slate-500">{t(lang, ok ? "verify_ok_text" : "verify_fail_text")}</p>
      <Link
        href={current ? (ok ? "/profile" : "/settings") : "/login"}
        className="mt-6 inline-flex rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white"
      >
        {current ? t(lang, "go_to_app") : t(lang, "back_to_login")}
      </Link>
    </div>
  );
}
