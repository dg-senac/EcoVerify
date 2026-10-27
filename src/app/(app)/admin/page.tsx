import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { missionRequests, missions, pointsLedger, regionSeeds, rewardQueue, submissions, users } from "@/db/schema";
import { municipalityByIbge } from "@/lib/municipalities";
import { formatDate } from "@/lib/utils";
import { getCurrentUser } from "@/lib/auth";
import { AdminTabs } from "@/components/admin/admin-tabs";
import { MetricsTab } from "@/components/admin/metrics-tab";
import { MissionsTab } from "@/components/admin/missions-tab";
import { UsersTab } from "@/components/admin/users-tab";
import { RewardsTab, type PaidBatch } from "@/components/admin/rewards-tab";
import { WalletsTab } from "@/components/admin/wallets-tab";
import { AiTab } from "@/components/admin/ai-tab";
import { getAiSettings } from "@/lib/ai/pipeline";
import { geminiApiKey, geminiModel } from "@/lib/ai/gemini";
import type { PayoutGroup } from "@/components/admin/payout-row";
import { getFoneConfig } from "@/lib/fone-config";
import { emailMode } from "@/lib/email";
import { centsToFone, foneToCents, isChallengeExpired, verifiedWallet } from "@/lib/fone";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/missions");

  const [pendingCount] = await db.select({ count: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, "pending"));
  const [approvedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, "approved"));
  const [rejectedCount] = await db.select({ count: sql<number>`count(*)::int` }).from(submissions).where(eq(submissions.status, "rejected"));
  const [pointsSum] = await db.select({ sum: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int` }).from(pointsLedger);
  const [usersCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users).where(isNull(users.deletedAt));
  const [foneQueuedSum] = await db
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(sql`${rewardQueue.status} in ('pending', 'processing')`);
  const [fonePaidSum] = await db
    .select({ sum: sql<string>`coalesce(sum(${rewardQueue.foneAmount}), 0)::text` })
    .from(rewardQueue)
    .where(eq(rewardQueue.status, "paid"));

  const approvalRate = approvedCount.count + rejectedCount.count > 0
    ? Math.round((approvedCount.count / (approvedCount.count + rejectedCount.count)) * 100)
    : 0;

  const topRanking = await db
    .select({ id: users.id, name: users.name, totalPoints: users.totalPoints })
    .from(users)
    .where(and(eq(users.isBanned, false), isNull(users.deletedAt)))
    .orderBy(desc(users.totalPoints))
    .limit(5);

  const allMissions = await db.select().from(missions).orderBy(desc(missions.needsReview), desc(missions.createdAt));
  const [demandRows, seedRows] = await Promise.all([
    db
      .select({
        ibgeCode: missionRequests.ibgeCode,
        city: missionRequests.city,
        stateCode: missionRequests.stateCode,
        requests: sql<number>`count(*)::int`,
      })
      .from(missionRequests)
      .groupBy(missionRequests.ibgeCode, missionRequests.city, missionRequests.stateCode)
      .orderBy(desc(sql`count(*)`))
      .limit(15),
    db.select().from(regionSeeds).orderBy(desc(regionSeeds.attemptedAt)).limit(20),
  ]);
  const missionsToReview = allMissions.filter((m) => m.needsReview && m.isActive).length;
  const cityDemand = demandRows.map((row) => ({
    ...row,
    missions: allMissions.filter((m) => m.isActive && m.ibgeCode === row.ibgeCode).length,
  }));
  const seedLog = seedRows.map((row) => {
    const municipality = municipalityByIbge(row.ibgeCode);
    return {
      ibgeCode: row.ibgeCode,
      city: municipality ? `${municipality[1]}, ${municipality[2]}` : null,
      status: row.status,
      missionsCreated: row.missionsCreated,
      error: row.error,
      attemptedAt: formatDate(row.attemptedAt, "pt"),
    };
  });

  const allUsers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      totalPoints: users.totalPoints,
      createdAt: users.createdAt,
      isBanned: users.isBanned,
      banReason: users.banReason,
    })
    .from(users)
    // Accounts deleted by their owner are anonymised records, not people to manage.
    .where(isNull(users.deletedAt))
    .orderBy(desc(users.totalPoints));

  const { treasury, explorerUrl } = getFoneConfig();

  const pendingWallets = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      address: users.pendingWalletAddress,
      amount: users.walletChallengeAmount,
      requestedAt: users.walletChallengeCreatedAt,
      reportedTx: users.walletChallengeTx,
      currentWallet: users.walletAddress,
      currentVerifiedAt: users.walletVerifiedAt,
    })
    .from(users)
    .where(isNotNull(users.pendingWalletAddress))
    // Requests with a reported transaction first, then oldest first.
    .orderBy(sql`${users.walletChallengeTx} is null`, asc(users.walletChallengeCreatedAt));
  const [verifiedCount] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(isNotNull(users.walletVerifiedAt));

  const openRewards = await db
    .select({
      id: rewardQueue.id,
      foneAmount: rewardQueue.foneAmount,
      status: rewardQueue.status,
      createdAt: rewardQueue.createdAt,
      userId: users.id,
      userName: users.name,
      walletAddress: users.walletAddress,
      walletVerifiedAt: users.walletVerifiedAt,
    })
    .from(rewardQueue)
    .innerJoin(users, eq(rewardQueue.userId, users.id))
    .where(inArray(rewardQueue.status, ["pending", "processing", "failed"]))
    .orderBy(asc(rewardQueue.createdAt));

  const groupsByUser = new Map<string, PayoutGroup & { cents: number }>();
  for (const reward of openRewards) {
    if (reward.status === "paid") continue;
    const group = groupsByUser.get(reward.userId) ?? {
      userId: reward.userId,
      userName: reward.userName,
      wallet: verifiedWallet(reward),
      totalFone: "0.00",
      rewardIds: [],
      statuses: [],
      oldest: reward.createdAt,
      cents: 0,
    };
    group.rewardIds.push(reward.id);
    group.statuses.push(reward.status);
    group.cents += foneToCents(reward.foneAmount);
    group.totalFone = centsToFone(group.cents);
    groupsByUser.set(reward.userId, group);
  }
  const payoutGroups: PayoutGroup[] = [...groupsByUser.values()].map(({ cents: _cents, ...group }) => group);

  const paidBatches: PaidBatch[] = await db
    .select({
      txHash: rewardQueue.txHash,
      userName: users.name,
      wallet: rewardQueue.walletAddress,
      totalFone: sql<string>`sum(${rewardQueue.foneAmount})::text`,
      count: sql<number>`count(*)::int`,
      paidAt: sql<string | null>`max(coalesce(${rewardQueue.paidAt}, ${rewardQueue.updatedAt}))`,
    })
    .from(rewardQueue)
    .innerJoin(users, eq(rewardQueue.userId, users.id))
    .where(and(eq(rewardQueue.status, "paid")))
    .groupBy(rewardQueue.txHash, users.name, rewardQueue.walletAddress)
    .orderBy(desc(sql`max(coalesce(${rewardQueue.paidAt}, ${rewardQueue.updatedAt}))`))
    .limit(50);

  const aiConfig = await getAiSettings();
  const [aiStats] = await db
    .select({
      analyzed: sql<number>`count(*) filter (where ${submissions.aiStatus} = 'done')::int`,
      failed: sql<number>`count(*) filter (where ${submissions.aiStatus} = 'failed')::int`,
      autoApproved: sql<number>`count(*) filter (where ${submissions.decidedBy} = 'ai' and ${submissions.status} = 'approved')::int`,
      autoRejected: sql<number>`count(*) filter (where ${submissions.decidedBy} = 'ai' and ${submissions.status} = 'rejected')::int`,
      sentToHumans: sql<number>`count(*) filter (where ${submissions.aiStatus} is not null and ${submissions.decidedBy} is distinct from 'ai')::int`,
      appeals: sql<number>`count(*) filter (where ${submissions.appealedAt} is not null)::int`,
      appealsOverturned: sql<number>`count(*) filter (where ${submissions.appealedAt} is not null and ${submissions.status} = 'approved')::int`,
    })
    .from(submissions);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">📊 Painel Administrativo</h1>
      <p className="mt-1 text-sm text-slate-500">Métricas, missões, usuários e recompensas da plataforma.</p>
      {emailMode() === "off" && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ✉️ Envio de e-mails desligado: configure <code>RESEND_API_KEY</code>, <code>EMAIL_FROM</code> e <code>APP_URL</code>. Sem isso,
          a confirmação de e-mail não é exigida e &quot;Esqueci minha senha&quot; não funciona.
        </p>
      )}

      <div className="mt-6">
        <AdminTabs
          tabs={[
            {
              key: "metrics",
              label: "Métricas",
              icon: "📈",
              content: (
                <MetricsTab
                  metrics={{
                    pending: pendingCount.count,
                    approved: approvedCount.count,
                    rejected: rejectedCount.count,
                    approvalRate,
                    pointsDistributed: pointsSum.sum,
                    totalUsers: usersCount.count,
                    foneQueued: foneQueuedSum.sum,
                    fonePaid: fonePaidSum.sum,
                  }}
                  topRanking={topRanking}
                />
              ),
            },
            { key: "missions", label: missionsToReview ? `Missões (${missionsToReview})` : "Missões", icon: "🌱", content: <MissionsTab missions={allMissions} demand={cityDemand} seeds={seedLog} /> },
            { key: "users", label: "Usuários", icon: "👥", content: <UsersTab users={allUsers} currentUserId={user.id} /> },
            {
              key: "wallets",
              label: pendingWallets.length ? `Carteiras (${pendingWallets.length})` : "Carteiras",
              icon: "👛",
              content: (
                <WalletsTab
                  pending={pendingWallets
                    .filter((w) => w.address && w.amount && w.requestedAt)
                    .map((w) => ({
                      id: w.id,
                      name: w.name,
                      email: w.email,
                      address: w.address!,
                      amount: w.amount!,
                      requestedAt: w.requestedAt!,
                      expired: isChallengeExpired(w.requestedAt!),
                      reportedTx: w.reportedTx,
                      currentWallet: verifiedWallet({ walletAddress: w.currentWallet, walletVerifiedAt: w.currentVerifiedAt }),
                    }))}
                  verifiedCount={verifiedCount.count}
                  treasury={treasury}
                  explorerUrl={explorerUrl}
                />
              ),
            },
            {
              key: "rewards",
              label: "Recompensas",
              icon: "💸",
              content: <RewardsTab groups={payoutGroups} paid={paidBatches} explorerUrl={explorerUrl} />,
            },
            {
              key: "ai",
              label: "IA",
              icon: "🤖",
              content: <AiTab settings={aiConfig} stats={aiStats} model={geminiModel()} hasKey={!!geminiApiKey()} />,
            },
          ]}
        />
      </div>
    </div>
  );
}
