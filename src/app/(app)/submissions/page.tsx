import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { sweepVerifications } from "@/lib/verification-server";
import { citizenOnly } from "@/lib/role-guard";
import { db } from "@/db";
import { collectionPoints, missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SubmissionCard } from "@/components/submissions/submission-card";
import { FileText } from "@/components/ui/icons";

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  // Keeps the verification window moving even without a scheduler (throttled inside).
  after(() => sweepVerifications().catch((error) => console.error("[verify] sweep failed:", error)));

  const rows = await db
    .select({
      id: submissions.id,
      photoUrl: submissions.photoUrl,
      report: submissions.report,
      material: submissions.material,
      weightKg: submissions.weightKg,
      declaredWeightKg: submissions.declaredWeightKg,
      itemCount: submissions.itemCount,
      weightSource: submissions.weightSource,
      countItem: missions.countItem,
      status: submissions.status,
      rejectionReason: submissions.rejectionReason,
      rejectionCode: submissions.rejectionCode,
      decidedBy: submissions.decidedBy,
      aiStatus: submissions.aiStatus,
      appealedAt: submissions.appealedAt,
      extraProofStatus: submissions.extraProofStatus,
      extraProofCode: submissions.extraProofCode,
      extraProofDueAt: submissions.extraProofDueAt,
      verifyBy: submissions.verifyBy,
      deliveryCode: submissions.deliveryCode,
      partnerConfirmedAt: submissions.partnerConfirmedAt,
      pointName: collectionPoints.name,
      pointAddress: collectionPoints.address,
      submittedAt: submissions.submittedAt,
      missionTitle: missions.title,
      missionCategory: missions.category,
    })
    .from(submissions)
    .innerJoin(missions, eq(submissions.missionId, missions.id))
    .leftJoin(collectionPoints, eq(collectionPoints.id, missions.collectionPointId))
    .where(eq(submissions.userId, user.id))
    .orderBy(desc(submissions.submittedAt));

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "my_submissions_title")}</h1>

      {rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <FileText className="h-16 w-16 mx-auto" />
          <p className="mt-3 text-sm font-medium">{t(user.language, "submissions_empty")}</p>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <SubmissionCard key={row.id} lang={user.language} submission={row} />
          ))}
        </div>
      )}
    </div>
  );
}
