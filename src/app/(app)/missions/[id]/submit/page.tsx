import { eq } from "drizzle-orm";
import { db } from "@/db";
import { missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import { citizenOnly } from "@/lib/role-guard";
import { SubmitProofForm } from "@/components/missions/submit-proof-form";
import { membershipRole } from "@/lib/saas/orgs";
import { eventSubmissionError } from "@/lib/saas/events";
import { EventBadge } from "@/components/missions/event-badge";
import { t } from "@/lib/i18n";

export default async function SubmitMissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);

  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) notFound();
  const missionList = await db.select().from(missions).where(eq(missions.id, id));
  const mission = missionList[0];

  if (!mission || !mission.isActive) {
    notFound();
  }
  // Organization missions are private to its members.
  if (mission.organizationId && !(await membershipRole(mission.organizationId, user.id))) notFound();

  // Events: proofs only inside the date/time window.
  const eventError = eventSubmissionError(mission);
  if (eventError) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-black/5 bg-white p-6 shadow-sm" data-testid="event-closed">
        <h1 className="text-xl font-bold text-slate-900">{mission.title}</h1>
        <EventBadge lang={user.language} mission={mission} />
        <p className="mt-4 rounded-xl bg-violet-50 px-4 py-3 text-sm font-medium text-violet-900">{t(user.language, eventError === "event_ended" ? "error_event_ended" : "error_event_not_started")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <EventBadge lang={user.language} mission={mission} />
      <SubmitProofForm
        lang={user.language}
        mission={{
          id: mission.id,
          title: mission.title,
          titleEn: mission.titleEn,
          titleEs: mission.titleEs,
          context: mission.context,
          contextEn: mission.contextEn,
          contextEs: mission.contextEs,
          impact: mission.impact,
          impactEn: mission.impactEn,
          impactEs: mission.impactEs,
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
