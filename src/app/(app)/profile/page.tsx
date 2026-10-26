import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { rewardQueue, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { initials, formatDate, levelForPoints } from "@/lib/utils";
import { t } from "@/lib/i18n";
import { WalletPanel } from "@/components/wallet/wallet-panel";
import { getFoneConfig } from "@/lib/fone-config";
import { explorerTxUrl, shortHex, verifiedWallet, walletRequestState } from "@/lib/fone";
import { logoutAction } from "@/lib/actions/auth";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

const roleLabels: Record<string, string> = {
  citizen: "Cidadão(ã)",
  moderator: "Moderador(a)",
  admin: "Administrador(a)",
};

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [approved] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.userId} = ${user.id} and ${submissions.status} = 'approved'`);
  const [pending] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.userId} = ${user.id} and ${submissions.status} = 'pending'`);
  const [rejected] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(submissions)
    .where(sql`${submissions.userId} = ${user.id} and ${submissions.status} = 'rejected'`);

  const level = levelForPoints(user.totalPoints, user.language);

  const { treasury, explorerUrl } = getFoneConfig();
  const verified = verifiedWallet(user);
  const [queued] = await db
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(and(eq(rewardQueue.userId, user.id), inArray(rewardQueue.status, ["pending", "processing", "failed"])));
  const payouts = await db
    .select({
      txHash: rewardQueue.txHash,
      total: sql<string>`sum(${rewardQueue.foneAmount})::text`,
      paidAt: sql<string | null>`max(${rewardQueue.paidAt})`,
    })
    .from(rewardQueue)
    .where(and(eq(rewardQueue.userId, user.id), eq(rewardQueue.status, "paid")))
    .groupBy(rewardQueue.txHash)
    .orderBy(desc(sql`max(${rewardQueue.paidAt})`))
    .limit(10);
  const queuedFone = Number(queued.sum);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "profile_title")}</h1>

      <div className="mt-6 rounded-3xl border border-black/5 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <div className="grid h-20 w-20 shrink-0 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl font-bold text-white shadow-md">
            {initials(user.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-900">{user.name}</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                {level.emoji} {level.name}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {roleLabels[user.role]}
              </span>
            </div>
          </div>
          <div className="rounded-2xl bg-gradient-to-br from-emerald-50 to-teal-50 px-6 py-4 text-center">
            <p className="text-3xl font-extrabold text-emerald-700">{user.totalPoints}</p>
            <p className="text-xs font-medium text-slate-500">{t(user.language, "points")}</p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-xl bg-emerald-50 p-3 text-center">
            <p className="text-lg font-extrabold text-emerald-700">{approved.count}</p>
            <p className="text-xs font-medium text-emerald-600">{t(user.language, "status_approved")}</p>
          </div>
          <div className="rounded-xl bg-amber-50 p-3 text-center">
            <p className="text-lg font-extrabold text-amber-700">{pending.count}</p>
            <p className="text-xs font-medium text-amber-600">{t(user.language, "status_pending")}</p>
          </div>
          <div className="rounded-xl bg-red-50 p-3 text-center">
            <p className="text-lg font-extrabold text-red-700">{rejected.count}</p>
            <p className="text-xs font-medium text-red-600">{t(user.language, "status_rejected")}</p>
          </div>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-5">
          <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <FoneMark size={18} /> {t(user.language, "wallet_section")}
          </p>
          {!verified && (
            <p className="mb-3 text-xs text-slate-500">
              {queuedFone > 0
                ? t(user.language, "wallet_waiting_payouts").replace("{amount}", queued.sum)
                : t(user.language, "wallet_none")}
            </p>
          )}
          <WalletPanel
            lang={user.language}
            verifiedAddress={verified}
            request={walletRequestState(user)}
            treasury={treasury}
            explorerUrl={explorerUrl}
            adultDeclared={!!user.adultDeclaredAt}
          />
        </div>

        {(payouts.length > 0 || (verified && queuedFone > 0)) && (
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-sm font-semibold text-slate-700">{t(user.language, "wallet_payouts_title")}</p>
            <ul className="space-y-2">
              {verified && queuedFone > 0 && (
                <li className="flex items-center justify-between rounded-xl bg-amber-50 px-3 py-2 text-sm">
                  <FoneAmount amount={queued.sum} className="font-bold text-amber-800" />
                  <span className="text-xs font-semibold text-amber-700">{t(user.language, "wallet_payout_queued")}</span>
                </li>
              )}
              {payouts.map((payout) => (
                <li key={payout.txHash ?? "none"} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm">
                  <FoneAmount amount={payout.total} className="font-bold text-emerald-800" />
                  <span className="text-xs text-emerald-700">
                    {t(user.language, "wallet_payout_paid")}
                    {payout.paidAt ? ` · ${formatDate(payout.paidAt, user.language)}` : ""}
                  </span>
                  {payout.txHash && (
                    <a
                      href={explorerTxUrl(payout.txHash, explorerUrl)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full font-mono text-xs text-teal-700 hover:underline"
                    >
                      {shortHex(payout.txHash)} ↗
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 border-t border-slate-100 pt-5 text-sm text-slate-500">
          Na plataforma desde {formatDate(user.createdAt, user.language)}
        </div>

        <form action={logoutAction} className="mt-6">
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600 sm:w-auto"
          >
            🚪 {t(user.language, "nav_logout")}
          </button>
        </form>
      </div>
    </div>
  );
}
