"use server";

import { canReview } from "@/lib/nav";
import { moderatorsEnabled } from "@/lib/staff-config";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { db } from "@/db";
import { missionRequests, missions, missionSuggestions, notifications, users } from "@/db/schema";
import { tx as tr } from "@/lib/i18n";
import { getCurrentUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import {
  DEFAULT_REGION_RADIUS_KM,
  isRegionRadius,
  isValidCoord,
  municipalityForGps,
  regionFromMunicipality,
  searchMunicipalities,
  worldRegion,
  type RegionRadius,
} from "@/lib/region";
import { lookupPlaceName } from "@/lib/regional/place-name";
import { MUNICIPALITIES, municipalityByIbge, placeOf } from "@/lib/municipalities";
import { clearRegionCookie, getRegion, writeRegion } from "@/lib/regional/cookie";

export type RegionActionState = { error?: string; success?: boolean; city?: string };

const CATEGORIES = ["planting", "donation", "recycling", "cleanup", "other"] as const;
type Category = (typeof CATEGORIES)[number];
/** Points of a mission created from a community suggestion. */
const SUGGESTION_POINTS: Record<Category, number> = { planting: 60, donation: 40, recycling: 25, cleanup: 50, other: 30 };
const MAX_PENDING_SUGGESTIONS = 3;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

async function currentRadius(): Promise<RegionRadius> {
  return (await getRegion())?.radiusKm ?? DEFAULT_REGION_RADIUS_KM;
}

/**
 * GPS reading → closest Brazilian municipality, or (anywhere else in the world) the area around the
 * reading, named from OpenStreetMap. The coordinates are rounded (~1 km) and only kept in a cookie.
 */
export async function setRegionFromLocationAction(latitude: number, longitude: number): Promise<RegionActionState> {
  const user = await requireUser();
  latitude = Number(latitude);
  longitude = Number(longitude);
  if (!isValidCoord(latitude, longitude)) return { error: "invalid" };
  const radius = await currentRadius();
  const municipality = municipalityForGps(MUNICIPALITIES, latitude, longitude);
  if (municipality) {
    await writeRegion(regionFromMunicipality(municipality, radius, "gps", { lat: latitude, lng: longitude }));
    revalidatePath("/missions");
    return { success: true, city: municipality[1] };
  }
  if (!rateLimit(`region-world:${user.id}`, 20, 3_600_000)) return { error: "limit" };
  const lat = Math.round(latitude * 100) / 100;
  const lng = Math.round(longitude * 100) / 100;
  const region = worldRegion(lat, lng, radius, await lookupPlaceName(lat, lng, user.language), user.language);
  await writeRegion(region);
  revalidatePath("/missions");
  return { success: true, city: region.city };
}

export async function setRegionFromCityAction(ibge: number): Promise<RegionActionState> {
  await requireUser();
  const municipality = municipalityByIbge(Number(ibge));
  if (!municipality) return { error: "invalid" };
  await writeRegion(regionFromMunicipality(municipality, await currentRadius(), "manual"));
  revalidatePath("/missions");
  return { success: true, city: municipality[1] };
}

export async function setRegionRadiusAction(radiusKm: number): Promise<RegionActionState> {
  await requireUser();
  const region = await getRegion();
  if (!region || !isRegionRadius(radiusKm)) return { error: "invalid" };
  await writeRegion({ ...region, radiusKm: Number(radiusKm) as RegionRadius });
  revalidatePath("/missions");
  return { success: true };
}

export async function clearRegionAction(): Promise<RegionActionState> {
  await requireUser();
  await clearRegionCookie();
  revalidatePath("/missions");
  return { success: true };
}

export async function searchCitiesAction(query: string): Promise<{ ibge: number; name: string; uf: string }[]> {
  const user = await requireUser();
  if (!rateLimit(`city-search:${user.id}`, 120, 60_000)) return [];
  return searchMunicipalities(MUNICIPALITIES, String(query ?? "").slice(0, 60)).map(([ibge, name, uf]) => ({ ibge, name, uf }));
}

/** "I want more missions here": one request per person per municipality. Stores the city, not the location. */
export async function requestMissionsHereAction(): Promise<RegionActionState> {
  const user = await requireUser();
  const region = await getRegion();
  if (!region) return { error: "invalid" };
  await db
    .insert(missionRequests)
    .values({ userId: user.id, ibgeCode: region.ibge, city: region.city, stateCode: region.uf })
    .onConflictDoNothing();
  revalidatePath("/missions");
  revalidatePath("/admin");
  return { success: true };
}

/** A community member proposes an action at the place where they are (moderators review it). */
export async function suggestMissionAction(_prev: RegionActionState, formData: FormData): Promise<RegionActionState> {
  const user = await requireUser();
  if (user.isBanned) return { error: "banned" };
  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const coordinate = (name: string) => {
    const raw = String(formData.get(name) ?? "").trim();
    return raw === "" ? NaN : Number(raw);
  };
  const latitude = coordinate("latitude");
  const longitude = coordinate("longitude");
  if (
    title.length < 5 || title.length > 120 ||
    description.length < 30 || description.length > 1000 ||
    !CATEGORIES.includes(category) ||
    !Number.isFinite(latitude) || !Number.isFinite(longitude) ||
    Math.abs(latitude) > 90 || Math.abs(longitude) > 180
  ) {
    return { error: "invalid" };
  }
  if (!rateLimit(`suggest:${user.id}`, 10, 3_600_000)) return { error: "limit" };
  const [{ value: pending }] = await db
    .select({ value: count() })
    .from(missionSuggestions)
    .where(and(eq(missionSuggestions.userId, user.id), eq(missionSuggestions.status, "pending")));
  if (pending >= MAX_PENDING_SUGGESTIONS) return { error: "limit" };

  await db.insert(missionSuggestions).values({
    userId: user.id,
    title,
    description,
    category,
    latitude: latitude.toFixed(6),
    longitude: longitude.toFixed(6),
    ...placeOf(latitude, longitude),
  });
  revalidatePath("/moderation");
  return { success: true };
}

async function assertModerator() {
  const user = await requireUser();
  if (!canReview(user.role, moderatorsEnabled())) redirect("/missions");
  return user;
}

/** Approving turns the suggestion into a points-only mission; an admin sets the FONE reward later. */
export async function reviewSuggestionAction(suggestionId: string, approve: boolean): Promise<RegionActionState> {
  const moderator = await assertModerator();
  const [suggestion] = await db.select().from(missionSuggestions).where(eq(missionSuggestions.id, suggestionId)).limit(1);
  if (!suggestion || suggestion.status !== "pending") return { error: "invalid" };

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(missionSuggestions)
      .set({ status: approve ? "approved" : "rejected", reviewedBy: moderator.id, reviewedAt: new Date() })
      .where(and(eq(missionSuggestions.id, suggestionId), eq(missionSuggestions.status, "pending")))
      .returning({ id: missionSuggestions.id });
    if (updated.length === 0) return;

    if (approve) {
      const [mission] = await tx
        .insert(missions)
        .values({
          title: suggestion.title,
          description: suggestion.description,
          context: "Fotografe a ação concluída no local, mostrando o resultado (ex.: sacos de lixo recolhidos, muda plantada).",
          impact: "Ação proposta por alguém da comunidade para cuidar do próprio bairro.",
          latitude: suggestion.latitude,
          longitude: suggestion.longitude,
          scope: "local",
          city: suggestion.city,
          stateCode: suggestion.stateCode,
          ibgeCode: suggestion.ibgeCode,
          origin: "suggestion",
          needsReview: true,
          category: suggestion.category,
          pointsReward: SUGGESTION_POINTS[suggestion.category],
          foneReward: "0.00",
          createdBy: moderator.id,
        })
        .returning({ id: missions.id });
      await tx.update(missionSuggestions).set({ missionId: mission.id }).where(eq(missionSuggestions.id, suggestionId));
    }

    const [author] = await tx.select({ language: users.language }).from(users).where(eq(users.id, suggestion.userId)).limit(1);
    const lang = author?.language ?? "en";
    const name = suggestion.title;
    await tx.insert(notifications).values({
      userId: suggestion.userId,
      type: "system",
      title: approve
        ? tr(lang, "Sua sugestão virou missão! 🌱", "Your suggestion became a mission! 🌱", "¡Tu sugerencia se volvió misión! 🌱")
        : tr(lang, "Sugestão analisada", "Suggestion reviewed", "Sugerencia revisada"),
      message: approve
        ? tr(
            lang,
            `"${name}" agora é uma missão para todo mundo da região. Obrigado por cuidar do seu bairro!`,
            `"${name}" is now a mission for everyone in the area. Thanks for caring for your neighbourhood!`,
            `"${name}" ahora es una misión para todos en la región. ¡Gracias por cuidar tu barrio!`,
          )
        : tr(
            lang,
            `Sua sugestão "${name}" não foi aprovada desta vez. Você pode sugerir outra ação.`,
            `Your suggestion "${name}" was not approved this time. You can suggest another action.`,
            `Tu sugerencia "${name}" no fue aprobada esta vez. Puedes sugerir otra acción.`,
          ),
    });
  });

  revalidatePath("/moderation");
  revalidatePath("/missions");
  revalidatePath("/admin");
  return { success: true };
}
