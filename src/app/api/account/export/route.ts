import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  communityChat,
  messageFavorites,
  messageReports,
  missionRequests,
  missions,
  missionSuggestions,
  notifications,
  pointsLedger,
  rewardQueue,
  submissions,
} from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { TERMS_VERSION } from "@/lib/legal";

export const dynamic = "force-dynamic";

/** LGPD art. 18 (II, V): access and portability. Everything EcoVerify stores about the signed-in user, as JSON. */
export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.deletedAt) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!rateLimit(`export:${user.id}`, 10, 60 * 60 * 1000)) {
    return NextResponse.json({ error: "too_many_attempts" }, { status: 429 });
  }

  const [userSubmissions, ledger, rewards, userNotifications, messages, favorites, reports, requests, suggestions] = await Promise.all([
    db
      .select({
        id: submissions.id,
        mission: missions.title,
        status: submissions.status,
        report: submissions.report,
        photoUrl: submissions.photoUrl,
        photoHash: submissions.photoHash,
        latitude: submissions.latitude,
        longitude: submissions.longitude,
        rejectionReason: submissions.rejectionReason,
        rejectionCode: submissions.rejectionCode,
        decidedBy: submissions.decidedBy,
        automaticVerification: {
          status: submissions.aiStatus,
          verdict: submissions.aiVerdict,
          confidence: submissions.aiConfidence,
          reasonCode: submissions.aiReasonCode,
          explanation: submissions.aiSummary,
          checks: submissions.aiChecks,
          model: submissions.aiModel,
          analyzedAt: submissions.aiAnalyzedAt,
        },
        appealedAt: submissions.appealedAt,
        appealMessage: submissions.appealMessage,
        submittedAt: submissions.submittedAt,
        reviewedAt: submissions.reviewedAt,
      })
      .from(submissions)
      .innerJoin(missions, eq(missions.id, submissions.missionId))
      .where(eq(submissions.userId, user.id))
      .orderBy(desc(submissions.submittedAt)),
    db
      .select({ submissionId: pointsLedger.submissionId, points: pointsLedger.points, createdAt: pointsLedger.createdAt })
      .from(pointsLedger)
      .where(eq(pointsLedger.userId, user.id))
      .orderBy(desc(pointsLedger.createdAt)),
    db
      .select({
        submissionId: rewardQueue.submissionId,
        foneAmount: rewardQueue.foneAmount,
        status: rewardQueue.status,
        network: rewardQueue.network,
        walletAddress: rewardQueue.walletAddress,
        txHash: rewardQueue.txHash,
        paidAt: rewardQueue.paidAt,
        holdReason: rewardQueue.holdReason,
        createdAt: rewardQueue.createdAt,
      })
      .from(rewardQueue)
      .where(eq(rewardQueue.userId, user.id))
      .orderBy(desc(rewardQueue.createdAt)),
    db
      .select({
        type: notifications.type,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .orderBy(desc(notifications.createdAt)),
    db
      .select({
        id: communityChat.id,
        message: communityChat.message,
        messageType: communityChat.messageType,
        mediaUrl: communityChat.mediaUrl,
        replyToId: communityChat.replyToId,
        editedAt: communityChat.editedAt,
        deletedAt: communityChat.deletedAt,
        createdAt: communityChat.createdAt,
      })
      .from(communityChat)
      .where(eq(communityChat.userId, user.id))
      .orderBy(desc(communityChat.createdAt)),
    db
      .select({ messageId: messageFavorites.messageId, createdAt: messageFavorites.createdAt })
      .from(messageFavorites)
      .where(eq(messageFavorites.userId, user.id)),
    db
      .select({ messageId: messageReports.messageId, reason: messageReports.reason, status: messageReports.status, createdAt: messageReports.createdAt })
      .from(messageReports)
      .where(eq(messageReports.reporterId, user.id)),
    db
      .select({ city: missionRequests.city, stateCode: missionRequests.stateCode, createdAt: missionRequests.createdAt })
      .from(missionRequests)
      .where(eq(missionRequests.userId, user.id)),
    db
      .select({
        title: missionSuggestions.title,
        description: missionSuggestions.description,
        category: missionSuggestions.category,
        latitude: missionSuggestions.latitude,
        longitude: missionSuggestions.longitude,
        city: missionSuggestions.city,
        stateCode: missionSuggestions.stateCode,
        status: missionSuggestions.status,
        createdAt: missionSuggestions.createdAt,
        reviewedAt: missionSuggestions.reviewedAt,
      })
      .from(missionSuggestions)
      .where(eq(missionSuggestions.userId, user.id)),
  ]);

  const payload = {
    format: "ecoverify-data-export",
    version: 1,
    exportedAt: new Date().toISOString(),
    note:
      "Dados pessoais que o EcoVerify guarda sobre você (LGPD, art. 18). Fotos e mídias aparecem como endereços dentro do app " +
      "(abra-os com a sessão iniciada). Pagamentos em FONE também são públicos no explorador da rede Fone.",
    profile: {
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerifiedAt: user.emailVerifiedAt,
      role: user.role,
      totalPoints: user.totalPoints,
      language: user.language,
      preferences: {
        fontSize: user.fontSize,
        theme: user.theme,
        highContrast: user.highContrast,
        reducedMotion: user.reducedMotion,
        notificationsEnabled: user.notificationsEnabled,
      },
      adultDeclaredAt: user.adultDeclaredAt,
      wallet: {
        verifiedAddress: user.walletVerifiedAt ? user.walletAddress : null,
        verifiedAt: user.walletVerifiedAt,
        verificationTx: user.walletVerificationTx,
        pendingAddress: user.pendingWalletAddress,
        pendingChallengeAmount: user.walletChallengeAmount,
        pendingChallengeTx: user.walletChallengeTx,
      },
      terms: { acceptedAt: user.termsAcceptedAt, version: user.termsVersion, currentVersion: TERMS_VERSION },
      createdAt: user.createdAt,
    },
    submissions: userSubmissions,
    pointsLedger: ledger,
    foneRewards: rewards,
    notifications: userNotifications,
    communityMessages: messages,
    favoriteMessages: favorites,
    reportsMade: reports,
    missionRequests: requests,
    missionSuggestions: suggestions,
    regionNote:
      "A região escolhida na tela de missões fica só num cookie do seu aparelho (cidade e coordenadas arredondadas), não no banco de dados.",
  };

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="ecoverify-meus-dados-${date}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
