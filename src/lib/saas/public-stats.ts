import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { missions, rewardQueue, submissions } from "@/db/schema";
import { foneToCents } from "@/lib/fone";
import type { LandingStats } from "@/components/marketing/landing";

/** Headline numbers of the landing page (same sources as /transparencia). */
export async function publicStats(): Promise<LandingStats> {
  const [impact] = await db
    .select({
      actions: sql<number>`count(*)::int`,
      people: sql<number>`count(distinct ${submissions.userId})::int`,
      cities: sql<number>`count(distinct ${missions.ibgeCode})::int`,
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(eq(submissions.status, "approved"));
  const [fone] = await db
    .select({ paid: sql<string>`coalesce(sum(${rewardQueue.foneAmount}) filter (where ${rewardQueue.status} = 'paid'), 0)::text` })
    .from(rewardQueue);
  return { actions: impact.actions, people: impact.people, cities: impact.cities, foneCents: foneToCents(fone.paid) };
}
