import { eq, and, not, inArray } from "drizzle-orm";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n";
import { MissionCard } from "@/components/missions/mission-card";
import { Sprout } from "@/components/ui/icons";

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const userSubmissions = await db
    .select({ missionId: submissions.missionId })
    .from(submissions)
    // Rejected submissions don't block the mission: the user can try again.
    .where(and(eq(submissions.userId, user.id), inArray(submissions.status, ["pending", "approved"])));

  const completedMissionIds = userSubmissions.map((s) => s.missionId);

  const activeMissions = await db
    .select()
    .from(missions)
    .where(
      and(
        eq(missions.isActive, true),
        completedMissionIds.length > 0
          ? not(inArray(missions.id, completedMissionIds))
          : undefined
      )
    );

  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(user.language, "missions_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(user.language, "missions_subtitle")}</p>

      {activeMissions.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
          <Sprout className="h-16 w-16 mx-auto" />
          <p className="mt-3 text-sm font-medium">{t(user.language, "missions_empty")}</p>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {activeMissions.map((mission) => (
            <MissionCard
              key={mission.id}
              lang={user.language}
              mission={{
                id: mission.id,
                title: mission.title,
                titleEn: mission.titleEn,
                titleEs: mission.titleEs,
                description: mission.description,
                descriptionEn: mission.descriptionEn,
                descriptionEs: mission.descriptionEs,
                category: mission.category,
                pointsReward: mission.pointsReward,
                foneReward: mission.foneReward,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
