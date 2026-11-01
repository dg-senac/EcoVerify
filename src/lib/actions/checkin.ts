"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { eventCheckins, missions } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { membershipRole } from "@/lib/saas/orgs";
import { canManage } from "@/lib/saas/org-rules";
import {
  checkinCode,
  checkinCodeExpiresAt,
  checkinPhase,
  checkinQrPayload,
  checkinWindow,
  isValidCheckinCode,
  parseCheckinQr,
  type CheckinError,
} from "@/lib/saas/checkin";

const MINUTE = 60_000;

/** The participant reads the organizer's QR (or types the 6 digits) at the event. */
export async function checkInAction(missionId: string, raw: string): Promise<{ error?: CheckinError; checkedInAt?: string }> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (!rateLimit(`checkin:${user.id}`, 20, 10 * MINUTE)) return { error: "too_many" };
  const parsed = parseCheckinQr(raw);
  if (!parsed) return { error: "invalid_code" };
  if (parsed.missionId && parsed.missionId !== missionId) return { error: "wrong_event" };
  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission || !mission.isActive || !mission.organizationId) return { error: "wrong_event" };
  const phase = checkinPhase(mission);
  if (phase === null) return { error: "wrong_event" };
  if (phase !== "open") return { error: phase };
  if (!(await membershipRole(mission.organizationId, user.id))) return { error: "not_member" };
  // No secret yet = the organizer never showed the QR, so no code can be right.
  if (!mission.checkinSecret || !(await isValidCheckinCode(mission.checkinSecret, mission.id, parsed.code))) return { error: "invalid_code" };
  await db.insert(eventCheckins).values({ missionId, userId: user.id }).onConflictDoNothing();
  const [row] = await db
    .select({ createdAt: eventCheckins.createdAt })
    .from(eventCheckins)
    .where(and(eq(eventCheckins.missionId, missionId), eq(eventCheckins.userId, user.id)))
    .limit(1);
  revalidatePath(`/missions/${missionId}/submit`);
  return { checkedInAt: (row?.createdAt ?? new Date()).toISOString() };
}

export type CheckinDisplayData = { error?: "forbidden" | "not_event"; code?: string; payload?: string; expiresAt?: string; present?: number };

/** The organizer's screen: the current rotating code + how many people checked in. Managers only. */
export async function checkinCodeAction(missionId: string): Promise<CheckinDisplayData> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const [mission] = await db.select().from(missions).where(eq(missions.id, missionId)).limit(1);
  if (!mission?.organizationId) return { error: "not_event" };
  if (!canManage(await membershipRole(mission.organizationId, user.id))) return { error: "forbidden" };
  if (checkinPhase(mission) === null) return { error: "not_event" };
  let secret = mission.checkinSecret;
  if (!secret) {
    // Created the first time the QR is shown; the conditional update keeps two screens in sync.
    await db.update(missions).set({ checkinSecret: randomBytes(32).toString("hex") }).where(and(eq(missions.id, missionId), isNull(missions.checkinSecret)));
    [{ secret }] = await db.select({ secret: missions.checkinSecret }).from(missions).where(eq(missions.id, missionId)).limit(1);
  }
  const now = new Date();
  const code = await checkinCode(secret!, missionId, checkinWindow(now));
  const [{ present }] = await db.select({ present: count() }).from(eventCheckins).where(eq(eventCheckins.missionId, missionId));
  return { code, payload: checkinQrPayload(missionId, code), expiresAt: checkinCodeExpiresAt(now).toISOString(), present };
}
