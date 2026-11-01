import "server-only";
import { and, asc, desc, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, organizationMembers, organizations, pointsLedger, submissions, users } from "@/db/schema";
import type { OrgRole } from "@/lib/saas/org-rules";
import { EVENT_GRACE_HOURS, eventMemberAllowance } from "@/lib/saas/events";

export type Organization = typeof organizations.$inferSelect;

export async function orgBySlug(slug: string): Promise<Organization | null> {
  const [org] = await db.select().from(organizations).where(eq(organizations.slug, slug)).limit(1);
  return org ?? null;
}

export async function orgById(id: string): Promise<Organization | null> {
  const [org] = await db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
  return org ?? null;
}

export async function membershipRole(orgId: string, userId: string): Promise<OrgRole | null> {
  const [row] = await db
    .select({ role: organizationMembers.role })
    .from(organizationMembers)
    .where(and(eq(organizationMembers.organizationId, orgId), eq(organizationMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}

export async function myOrganizations(userId: string) {
  return db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      type: organizations.type,
      city: organizations.city,
      brandColor: organizations.brandColor,
      plan: organizations.plan,
      subscriptionStatus: organizations.subscriptionStatus,
      currentPeriodEnd: organizations.currentPeriodEnd,
      role: organizationMembers.role,
      members: sql<number>`(select count(*)::int from organization_members om where om.organization_id = ${organizations.id})`,
    })
    .from(organizationMembers)
    .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
    .where(eq(organizationMembers.userId, userId))
    .orderBy(asc(organizations.name));
}

export async function myOrganizationIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ id: organizationMembers.organizationId })
    .from(organizationMembers)
    .where(eq(organizationMembers.userId, userId));
  return rows.map((r) => r.id);
}

export async function memberCount(orgId: string): Promise<number> {
  const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(organizationMembers).where(eq(organizationMembers.organizationId, orgId));
  return row.n;
}

export async function activeMissionCount(orgId: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(missions)
    .where(
      and(
        eq(missions.organizationId, orgId),
        eq(missions.isActive, true),
        // Finished events don't take a slot of the plan's active missions.
        sql`(${missions.endsAt} is null or ${missions.endsAt} > now() - make_interval(hours => ${EVENT_GRACE_HOURS}))`,
      ),
    );
  return row.n;
}

/** Extra member allowance from paid one-off events around now (src/lib/saas/events.ts). */
export async function orgEventAllowance(orgId: string, now: Date = new Date()): Promise<number> {
  const paid = await db
    .select({ eventPaidAt: missions.eventPaidAt, eventPackage: missions.eventPackage, startsAt: missions.startsAt, endsAt: missions.endsAt })
    .from(missions)
    .where(and(eq(missions.organizationId, orgId), isNotNull(missions.eventPaidAt)));
  return eventMemberAllowance(paid, now);
}

/** Events (missions with a time window) of an organization, with participation numbers. */
export async function orgEvents(orgId: string) {
  return db
    .select({
      id: missions.id,
      title: missions.title,
      category: missions.category,
      startsAt: missions.startsAt,
      endsAt: missions.endsAt,
      eventPackage: missions.eventPackage,
      eventPaidAt: missions.eventPaidAt,
      isActive: missions.isActive,
      people: sql<number>`(select count(distinct s.user_id)::int from submissions s where s.mission_id = ${missions.id} and s.status = 'approved')`,
      actions: sql<number>`(select count(*)::int from submissions s where s.mission_id = ${missions.id} and s.status = 'approved')`,
      pending: sql<number>`(select count(*)::int from submissions s where s.mission_id = ${missions.id} and s.status = 'pending')`,
      checkins: sql<number>`(select count(*)::int from event_checkins c where c.mission_id = ${missions.id})`,
    })
    .from(missions)
    .where(and(eq(missions.organizationId, orgId), isNotNull(missions.startsAt)))
    .orderBy(desc(missions.startsAt));
}

/** Points / approved actions earned on the organization's missions, per member. */
export async function orgRanking(orgId: string, limit = 50) {
  return db
    .select({
      userId: users.id,
      name: users.name,
      memberId: organizationMembers.id,
      role: organizationMembers.role,
      joinedAt: organizationMembers.joinedAt,
      points: sql<number>`coalesce((
        select sum(pl.points)::int from points_ledger pl
        join submissions s on s.id = pl.submission_id
        join missions m on m.id = s.mission_id
        where pl.user_id = ${users.id} and m.organization_id = ${orgId}
      ), 0)`.as("org_points"),
      actions: sql<number>`coalesce((
        select count(*)::int from submissions s
        join missions m on m.id = s.mission_id
        where s.user_id = ${users.id} and s.status = 'approved' and m.organization_id = ${orgId}
      ), 0)`.as("org_actions"),
    })
    .from(organizationMembers)
    .innerJoin(users, eq(users.id, organizationMembers.userId))
    .where(and(eq(organizationMembers.organizationId, orgId), sql`${users.deletedAt} is null`))
    .orderBy(desc(sql`org_points`), asc(users.name))
    .limit(limit);
}

export async function orgImpact(orgId: string) {
  const [totals] = await db
    .select({
      actions: sql<number>`count(*)::int`,
      people: sql<number>`count(distinct ${submissions.userId})::int`,
      points: sql<number>`coalesce(sum(${pointsLedger.points}), 0)::int`,
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .leftJoin(pointsLedger, eq(pointsLedger.submissionId, submissions.id))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "approved")));
  const byCategory = await db
    .select({ category: missions.category, count: sql<number>`count(*)::int` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "approved")))
    .groupBy(missions.category)
    .orderBy(desc(sql`count(*)`));
  const byMonth = await db
    .select({
      month: sql<string>`to_char(date_trunc('month', ${submissions.reviewedAt} at time zone 'America/Recife'), 'YYYY-MM')`,
      count: sql<number>`count(*)::int`,
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "approved")))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  const [first] = await db
    .select({ first: sql<string | null>`min(${submissions.reviewedAt})` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "approved")));
  const [recycled] = await db
    .select({ kg: sql<string>`coalesce(sum(${submissions.weightKg}), 0)::text` })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(eq(missions.organizationId, orgId), eq(submissions.status, "approved")));
  return { ...totals, recycledKg: Number(recycled?.kg ?? 0), byCategory, byMonth, since: first?.first ?? null };
}
