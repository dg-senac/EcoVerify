import "server-only";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, organizationMembers, organizations, pointsLedger, submissions, users } from "@/db/schema";
import type { OrgRole } from "@/lib/saas/org-rules";

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
    .where(and(eq(missions.organizationId, orgId), eq(missions.isActive, true)));
  return row.n;
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
  return { ...totals, byCategory, byMonth, since: first?.first ?? null };
}
