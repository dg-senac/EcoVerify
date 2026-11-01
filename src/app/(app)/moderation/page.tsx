import { and, asc, count, desc, eq, isNotNull, not, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { auditQueueCondition, inAutomaticVerification, sweepVerifications } from "@/lib/verification-server";
import { AuditCard } from "@/components/moderation/audit-card";
import { db } from "@/db";
import { missions, missionSuggestions, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canReview } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { t, tx, type Lang } from "@/lib/i18n";
import { formatDate } from "@/lib/utils";
import { rejectionReasonText, type AiChecks } from "@/lib/ai/decision";
import { getAiSettings, willAnalyzeWithModel } from "@/lib/ai/pipeline";
import { ModerationCard } from "@/components/moderation/moderation-card";
import { SuggestionCard } from "@/components/moderation/suggestion-card";
import { Shield } from "@/components/ui/icons";

function AiModeBanner({ lang, mode, hasModel }: { lang: Lang; mode: "off" | "suggest" | "auto"; hasModel: boolean }) {
  const key = mode === "off" ? "ai_mode_off" : !hasModel ? "ai_mode_no_key" : mode === "auto" ? "ai_mode_auto" : "ai_mode_suggest";
  return (
    <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600" data-testid="ai-mode">
      🤖 {t(lang, key)}
    </p>
  );
}

export default async function ModerationPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!canReview(user.role, moderatorsEnabled())) redirect("/missions");
  const lang = user.language;
  // Keeps the verification window moving even without a scheduler (throttled inside).
  after(() => sweepVerifications().catch((error) => console.error("[verify] sweep failed:", error)));

  const [rows, recentAi, settings, suggestions, [automatic], audits] = await Promise.all([
    db
      .select({
        id: submissions.id,
        photoUrl: submissions.photoUrl,
        report: submissions.report,
        material: submissions.material,
        weightKg: submissions.weightKg,
        declaredWeightKg: submissions.declaredWeightKg,
        itemCount: submissions.itemCount,
        weightSource: submissions.weightSource,
        photoBeforeUrl: submissions.photoBeforeUrl,
        countItem: missions.countItem,
        latitude: submissions.latitude,
        longitude: submissions.longitude,
        submittedAt: submissions.submittedAt,
        missionTitle: missions.title,
        missionCategory: missions.category,
        authorId: users.id,
        authorName: users.name,
        aiStatus: submissions.aiStatus,
        aiVerdict: submissions.aiVerdict,
        aiConfidence: submissions.aiConfidence,
        aiReasonCode: submissions.aiReasonCode,
        aiSummary: submissions.aiSummary,
        aiChecks: submissions.aiChecks,
        appealedAt: submissions.appealedAt,
        appealMessage: submissions.appealMessage,
        trustScore: submissions.trustScore,
        extraProofCode: submissions.extraProofCode,
        extraProofStatus: submissions.extraProofStatus,
        extraPhotoUrl: submissions.extraPhotoUrl,
      })
      .from(submissions)
      .innerJoin(missions, eq(submissions.missionId, missions.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      // The moderator is the last resort: proofs still inside the automatic verification wait.
      .where(and(eq(submissions.status, "pending"), not(inAutomaticVerification())))
      // Appeals first, then possible copies from the internet, then oldest first.
      .orderBy(
        sql`${submissions.appealedAt} is null`,
        sql`${submissions.aiReasonCode} is distinct from 'internet_copy'`,
        asc(submissions.submittedAt),
      ),
    db
      .select({
        id: submissions.id,
        photoUrl: submissions.photoUrl,
        status: submissions.status,
        reviewedAt: submissions.reviewedAt,
        rejectionCode: submissions.rejectionCode,
        aiConfidence: submissions.aiConfidence,
        missionTitle: missions.title,
        authorName: users.name,
      })
      .from(submissions)
      .innerJoin(missions, eq(submissions.missionId, missions.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(and(eq(submissions.decidedBy, "ai"), isNotNull(submissions.reviewedAt)))
      .orderBy(desc(submissions.reviewedAt))
      .limit(15),
    getAiSettings(),
    db
      .select({
        id: missionSuggestions.id,
        title: missionSuggestions.title,
        description: missionSuggestions.description,
        category: missionSuggestions.category,
        latitude: missionSuggestions.latitude,
        longitude: missionSuggestions.longitude,
        city: missionSuggestions.city,
        stateCode: missionSuggestions.stateCode,
        createdAt: missionSuggestions.createdAt,
        authorName: users.name,
      })
      .from(missionSuggestions)
      .innerJoin(users, eq(missionSuggestions.userId, users.id))
      .where(eq(missionSuggestions.status, "pending"))
      .orderBy(asc(missionSuggestions.createdAt))
      .limit(30),
    db
      .select({ value: count() })
      .from(submissions)
      .where(and(eq(submissions.status, "pending"), inAutomaticVerification())),
    db
      .select({
        id: submissions.id,
        userId: submissions.userId,
        photoUrl: submissions.photoUrl,
        photoBeforeUrl: submissions.photoBeforeUrl,
        extraPhotoUrl: submissions.extraPhotoUrl,
        report: submissions.report,
        missionTitle: missions.title,
        missionCategory: missions.category,
        authorName: users.name,
        reviewedAt: submissions.reviewedAt,
        trustScore: submissions.trustScore,
        aiSummary: submissions.aiSummary,
        aiChecks: submissions.aiChecks,
        itemCount: submissions.itemCount,
        weightKg: submissions.weightKg,
        weightSource: submissions.weightSource,
        countItem: missions.countItem,
      })
      .from(submissions)
      .innerJoin(missions, eq(submissions.missionId, missions.id))
      .innerJoin(users, eq(submissions.userId, users.id))
      .where(auditQueueCondition())
      .orderBy(asc(submissions.reviewedAt))
      .limit(20),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(lang, "moderation_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(lang, "moderation_subtitle")}</p>
      <AiModeBanner lang={lang} mode={settings.mode} hasModel={willAnalyzeWithModel(settings)} />
      {automatic.value > 0 && (
        <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" data-testid="auto-verifying">
          🔎 {automatic.value}{" "}
          {tx(
            lang,
            "comprovação(ões) em verificação automática (análise, nova tentativa ou prova extra). Só chegam aqui se a dúvida continuar.",
            "proof(s) under automatic verification (analysis, retry or extra proof). They only come here if the doubt remains.",
            "comprobación(es) en verificación automática (análisis, nuevo intento o prueba extra). Solo llegan aquí si la duda continúa.",
          )}
        </p>
      )}

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <Shield className="h-16 w-16 mx-auto" />
          <p className="mt-3 text-sm font-medium">{t(lang, "moderation_empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-5">
          {rows.map((row) => (
            <ModerationCard
              key={row.id}
              lang={lang}
              moderatorId={user.id}
              canRetryAi={willAnalyzeWithModel(settings)}
              canGiveCard
              submission={{ ...row, aiChecks: (row.aiChecks as AiChecks | null) ?? null }}
            />
          ))}
        </div>
      )}

      {audits.length > 0 && (
        <section className="mt-10" data-testid="audits">
          <h2 className="text-lg font-bold text-slate-900">🔍 {tx(lang, "Auditoria por amostragem", "Sample audit", "Auditoría por muestreo")}</h2>
          <p className="mt-1 text-xs text-slate-500">
            {tx(
              lang,
              "Algumas aprovações automáticas são sorteadas para conferência. Confirme ou revogue (os pontos voltam).",
              "Some automatic approvals are drawn for a check. Confirm or revoke them (the points are taken back).",
              "Algunas aprobaciones automáticas se sortean para revisión. Confírmalas o revócalas (los puntos se retiran).",
            )}
          </p>
          <div className="mt-3 space-y-4">
            {audits.map(({ aiChecks, userId, ...audit }) => {
              const checks = aiChecks as AiChecks | null;
              return (
                <AuditCard
                  key={audit.id}
                  lang={lang}
                  item={{ ...audit, isOwn: userId === user.id, trustFactors: checks?.trustFactors ?? null, aiItemCount: checks?.itemCount ?? null }}
                />
              );
            })}
          </div>
        </section>
      )}

      {suggestions.length > 0 && (
        <section className="mt-10" data-testid="suggestions">
          <h2 className="text-lg font-bold text-slate-900">🙋 {t(lang, "suggestions_title")}</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            {suggestions.map((suggestion) => (
              <SuggestionCard
                key={suggestion.id}
                lang={lang}
                suggestion={{ ...suggestion, latitude: String(suggestion.latitude), longitude: String(suggestion.longitude), createdAt: formatDate(suggestion.createdAt, lang) }}
              />
            ))}
          </div>
        </section>
      )}

      {recentAi.length > 0 && (
        <section className="mt-10" data-testid="ai-recent">
          <h2 className="text-lg font-bold text-slate-900">🤖 {t(lang, "ai_recent_title")}</h2>
          <p className="mt-1 text-xs text-slate-500">{t(lang, "ai_recent_hint")}</p>
          <ul className="mt-3 divide-y divide-slate-100 overflow-hidden rounded-2xl border border-black/5 bg-white">
            {recentAi.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.photoUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />
                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-semibold text-slate-900">{item.missionTitle}</p>
                  <p className="truncate text-xs text-slate-500">
                    {item.authorName} · {item.reviewedAt ? formatDate(item.reviewedAt, lang) : ""}
                  </p>
                  {item.status === "rejected" && item.rejectionCode && (
                    <p className="truncate text-xs text-red-600">{rejectionReasonText(item.rejectionCode, lang)}</p>
                  )}
                </div>
                <span
                  className={`ml-[3.75rem] shrink-0 rounded-full px-2.5 py-1 text-xs font-bold sm:ml-0 ${
                    item.status === "approved"
                      ? "bg-emerald-50 text-emerald-700"
                      : item.status === "rejected"
                        ? "bg-red-50 text-red-700"
                        : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {item.status === "approved"
                    ? t(lang, "decided_ai_approved")
                    : item.status === "rejected"
                      ? t(lang, "decided_ai_rejected")
                      : t(lang, "status_appealed")}
                  {item.aiConfidence !== null ? ` · ${item.aiConfidence}%` : ""}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
