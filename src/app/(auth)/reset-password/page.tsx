import Link from "next/link";
import { ResetPasswordForm } from "@/components/auth/account-forms";
import { peekAuthToken } from "@/lib/auth-tokens";
import { getCurrentUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";
import { t } from "@/lib/i18n";

export const metadata = { referrer: "no-referrer" as const };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const lang = await guestLang(null, await getCurrentUser());
  const valid = token.length > 0 && token.length <= 128 && (await peekAuthToken(token, "reset_password"));

  if (!valid) {
    return (
      <div className="rounded-3xl border border-black/5 bg-white p-8 text-center shadow-[0_20px_50px_rgba(16,24,40,0.08)] card-surface">
        <div className="mb-3 text-4xl">⏳</div>
        <p className="text-sm text-slate-600">{t(lang, "reset_invalid")}</p>
        <Link href="/forgot-password" className="mt-5 inline-block text-sm font-semibold text-emerald-600 hover:underline">
          {t(lang, "forgot_title")}
        </Link>
      </div>
    );
  }
  return <ResetPasswordForm lang={lang} token={token} />;
}
