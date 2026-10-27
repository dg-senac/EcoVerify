import { and, asc, desc, eq, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { invoices, leads, sponsorTopups, missionRequests, missions, organizations, pointsLedger, regionSeeds, rewardQueue, submissions, users } from "@/db/schema";
import { BusinessTab, type BusinessData } from "@/components/admin/business-tab";
import { confirmInvoiceAction, grantPlanAction, updateLeadStatusAction } from "@/lib/actions/billing";
import { PLANS } from "@/lib/plans";
import { orgPlan } from "@/lib/saas/org-rules";
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
import { getPayoutSettings, sponsorBalances } from "@/lib/payouts";
import { isHoldReason, monthStart, splitOpenRewards, type HoldReason } from "@/lib/payout-rules";

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
      holdReason: rewardQueue.holdReason,
      userId: users.id,
      userName: users.name,
      walletAddress: users.walletAddress,
      walletVerifiedAt: users.walletVerifiedAt,
    })
    .from(rewardQueue)
    .innerJoin(users, eq(rewardQueue.userId, users.id))
    .where(inArray(rewardQueue.status, ["pending", "processing", "failed"]))
    .orderBy(asc(rewardQueue.createdAt));

  const payoutSettings = await getPayoutSettings();
  const now = new Date();
  const rewardsByUser = new Map<string, typeof openRewards>();
  for (const reward of openRewards) rewardsByUser.set(reward.userId, [...(rewardsByUser.get(reward.userId) ?? []), reward]);
  const heldByReason: Record<HoldReason, { cents: number; count: number }> = {
    budget: { cents: 0, count: 0 },
    user_cap: { cents: 0, count: 0 },
    sponsor_budget: { cents: 0, count: 0 },
  };
  const payoutGroups: PayoutGroup[] = [...rewardsByUser.values()].map((rewards) => {
    const first = rewards[0];
    const split = splitOpenRewards(rewards, payoutSettings, now);
    for (const reward of split.held) {
      if (!isHoldReason(reward.holdReason)) continue;
      heldByReason[reward.holdReason].cents += foneToCents(reward.foneAmount);
      heldByReason[reward.holdReason].count += 1;
    }
    return {
      userId: first.userId,
      userName: first.userName,
      wallet: verifiedWallet(first),
      totalFone: centsToFone(rewards.reduce((sum, r) => sum + foneToCents(r.foneAmount), 0)),
      rewardIds: split.payable.map((r) => r.id),
      statuses: split.payable.map((r) => r.status as PayoutGroup["statuses"][number]),
      oldest: first.createdAt,
      payableFone: centsToFone(split.payableCents),
      waitingFone: centsToFone(split.waitingCents),
      waitingCount: split.waiting.length,
      nextReleaseAt: split.nextReleaseAt,
      heldFone: centsToFone(split.heldCents),
      heldCount: split.held.length,
      belowMinimum: split.belowMinimum,
      feePercent: split.feePercent,
      minPayoutFone: payoutSettings.minPayoutFone.toFixed(2),
    };
  });
  const [monthUsage] = await db
    .select({
      treasury: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.sponsorId} is null), 0)::text`,
      sponsored: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.sponsorId} is not null), 0)::text`,
    })
    .from(rewardQueue)
    .where(and(sql`${rewardQueue.createdAt} >= ${monthStart(now).toISOString()}`, isNull(rewardQueue.holdReason)));
  const sponsorList = await sponsorBalances();

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

  // --- Business (SaaS revenue) ---
  const orgRows = await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      type: organizations.type,
      plan: organizations.plan,
      billingCycle: organizations.billingCycle,
      subscriptionStatus: organizations.subscriptionStatus,
      currentPeriodEnd: organizations.currentPeriodEnd,
      ownerEmail: users.email,
      members: sql<number>`(select count(*)::int from organization_members om where om.organization_id = ${organizations.id})`,
    })
    .from(organizations)
    .leftJoin(users, eq(users.id, organizations.ownerId))
    .orderBy(desc(organizations.createdAt))
    .limit(300);
  const invoiceRows = await db
    .select({
      id: invoices.id,
      orgName: organizations.name,
      orgSlug: organizations.slug,
      plan: invoices.plan,
      cycle: invoices.billingCycle,
      amountCents: invoices.amountCents,
      reference: invoices.reference,
      reportedAt: invoices.reportedAt,
      createdAt: invoices.createdAt,
    })
    .from(invoices)
    .innerJoin(organizations, eq(organizations.id, invoices.organizationId))
    .where(eq(invoices.status, "pending"))
    .orderBy(sql`${invoices.reportedAt} is null`, desc(invoices.createdAt));
  const [received] = await db
    .select({
      total: sql<number>`coalesce(sum(${invoices.amountCents}), 0)::int`,
      month: sql<number>`coalesce(sum(${invoices.amountCents}) filter (where ${invoices.paidAt} >= ${monthStart(new Date()).toISOString()}), 0)::int`,
    })
    .from(invoices)
    .where(eq(invoices.status, "paid"));
  const [fees] = await db
    .select({
      total: sql<number>`coalesce(sum(${sponsorTopups.feeCents}), 0)::int`,
      month: sql<number>`coalesce(sum(${sponsorTopups.feeCents}) filter (where ${sponsorTopups.createdAt} >= ${monthStart(new Date()).toISOString()}), 0)::int`,
    })
    .from(sponsorTopups);
  const leadRows = await db.select().from(leads).orderBy(desc(leads.createdAt)).limit(100);
  const orgsWithPlan = orgRows.map((o) => ({ ...o, effective: orgPlan(o) }));
  const paying = orgsWithPlan.filter((o) => o.effective !== "free" && o.subscriptionStatus === "active");
  const business: BusinessData = {
    mrrCents: paying.reduce((sum, o) => {
      const plan = PLANS[o.effective];
      if (o.billingCycle === "yearly" && plan.yearlyCents) return sum + Math.round(plan.yearlyCents / 12);
      return sum + (plan.monthlyCents ?? 0);
    }, 0),
    receivedMonthCents: received.month,
    receivedTotalCents: received.total,
    campaignFeesMonthCents: fees.month,
    campaignFeesTotalCents: fees.total,
    payingOrgs: paying.length,
    trialOrgs: orgsWithPlan.filter((o) => o.effective !== "free" && o.subscriptionStatus === "trialing").length,
    totalOrgs: orgRows.length,
    pendingInvoices: invoiceRows.map((i) => ({ ...i, reportedAt: i.reportedAt?.toISOString() ?? null, createdAt: i.createdAt.toISOString() })),
    orgs: orgsWithPlan.map((o) => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      type: o.type,
      plan: o.plan,
      effectivePlan: o.effective,
      status: o.subscriptionStatus,
      periodEnd: o.currentPeriodEnd?.toISOString() ?? null,
      members: o.members,
      ownerEmail: o.ownerEmail,
    })),
    leads: leadRows.map((l) => ({
      id: l.id,
      name: l.name,
      email: l.email,
      organization: l.organization,
      type: l.type,
      plan: l.plan,
      message: l.message,
      status: l.status,
      createdAt: l.createdAt.toISOString(),
    })),
  };
  const newLeads = leadRows.filter((l) => l.status === "new").length;
  const businessBadge = invoiceRows.filter((i) => i.reportedAt).length + newLeads;

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
            {
              key: "business",
              label: businessBadge ? `Negócios (${businessBadge})` : "Negócios",
              icon: "💼",
              content: <BusinessTab data={business} actions={{ confirmInvoice: confirmInvoiceAction, grantPlan: grantPlanAction, setLeadStatus: updateLeadStatusAction }} />,
            },
            { key: "missions", label: missionsToReview ? `Missões (${missionsToReview})` : "Missões", icon: "🌱", content: (
                <MissionsTab
                  missions={allMissions}
                  demand={cityDemand}
                  seeds={seedLog}
                  sponsors={sponsorList.map((sp) => ({
                    id: sp.id,
                    name: sp.name,
                    website: sp.website,
                    isActive: sp.isActive,
                    budgetFone: centsToFone(sp.budgetCents),
                    spentFone: centsToFone(sp.spentCents),
                    paidFone: centsToFone(sp.paidCents),
                    remainingFone: centsToFone(sp.remainingCents),
                  }))}
                />
              ),
            },
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
              content: (
                <RewardsTab
                  groups={payoutGroups}
                  paid={paidBatches}
                  explorerUrl={explorerUrl}
                  settings={payoutSettings}
                  month={{ treasuryFone: monthUsage.treasury, sponsoredFone: monthUsage.sponsored }}
                  held={Object.entries(heldByReason).map(([reason, value]) => ({ reason: reason as HoldReason, fone: centsToFone(value.cents), count: value.count }))}
                />
              ),
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
