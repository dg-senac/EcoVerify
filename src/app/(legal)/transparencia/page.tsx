import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import { and, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, pointsLedger, rewardQueue, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { getFoneConfig } from "@/lib/fone-config";
import { centsToFone, explorerAddressUrl, explorerTxUrl, foneToCents, shortHex } from "@/lib/fone";
import { getPayoutSettings, sponsorBalances } from "@/lib/payouts";
import { monthStart } from "@/lib/payout-rules";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { TRANSPARENCY_TEXT as TEXT } from "@/lib/transparency-text";
import { LogoHorizontal } from "@/components/logo";
import { FoneAmount, PoweredByFone } from "@/components/brand/fone";
import { guestLang } from "@/lib/guest-lang";

export const metadata: Metadata = {
  title: "Transparência · EcoVerify",
  description: "Impacto, recompensas em FONE e patrocínios do EcoVerify, em números públicos.",
};

async function pickLang(param?: string): Promise<Lang> {
  return guestLang(param, await getCurrentUser());
}

const fmt = (lang: Lang, value: number, digits = 0) =>
  value.toLocaleString(lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US", { minimumFractionDigits: digits, maximumFractionDigits: digits });

export default async function TransparencyPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const lang = await pickLang((await searchParams).lang);
  const text = TEXT[lang];
  const { explorerUrl, rewardsWallet } = getFoneConfig();
  const settings = await getPayoutSettings();

  const [impact] = await db
    .select({
      approved: sql<number>`count(*)::int`,
      people: sql<number>`count(distinct ${submissions.userId})::int`,
      cities: sql<number>`count(distinct ${missions.ibgeCode})::int`,
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.status, "approved"));
  const [points] = await db.select({ sum: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` }).from(pointsLedger);
  const byCategory = await db
    .select({ category: missions.category, count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.status, "approved"))
    .groupBy(missions.category)
    .orderBy(desc(sql`count(*)`));
  const [fone] = await db
    .select({
      paid: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.status} = 'paid'), 0)::text`,
      payments: sql<number>`count(distinct ${rewardQueue.txHash}) filter (where ${rewardQueue.status} = 'paid')::int`,
      queued: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.status} <> 'paid' and ${rewardQueue.holdReason} is null), 0)::text`,
      held: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.status} <> 'paid' and ${rewardQueue.holdReason} is not null), 0)::text`,
    })
    .from(rewardQueue);
  const [month] = await db
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(and(sql`${rewardQueue.createdAt} >= ${monthStart().toISOString()}`, isNull(rewardQueue.sponsorId), isNull(rewardQueue.holdReason)));
  const recent = await db
    .select({
      txHash: rewardQueue.txHash,
      wallet: rewardQueue.walletAddress,
      total: sql<string>`sum(${rewardQueue.foneAmount})::text`,
      paidAt: sql<string | null>`max(${rewardQueue.paidAt})`,
    })
    .from(rewardQueue)
    .where(and(eq(rewardQueue.status, "paid"), isNotNull(rewardQueue.txHash), inArray(rewardQueue.network, ["FONE"])))
    .groupBy(rewardQueue.txHash, rewardQueue.walletAddress)
    .orderBy(desc(sql`max(${rewardQueue.paidAt})`))
    .limit(30);
  const sponsors = (await sponsorBalances()).filter((sponsor) => sponsor.isActive || sponsor.spentCents > 0);

  const monthUsed = foneToCents(month.sum);
  const budget = settings.monthlyBudgetFone;
  const card = "rounded-2xl border border-black/5 bg-white p-4";
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Link href="/">
            <LogoHorizontal height={36} />
          </Link>
          <nav className="flex gap-3 text-sm font-semibold text-emerald-700">
            {(["pt", "en", "es"] as const).map((code) => (
              <Link key={code} href={`/transparencia?lang=${code}`} className={code === lang ? "underline" : "hover:underline"}>
                {code.toUpperCase()}
              </Link>
            ))}
          </nav>
        </div>

        <h1 className="text-3xl font-bold text-slate-900" data-testid="transparency-title">
          🔎 {text.title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-600">{text.intro}</p>

        <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">🌱 {text.impact}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="transparency-impact">
          {[
            [impact.approved, text.approved],
            [impact.people, text.people],
            [impact.cities, text.cities],
            [points.sum, text.points],
          ].map(([value, label]) => (
            <div key={String(label)} className={card}>
              <p className="text-2xl font-extrabold text-emerald-700">{fmt(lang, Number(value))}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>
        {byCategory.length > 0 && (
          <div className={`${card} mt-3`}>
            <p className="mb-2 text-sm font-semibold text-slate-700">{text.byCategory}</p>
            <div className="flex flex-wrap gap-2 text-sm">
              {byCategory.map((row) => (
                <span key={row.category} className="rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                  {categoryEmoji[row.category]} {categoryLabels[row.category]?.[lang] ?? row.category}: <b>{fmt(lang, row.count)}</b>
                </span>
              ))}
            </div>
          </div>
        )}

        <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">🪙 {text.fone}</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="transparency-fone">
          <div className={card}>
            <p className="text-2xl font-extrabold text-teal-700" data-testid="transparency-paid">
              {fmt(lang, Number(fone.paid), 2)}
            </p>
            <p className="text-xs text-slate-500">{text.paid}</p>
          </div>
          <div className={card}>
            <p className="text-2xl font-extrabold text-teal-700">{fmt(lang, fone.payments)}</p>
            <p className="text-xs text-slate-500">{text.payments}</p>
          </div>
          <div className={card}>
            <p className="text-2xl font-extrabold text-slate-800">{fmt(lang, Number(fone.queued), 2)}</p>
            <p className="text-xs text-slate-500">{text.queued}</p>
          </div>
          <div className={card}>
            <p className="text-2xl font-extrabold text-slate-800">{fmt(lang, Number(fone.held), 2)}</p>
            <p className="text-xs text-slate-500">{text.held}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <div className={card}>
            <p className="text-sm font-semibold text-slate-700">{text.month}</p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {centsToFone(monthUsed)}
              <span className="text-sm font-medium text-slate-500"> / {budget === null ? text.noBudget : budget.toFixed(2)}</span>
            </p>
            {budget !== null && budget > 0 && (
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-emerald-500" style={{ width: `${Math.min(100, Math.round((monthUsed / (budget * 100)) * 100))}%` }} />
              </div>
            )}
          </div>
          <div className={card} data-testid="transparency-rules">
            <p className="text-sm font-semibold text-slate-700">{text.rules}</p>
            <ul className="mt-1 list-disc space-y-0.5 pl-5 text-xs text-slate-600">
              <li>{text.rule_min.replace("{v}", settings.minPayoutFone.toFixed(2))}</li>
              <li>{text.rule_hold.replace("{v}", String(settings.holdDays))}</li>
              {settings.maxFonePerUserMonth !== null && <li>{text.rule_cap.replace("{v}", settings.maxFonePerUserMonth.toFixed(2))}</li>}
              <li>{text.rule_adult}</li>
            </ul>
          </div>
        </div>
        <div className={`${card} mt-3`}>
          <p className="text-sm font-semibold text-slate-700">👛 {text.wallet}</p>
          {rewardsWallet ? (
            <p className="mt-1 text-xs text-slate-600">
              {text.walletHint}{" "}
              <a href={explorerAddressUrl(rewardsWallet, explorerUrl)} target="_blank" rel="noopener noreferrer" className="break-all font-mono text-teal-700 hover:underline">
                {rewardsWallet} ↗
              </a>
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">{text.walletNone}</p>
          )}
        </div>

        <h2 className="mt-8 mb-1 text-lg font-bold text-slate-900">🤝 {text.sponsors}</h2>
        <p className="mb-3 text-xs text-slate-500">{text.sponsorsHint}</p>
        {sponsors.length === 0 ? (
          <p className={`${card} text-sm text-slate-500`}>{text.noSponsors}</p>
        ) : (
          <div className="grid gap-3 md:grid-cols-2" data-testid="transparency-sponsors">
            {sponsors.map((sponsor) => (
              <div key={sponsor.id} className={card}>
                <p className="font-semibold text-slate-800">
                  {sponsor.website ? (
                    <a href={sponsor.website} target="_blank" rel="noopener noreferrer nofollow" className="hover:underline">
                      {sponsor.name} ↗
                    </a>
                  ) : (
                    sponsor.name
                  )}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {text.budget} {centsToFone(sponsor.budgetCents)} · {text.committed} {centsToFone(sponsor.spentCents)} · {text.remaining}{" "}
                  <b className="text-slate-800">{centsToFone(sponsor.remainingCents)}</b> FONE
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full bg-teal-500"
                    style={{ width: `${sponsor.budgetCents ? Math.min(100, Math.round((sponsor.spentCents / sponsor.budgetCents) * 100)) : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        <h2 className="mt-8 mb-3 text-lg font-bold text-slate-900">🧾 {text.recent}</h2>
        <div className={`${card} overflow-x-auto`}>
          {recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">{text.noPayments}</p>
          ) : (
            <table className="w-full text-sm" data-testid="transparency-payments">
              <thead>
                <tr className="text-left text-xs text-slate-400">
                  <th className="py-1 font-semibold">{text.date}</th>
                  <th className="py-1 font-semibold">{text.amount}</th>
                  <th className="py-1 font-semibold">{text.to}</th>
                  <th className="py-1 font-semibold">{text.tx}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((row) => (
                  <tr key={`${row.txHash}-${row.wallet}`} className="border-t border-black/5">
                    <td className="py-1.5 text-slate-600">{row.paidAt ? new Date(row.paidAt).toLocaleDateString(locale) : "—"}</td>
                    <td className="py-1.5 font-semibold text-slate-800">
                      <FoneAmount amount={row.total} size={14} />
                    </td>
                    <td className="py-1.5 font-mono text-xs text-slate-500">{row.wallet ? shortHex(row.wallet) : "—"}</td>
                    <td className="py-1.5">
                      {row.txHash && (
                        <a href={explorerTxUrl(row.txHash, explorerUrl)} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-teal-700 hover:underline">
                          {shortHex(row.txHash)} ↗
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <Link href="/" className="rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white">
            {text.back}
          </Link>
          <nav className="flex gap-4 text-xs font-medium text-slate-500">
            <Link href="/termos" className="hover:underline">{t(lang, "terms_of_use")}</Link>
            <Link href="/privacidade" className="hover:underline">{t(lang, "privacy_policy")}</Link>
          </nav>
          <PoweredByFone lang={lang} />
        </div>
      </div>
    </div>
  );
}
