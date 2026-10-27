import { eq } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { SubmitProofForm } from "@/components/missions/submit-proof-form";
import { membershipRole } from "@/lib/saas/orgs";

export default async function SubmitMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const missionList = await db.select().from(missions).where(eq(missions.id, id));
  const mission = missionList[0];

  if (!mission || !mission.isActive) {
    notFound();
  }
  // Organization missions are private to its members.
  if (mission.organizationId && !(await membershipRole(mission.organizationId, user.id))) notFound();

  return (
    <div className="max-w-2xl mx-auto">
      <SubmitProofForm
        lang={user.language}
        mission={{
          id: mission.id,
          title: mission.title,
          titleEn: mission.titleEn,
          titleEs: mission.titleEs,
          context: mission.context,
          impact: mission.impact,
          latitude: mission.latitude,
          longitude: mission.longitude,
          scope: mission.scope,
          origin: mission.origin,
          category: mission.category,
          pointsReward: mission.pointsReward,
          foneReward: mission.foneReward,
        }}
      />
    </div>
  );
}
