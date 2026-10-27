import "server-only";
import { cookies } from "next/headers";
import { parseRegion, type Region } from "@/lib/region";

/** Device-only region choice (rounded coordinates + city). Never stored in the database. */
export const REGION_COOKIE = "ev_region";
const MAX_AGE = 60 * 60 * 24 * 180;

export async function getRegion(): Promise<Region | null> {
  const raw = (await cookies()).get(REGION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return parseRegion(JSON.parse(raw));
  } catch {
    return null;
  }
}

export async function writeRegion(region: Region) {
  (await cookies()).set(REGION_COOKIE, JSON.stringify(region), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearRegionCookie() {
  (await cookies()).delete(REGION_COOKIE);
}
