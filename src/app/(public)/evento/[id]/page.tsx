import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, pointsLedger, submissions, users } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { canManage, orgPlan } from "@/lib/saas/org-rules";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { EVENT_TEXT, eventUnlocked, isEvent } from "@/lib/saas/events";
import { membershipRole, orgById } from "@/lib/saas/orgs";
import { EventReportView } from "@/components/org/event-report";
import { PrintButton } from "@/components/org/print-button";

export const metadata: Metadata = { title: "Relatório do evento · EcoVerify", robots: { index: false } };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Printable report of one event (mutirão), for the organization's managers. Unlocked by a paid plan
 * with reports or by paying the event ("evento avulso"). Photos are served only to logged-in users.
 */
export default async function EventReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/evento/${id}`)}`);
  if (!UUID.test(id)) notFound();
  const [mission] = await db.select().from(missions).where(eq(missions.id, id)).limit(1);
  if (!mission?.organizationId || !isEvent(mission)) notFound();
  const org = await orgById(mission.organizationId);
  if (!org) notFound();
  const role = await membershipRole(org.id, user.id);
  if (!canManage(role) && user.role !== "admin") notFound();
  if (!eventUnlocked(orgPlan(org), mission)) redirect(`/org/${org.slug}?tab=events`);

  const lang = user.language;
  const rows = await db
    .select({
      id: submissions.id,
      name: users.name,
      photoUrl: submissions.photoUrl,
      weightKg: submissions.weightKg,
      at: submissions.submittedAt,
      points: sql<number>`coalesce((select sum(pl.points)::int from ${pointsLedger} pl where pl.submission_id = ${submissions.id}), 0)`,
    })
    .from(submissions)
    .innerJoin(users, eq(users.id, submissions.userId))
    .where(and(eq(submissions.missionId, mission.id), eq(submissions.status, "approved"), sql`${users.deletedAt} is null`))
    .orderBy(asc(submissions.submittedAt));

  return (
    <EventReportView
      lang={lang}
      data={{
        orgName: org.name,
        title: mission.title,
        category: mission.category,
        city: mission.city,
        startsAt: mission.startsAt!.toISOString(),
        endsAt: mission.endsAt!.toISOString(),
        actions: rows.length,
        recycledKg: rows.reduce((sum, r) => sum + Number(r.weightKg ?? 0), 0),
        participants: rows.map((r) => ({ submissionId: r.id, name: r.name, points: r.points, at: r.at.toISOString() })),
        photos: rows.map((r) => r.photoUrl).filter(Boolean),
      }}
      toolbar={
        <>
          <a href={`/org/${org.slug}?tab=events`} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-600 hover:text-slate-900">
            ←
          </a>
          <PrintButton label={ORG_TEXT[lang].reportPrint} />
        </>
      }
      certificate={(submissionId) => (
        <a href={`/certificado/evento/${submissionId}`} className="text-xs font-semibold text-violet-700 hover:underline" data-testid="event-certificate-link">
          {EVENT_TEXT[lang].certificate}
        </a>
      )}
    />
  );
}
