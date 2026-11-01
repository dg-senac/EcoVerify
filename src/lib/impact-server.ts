import "server-only";
import { and, between, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { missions, submissions } from "@/db/schema";
import type { ImpactRow } from "@/lib/impact";

/** Reports cover the last 24 months (enough for yearly comparisons, keeps the query small). */
const REPORT_MONTHS = 24;

/**
 * Approved proofs as ImpactRows for the recycling and data reports (admin only).
 * Uses the mission point, never the GPS reading of the person.
 */
export async function loadImpactRows(near?: { lat: number; lng: number; km: number }): Promise<ImpactRow[]> {
  const since = new Date();
  since.setUTCMonth(since.getUTCMonth() - REPORT_MONTHS);
  const rows = await db
    .select({
      submissionId: submissions.id,
      userId: submissions.userId,
      reviewedAt: submissions.reviewedAt,
      submittedAt: submissions.submittedAt,
      category: missions.category,
      missionTitle: missions.title,
      scope: missions.scope,
      city: missions.city,
      stateCode: missions.stateCode,
      latitude: missions.latitude,
      longitude: missions.longitude,
      material: submissions.material,
      weightKg: submissions.weightKg,
      itemCount: submissions.itemCount,
      weightSource: submissions.weightSource,
    })
    .from(submissions)
    .innerJoin(missions, eq(missions.id, submissions.missionId))
    .where(
      and(
        eq(submissions.status, "approved"),
        gte(submissions.submittedAt, since),
        // Map: only missions inside the bounding box of the region (the exact radius is applied later).
        ...(near
          ? [
              between(missions.latitude, String(near.lat - near.km / 111), String(near.lat + near.km / 111)),
              between(missions.longitude, String(near.lng - near.km / (111 * Math.max(0.2, Math.cos((near.lat * Math.PI) / 180)))), String(near.lng + near.km / (111 * Math.max(0.2, Math.cos((near.lat * Math.PI) / 180))))),
            ]
          : []),
      ),
    );

  return rows.map((row) => ({
    submissionId: row.submissionId,
    userId: row.userId,
    approvedAt: (row.reviewedAt ?? row.submittedAt).toISOString(),
    category: row.category,
    missionTitle: row.missionTitle,
    scope: row.scope,
    city: row.city,
    stateCode: row.stateCode,
    latitude: row.latitude === null ? null : Number(row.latitude),
    longitude: row.longitude === null ? null : Number(row.longitude),
    material: row.material,
    weightKg: row.weightKg === null ? null : Number(row.weightKg),
    itemCount: row.itemCount,
    weightSource: row.weightSource,
  }));
}
