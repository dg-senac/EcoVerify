import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { peekAuthTokenUser } from "@/lib/auth-tokens";
import { getLegalInfo } from "@/lib/legal-config";
import { t, tf } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { BanAppealForm } from "@/components/auth/ban-appeal-form";

export const metadata = { referrer: "no-referrer" as const, robots: { index: false } };
export const dynamic = "force-dynamic";

const box = "card-surface rounded-3xl border border-black/5 bg-white p-7 shadow-[0_20px_50px_rgba(16,24,40,0.08)]";

/** "douglas@gmail.com" → "d•••s@gmail.com" (the page is reachable only with the short-lived token). */
function maskEmail(email: string) {
  const [local, domain] = email.split("@");
  if (!domain) return "•••";
  const visible = local.length <= 2 ? local[0] ?? "" : `${local[0]}•••${local[local.length - 1]}`;
  return `${visible}@${domain}`;
}

/**
 * Shown after a blocked user signs in with the right password: reason, date and an appeal form.
 * There is no session (see loginAction): the token in the URL expires in 30 minutes.
 */
export default async function BlockedAccountPage({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const { t: token = "" } = await searchParams;
  const userId = token && token.length <= 128 ? await peekAuthTokenUser(token, "ban_appeal") : null;
  const [user] = userId
    ? await db
        .select({
          email: users.email,
          language: users.language,
          isBanned: users.isBanned,
          banReason: users.banReason,
          bannedAt: users.bannedAt,
          banAppealMessage: users.banAppealMessage,
          banAppealedAt: users.banAppealedAt,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)
    : [];

  if (!user || !user.isBanned) {
    const lang = user?.language ?? "pt";
    return (
      <div className={`${box} text-center`}>
        <div className="mb-3 text-4xl">⏳</div>
        <p className="text-sm text-slate-600">{t(lang, "banned_expired")}</p>
        <Link href="/login" className="mt-5 inline-block text-sm font-semibold text-emerald-600 hover:underline">
          {t(lang, "banned_back_login")}
        </Link>
      </div>
    );
  }

  const lang = user.language;
  const { contactEmail } = getLegalInfo();
  const maskedEmail = maskEmail(user.email);

  return (
    <div className={box} data-testid="banned-screen">
      <div className="text-center">
        <div className="mb-2 text-4xl">🚫</div>
        <h1 className="text-xl font-bold text-slate-900">{t(lang, "banned_title")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t(lang, "banned_intro")}</p>
      </div>

      <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
        <p className="text-xs font-bold uppercase tracking-wide text-red-700">{t(lang, "banned_reason")}</p>
        <p className="mt-1" data-testid="banned-reason">{user.banReason || t(lang, "banned_no_reason")}</p>
        {user.bannedAt && (
          <p className="mt-2 text-xs text-red-700">
            {t(lang, "banned_since")}: {formatDate(user.bannedAt, lang)}
          </p>
        )}
      </div>

      <div className="mt-6">
        <h2 className="font-bold text-slate-900">{t(lang, "banned_appeal_title")}</h2>
        {user.banAppealedAt ? (
          <div className="mt-2 space-y-2">
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" data-testid="ban-appeal-sent">
              ✅ {tf(lang, "banned_appeal_sent", { date: formatDate(user.banAppealedAt, lang), email: maskedEmail })}
            </p>
            {user.banAppealMessage && <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm italic text-slate-600">“{user.banAppealMessage}”</p>}
          </div>
        ) : (
          <>
            <p className="mt-1 mb-3 text-sm text-slate-500">{t(lang, "banned_appeal_hint")}</p>
            <BanAppealForm lang={lang} token={token} maskedEmail={maskedEmail} today={formatDate(new Date(), lang)} />
          </>
        )}
      </div>

      {contactEmail && (
        <p className="mt-5 text-center text-xs text-slate-500">
          {t(lang, "banned_contact")}{" "}
          <a href={`mailto:${contactEmail}`} className="font-semibold text-emerald-700 hover:underline">
            {contactEmail}
          </a>
        </p>
      )}
      <p className="mt-4 text-center">
        <Link href="/login" className="text-sm font-semibold text-slate-500 hover:underline">
          {t(lang, "banned_back_login")}
        </Link>
      </p>
    </div>
  );
}
