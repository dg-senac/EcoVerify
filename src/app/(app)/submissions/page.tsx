import { desc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SubmissionCard } from "@/components/submissions/submission-card";
import { FileText } from "@/components/ui/icons";

export default async function SubmissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const rows = await db
    .select({
      id: submissions.id,
      photoUrl: submissions.photoUrl,
      report: submissions.report,
      status: submissions.status,
      rejectionReason: submissions.rejectionReason,
      rejectionCode: submissions.rejectionCode,
      decidedBy: submissions.decidedBy,
      aiStatus: submissions.aiStatus,
      appealedAt: submissions.appealedAt,
      submittedAt: submissions.submittedAt,
      missionTitle: missions.title,
      missionCategory: missions.category,
    })
    .from(submissions)
    .innerJoin(missions, eq(submissions.missionId, missions.id))
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
