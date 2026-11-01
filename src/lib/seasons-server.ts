import "server-only";
import { and, eq, gte, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, organizationMembers, organizations, pointsLedger, submissions, users } from "@/db/schema";
import {
  previousSeason,
  schoolCup,
  seasonAt,
  seasonRanking,
  type CupMembership,
  type CupSchool,
  type CupStanding,
  type PointEntry,
  type Ranked,
  type Season,
} from "@/lib/seasons";

export type SeasonPerson = { id: string; name: string };

export interface SeasonBoard {
  season: Season;
  previous: Season;
  people: Ranked<SeasonPerson>[];
  previousPeople: Ranked<SeasonPerson>[];
  cup: CupStanding[];
  previousCup: CupStanding[];
  /** School the viewer counts for in the Cup (first school joined), if any. */
  mySchoolId: string | null;
}

/**
 * Ledger rows of the current and the previous season (docs/COPA.md). Raw rows keep the rules in the
 * pure, tested src/lib/seasons.ts; at large scale, move the sums to SQL (group by user, cup flag).
 */
async function loadEntries(from: Date, to: Date): Promise<PointEntry[]> {
  const rows = await db
    .select({
      userId: pointsLedger.userId,
      points: pointsLedger.points,
      at: pointsLedger.createdAt,
      orgMission: sql<boolean>`${missions.organizationId} is not null`,
    })
    .from(pointsLedger)
    .leftJoin(submissions, eq(submissions.id, pointsLedger.submissionId))
    .leftJoin(missions, eq(missions.id, submissions.missionId))
    .where(and(gte(pointsLedger.createdAt, from), lt(pointsLedger.createdAt, to)));
  return rows.map((r) => ({ userId: r.userId, points: r.points, at: r.at, cup: !r.orgMission }));
}

export async function loadSeasonBoard(viewerId: string, now = new Date()): Promise<SeasonBoard> {
  const season = seasonAt(now);
  const previous = previousSeason(season);
  const [entries, people, schools, memberships] = await Promise.all([
    loadEntries(previous.start, season.end),
    // Only citizens in good standing appear (staff never play).
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.role, "citizen"), eq(users.isBanned, false), isNull(users.deletedAt))),
    db
      .select({ id: organizations.id, name: organizations.name, city: organizations.city })
      .from(organizations)
      .where(eq(organizations.type, "school")),
    db
      .select({ orgId: organizationMembers.organizationId, userId: organizationMembers.userId, joinedAt: organizationMembers.joinedAt })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizations.type, "school"), eq(users.isBanned, false), isNull(users.deletedAt))),
  ]);
  return buildBoard({ season, previous, entries, people, schools, memberships, viewerId });
}

export function buildBoard(input: {
  season: Season;
  previous: Season;
  entries: PointEntry[];
  people: SeasonPerson[];
  schools: CupSchool[];
  memberships: CupMembership[];
  viewerId: string;
}): SeasonBoard {
  const { season, previous, entries, people, schools, memberships } = input;
  const mine = memberships
    .filter((m) => m.userId === input.viewerId)
    .sort((a, b) => new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime() || a.orgId.localeCompare(b.orgId))[0];
  return {
    season,
    previous,
    people: seasonRanking(people, entries, season),
    previousPeople: seasonRanking(people, entries, previous).filter((r) => r.position <= 3),
    cup: schoolCup({ schools, memberships, entries, season }),
    previousCup: schoolCup({ schools, memberships, entries, season: previous }).filter((r) => r.position !== null && r.position <= 3),
    mySchoolId: mine?.orgId ?? null,
  };
}

/** Cup standing of one school this season (organization pages). */
export async function schoolCupStanding(orgId: string, now = new Date()): Promise<{ season: Season; standing: CupStanding | null }> {
  const season = seasonAt(now);
  const [entries, schools, memberships] = await Promise.all([
    loadEntries(season.start, season.end),
    db.select({ id: organizations.id, name: organizations.name, city: organizations.city }).from(organizations).where(eq(organizations.type, "school")),
    db
      .select({ orgId: organizationMembers.organizationId, userId: organizationMembers.userId, joinedAt: organizationMembers.joinedAt })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .innerJoin(users, eq(users.id, organizationMembers.userId))
      .where(and(eq(organizations.type, "school"), eq(users.isBanned, false), isNull(users.deletedAt))),
  ]);
  const standing = schoolCup({ schools, memberships, entries, season }).find((s) => s.school.id === orgId) ?? null;
  return { season, standing };
}
