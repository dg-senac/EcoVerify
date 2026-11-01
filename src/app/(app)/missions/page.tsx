import { eq, and, not, inArray, count, isNull, sql } from "drizzle-orm";
import { EVENT_GRACE_HOURS } from "@/lib/saas/events";
import { after } from "next/server";
import Link from "next/link";
import { db } from "@/db";
import { missionRequests, missions, organizations, quizAttempts, submissions } from "@/db/schema";
import { quizDay, quizText } from "@/lib/quiz";
import { QuizCard, QUIZ_CARD_BUTTON } from "@/components/quiz/quiz-view";
import { DumpCta, DUMP_CTA_BUTTON } from "@/components/dumps/dump-cta";
import { dumpText } from "@/lib/dumps";
import { mapText } from "@/lib/map";
import { myOrganizationIds } from "@/lib/saas/orgs";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { citizenOnly } from "@/lib/role-guard";
import { t, tf, type Lang } from "@/lib/i18n";
import { MissionCard, type MissionCardData } from "@/components/missions/mission-card";
import { RegionBar } from "@/components/missions/region-bar";
import { WantMoreButton } from "@/components/missions/want-more-button";
import { Sprout } from "@/components/ui/icons";
import { groupMissionsByRegion, MIN_LOCAL_MISSIONS } from "@/lib/region";
import { getRegion } from "@/lib/regional/cookie";
import { sponsorBalances } from "@/lib/payouts";
import { centsToFone } from "@/lib/fone";
import { osmAutoMissionsEnabled, regionSeedState, seedRegionFromOsm } from "@/lib/regional/osm";

type MissionRow = typeof missions.$inferSelect;

/** Remaining FONE per sponsor (filled once per request when a listed mission is sponsored). */
type SponsorLeft = Map<string, string>;

function toCard(mission: MissionRow & { distanceKm?: number }, sponsorLeft?: SponsorLeft): MissionCardData {
  return {
    id: mission.id,
    title: mission.title,
    titleEn: mission.titleEn,
    titleEs: mission.titleEs,
    description: mission.description,
    descriptionEn: mission.descriptionEn,
    descriptionEs: mission.descriptionEs,
    category: mission.category,
    pointsReward: mission.pointsReward,
    foneReward: mission.foneReward,
    scope: mission.scope,
    origin: mission.origin,
    needsReview: mission.needsReview,
    sponsorName: mission.sponsorName,
    sponsorRemainingFone: mission.sponsorId ? (sponsorLeft?.get(mission.sponsorId) ?? "0.00") : null,
    city: mission.city,
    stateCode: mission.stateCode,
    distanceKm: mission.distanceKm,
    startsAt: mission.startsAt,
    endsAt: mission.endsAt,
  };
}

function Grid({ lang, items, sponsorLeft }: { lang: Lang; items: (MissionRow & { distanceKm?: number })[]; sponsorLeft?: SponsorLeft }) {
  return (
    <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((mission) => (
        <MissionCard key={mission.id} lang={lang} mission={toCard(mission, sponsorLeft)} />
      ))}
    </div>
  );
}

export default async function MissionsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const lang = user.language;

  const userSubmissions = await db
    .select({ missionId: submissions.missionId })
    .from(submissions)
    // Rejected submissions don't block the mission: the user can try again.
    .where(and(eq(submissions.userId, user.id), inArray(submissions.status, ["pending", "approved"])));

  const completedMissionIds = userSubmissions.map((s) => s.missionId);

  const notDone = completedMissionIds.length > 0 ? not(inArray(missions.id, completedMissionIds)) : undefined;
  // Public missions only; organization missions are listed separately for their members.
  const activeMissions = await db
    .select()
    .from(missions)
    .where(and(eq(missions.isActive, true), isNull(missions.organizationId), notDone));

  const orgIds = await myOrganizationIds(user.id);
  const orgMissionRows = orgIds.length
    ? await db
        .select({ mission: missions, orgName: organizations.name, orgSlug: organizations.slug })
        .from(missions)
        .innerJoin(organizations, eq(organizations.id, missions.organizationId))
        .where(
          and(
            eq(missions.isActive, true),
            inArray(missions.organizationId, orgIds),
            notDone,
            // Finished events leave the list (the organization still sees them in its Events tab).
            sql`(${missions.endsAt} is null or ${missions.endsAt} > now() - make_interval(hours => ${EVENT_GRACE_HOURS}))`,
          ),
        )
    : [];
  const orgText = ORG_TEXT[lang];
  const orgSection =
    orgMissionRows.length > 0 ? (
      <section className="mt-6" data-testid="section-org">
        <h2 className="text-lg font-bold text-slate-900">
          🏫 {orgText.sectionMine} <span className="text-sm font-semibold text-slate-400">({orgMissionRows.length})</span>
        </h2>
        <p className="text-sm text-slate-500">
          {[...new Map(orgMissionRows.map((r) => [r.orgSlug, r.orgName])).entries()].map(([slug, name], i) => (
            <span key={slug}>
              {i > 0 && " · "}
              <Link href={`/org/${slug}`} className="font-semibold text-emerald-700 hover:underline">
                {name}
              </Link>
            </span>
          ))}{" "}
          · {orgText.privateBadge}
        </p>
        <Grid lang={lang} items={orgMissionRows.map((r) => r.mission)} />
      </section>
    ) : null;

  const sponsorLeft: SponsorLeft = new Map();
  if (activeMissions.some((mission) => mission.sponsorId)) {
    for (const sponsor of await sponsorBalances()) sponsorLeft.set(sponsor.id, centsToFone(sponsor.remainingCents));
  }

  const region = await getRegion();
  const [quizToday] = await db
    .select({ points: quizAttempts.points, finishedAt: quizAttempts.finishedAt })
    .from(quizAttempts)
    .where(and(eq(quizAttempts.userId, user.id), eq(quizAttempts.day, quizDay())))
    .limit(1);
  const quizDone = quizToday?.finishedAt ? quizToday.points : null;
  const extras = (
    <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2" data-testid="mission-extras">
      <QuizCard
        lang={lang}
        donePoints={quizDone}
        action={
          quizDone === null ? (
            <Link href="/quiz" className={QUIZ_CARD_BUTTON}>
              {quizText(lang).play}
            </Link>
          ) : null
        }
      />
      <DumpCta
        lang={lang}
        action={
          <Link href="/lixo" className={DUMP_CTA_BUTTON}>
            {dumpText(lang).cardAction}
          </Link>
        }
      />
    </div>
  );
  const header = (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">{t(lang, "missions_title")}</h1>
          <p className="mt-1 text-sm text-slate-500">{t(lang, "missions_subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href="/mapa"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100"
            data-testid="missions-map-link"
          >
            🗺️ {mapText(lang).seeOnMap}
          </Link>
          <Link
            href="/missions/suggest"
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            🙋 {t(lang, "region_suggest")}
          </Link>
        </div>
      </div>
      <RegionBar lang={lang} region={region} />
      {extras}
    </>
  );

  // ---- No region chosen: the full list, as before ---------------------------
  if (!region) {
    return (
      <div>
        {header}
        {orgSection}
        {activeMissions.length === 0 && !orgSection ? (
          <div className="mt-10 rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-400">
            <Sprout className="h-16 w-16 mx-auto" />
            <p className="mt-3 text-sm font-medium">{t(lang, "missions_empty")}</p>
          </div>
        ) : (
          <div className="mt-2">
            <Grid lang={lang} sponsorLeft={sponsorLeft} items={activeMissions} />
          </div>
        )}
      </div>
    );
  }

  // ---- Region chosen: nearby (closest first) + anywhere ---------------------
  const { nearby, anywhere, elsewhere } = groupMissionsByRegion(activeMissions, region);

  // Count all local missions of the region (including ones this user already did) to decide
  // whether it needs automatic supply.
  const regionalTotal = groupMissionsByRegion(
    (await db.select().from(missions).where(and(eq(missions.isActive, true), eq(missions.scope, "local"), isNull(missions.organizationId)))),
    region,
  ).nearby.length;
  let seeding = false;
  if (regionalTotal < MIN_LOCAL_MISSIONS && osmAutoMissionsEnabled()) {
    const state = await regionSeedState(region.ibge);
    seeding = state.running || state.due;
    if (state.due) after(() => seedRegionFromOsm(region));
  }

  const [{ value: requestCount }] = await db
    .select({ value: count() })
    .from(missionRequests)
    .where(eq(missionRequests.ibgeCode, region.ibge));
  const [mine] = await db
    .select({ id: missionRequests.id })
    .from(missionRequests)
    .where(and(eq(missionRequests.ibgeCode, region.ibge), eq(missionRequests.userId, user.id)))
    .limit(1);

  const wantMore = (
    <div className="flex flex-wrap items-center gap-3">
      <WantMoreButton lang={lang} requested={!!mine} />
      <Link href="/missions/suggest" className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
        🙋 {t(lang, "region_suggest")}
      </Link>
      {requestCount > 0 && (
        <span className="text-xs text-slate-500" data-testid="want-more-count">
          {tf(lang, "region_want_more_count", { n: requestCount, city: region.city })}
        </span>
      )}
    </div>
  );

  return (
    <div>
      {header}
      {orgSection}

      <section className="mt-6" data-testid="section-nearby">
        <h2 className="text-lg font-bold text-slate-900">
          📍 {t(lang, "region_section_nearby")} <span className="text-sm font-semibold text-slate-400">({nearby.length})</span>
        </h2>
        {seeding && (
          <p className="mt-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" data-testid="region-seeding">
            🗺️ {t(lang, "region_seeding")}
          </p>
        )}
        {nearby.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center" data-testid="region-empty">
            <Sprout className="mx-auto h-12 w-12 text-slate-300" />
            <p className="mt-2 font-bold text-slate-800">{t(lang, "region_empty_title")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{tf(lang, "region_empty_text", { city: region.city })}</p>
            <div className="mt-4 flex justify-center">{wantMore}</div>
          </div>
        ) : (
          <>
            <Grid lang={lang} sponsorLeft={sponsorLeft} items={nearby} />
            {nearby.length < MIN_LOCAL_MISSIONS && <div className="mt-4">{wantMore}</div>}
          </>
        )}
      </section>

      {anywhere.length > 0 && (
        <section className="mt-8" data-testid="section-anywhere">
          <h2 className="text-lg font-bold text-slate-900">
            🌎 {t(lang, "region_section_anywhere")} <span className="text-sm font-semibold text-slate-400">({anywhere.length})</span>
          </h2>
          <p className="text-sm text-slate-500">{t(lang, "region_anywhere_hint")}</p>
          <Grid lang={lang} sponsorLeft={sponsorLeft} items={anywhere} />
        </section>
      )}

      {elsewhere > 0 && (
        <p className="mt-8 text-center text-xs text-slate-400" data-testid="region-elsewhere">
          {tf(lang, "region_elsewhere", { n: elsewhere })}
        </p>
      )}
    </div>
  );
}
