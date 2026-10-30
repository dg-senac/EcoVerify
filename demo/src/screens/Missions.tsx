import { useEffect, useState } from "react";
import { Sprout } from "lucide-react";
import { t, tf } from "@/lib/i18n";
import { groupMissionsByRegion, MIN_LOCAL_MISSIONS } from "@/lib/region";
import { myOrgs, requestMissionsHere, seedExampleMissions, useLang, useStore, type Mission, type User, type SubmissionStatus } from "../store";
import { ORG_TEXT } from "@/lib/saas/org-text";
import { eventPhase } from "@/lib/saas/events";
import { Link } from "../router";
import { MissionCard } from "../components/MissionCard";
import { RegionBar } from "../components/RegionBar";
import { EmptyState, PageHeader, btnPrimary } from "../components/ui";
import { dt } from "../i18n";

function Grid({ items, myStatus }: { items: (Mission & { distanceKm?: number })[]; myStatus: Map<string, SubmissionStatus> }) {
  const lang = useLang();
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((mission) => (
        <MissionCard key={mission.id} lang={lang} mission={mission} distanceKm={mission.distanceKm} myStatus={myStatus.get(mission.id)} />
      ))}
    </div>
  );
}

export function MissionsScreen({ user }: { user: User }) {
  const lang = useLang();
  const missions = useStore((s) => s.missions);
  const submissions = useStore((s) => s.submissions);
  const region = useStore((s) => s.region ?? null);
  const requests = useStore((s) => s.missionRequests ?? []);
  const seeded = useStore((s) => s.seededCities ?? []);
  const orgs = useStore((s) => myOrgs(s, user.id));
  const active = missions.filter((m) => m.isActive && !m.organizationId);
  const orgIds = new Set(orgs.map((o) => o.org.id));
  // Finished events leave the list (the organization still sees them in its Events tab).
  const orgMissions = missions.filter((m) => m.isActive && m.organizationId && orgIds.has(m.organizationId) && eventPhase(m) !== "closed");
  const [seeding, setSeeding] = useState(false);

  // Latest status of my submission for each mission (a rejected one can be resent).
  const myStatus = new Map<string, SubmissionStatus>();
  for (const sub of [...submissions].filter((s) => s.userId === user.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))) {
    myStatus.set(sub.missionId, sub.status);
  }

  const grouped = region ? groupMissionsByRegion(active.map((m) => ({ ...m, scope: m.scope ?? "local" })), region) : null;
  const needsSupply = !!region && !!grouped && grouped.nearby.length < MIN_LOCAL_MISSIONS && !seeded.includes(region.ibge);

  // Offline stand-in for the OpenStreetMap search: example places appear after a short "search".
  useEffect(() => {
    if (!needsSupply || !region) return;
    const start = setTimeout(() => setSeeding(true), 0);
    const timer = setTimeout(() => {
      seedExampleMissions(region);
      setSeeding(false);
    }, 1500);
    return () => {
      clearTimeout(start);
      clearTimeout(timer);
    };
  }, [needsSupply, region]);

  const orgText = ORG_TEXT[lang];
  const header = (
    <>
      <PageHeader title={t(lang, "missions_title")} subtitle={t(lang, "missions_subtitle")} icon={Sprout} />
      {orgMissions.length > 0 && (
        <section className="mb-8" data-testid="section-org">
          <h2 className="text-lg font-bold text-slate-900">
            🏫 {orgText.sectionMine} <span className="text-sm font-semibold text-slate-400">({orgMissions.length})</span>
          </h2>
          <p className="mb-3 text-sm text-slate-500">
            {orgs
              .filter((o) => orgMissions.some((m) => m.organizationId === o.org.id))
              .map((o, i) => (
                <span key={o.org.id}>
                  {i > 0 && " · "}
                  <Link to={`/org/${o.org.slug}`} className="font-semibold text-emerald-700 hover:underline">
                    {o.org.name}
                  </Link>
                </span>
              ))}{" "}
            · {orgText.privateBadge}
          </p>
          <Grid items={orgMissions} myStatus={myStatus} />
        </section>
      )}
    </>
  );

  if (!region || !grouped) {
    return (
      <>
        {header}
        <RegionBar lang={lang} region={null} />
        {active.length === 0 ? <EmptyState emoji="🌱" text={t(lang, "missions_empty")} /> : <Grid items={active} myStatus={myStatus} />}
      </>
    );
  }

  const cityRequests = requests.filter((r) => r.ibge === region.ibge);
  const requested = cityRequests.some((r) => r.userId === user.id);
  const wantMore = (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {requested ? (
        <span className="rounded-xl bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700" data-testid="want-more-done">
          {t(lang, "region_want_more_done")}
        </span>
      ) : (
        <button type="button" className={btnPrimary} onClick={() => requestMissionsHere()} data-testid="want-more">
          🙋 {t(lang, "region_want_more")}
        </button>
      )}
      {cityRequests.length > 0 && (
        <span className="text-xs text-slate-500" data-testid="want-more-count">
          {tf(lang, "region_want_more_count", { n: cityRequests.length, city: region.city })}
        </span>
      )}
    </div>
  );

  return (
    <>
      {header}
      <RegionBar lang={lang} region={region} />

      <section data-testid="section-nearby">
        <h2 className="mb-3 text-lg font-bold text-slate-900">
          📍 {t(lang, "region_section_nearby")} <span className="text-sm font-semibold text-slate-400">({grouped.nearby.length})</span>
        </h2>
        {(seeding || needsSupply) && (
          <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900" data-testid="region-seeding">
            🗺️ {t(lang, "region_seeding")}
          </p>
        )}
        {grouped.nearby.some((m) => m.origin === "auto") && (
          <p className="mb-3 text-xs text-slate-500" data-testid="demo-osm-note">ℹ️ {dt(lang, "demo_osm_note")}</p>
        )}
        {grouped.nearby.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center" data-testid="region-empty">
            <p className="font-bold text-slate-800">{t(lang, "region_empty_title")}</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">{tf(lang, "region_empty_text", { city: region.city })}</p>
            <div className="mt-4">{wantMore}</div>
          </div>
        ) : (
          <>
            <Grid items={grouped.nearby} myStatus={myStatus} />
            {grouped.nearby.length < MIN_LOCAL_MISSIONS && <div className="mt-4">{wantMore}</div>}
          </>
        )}
      </section>

      {grouped.anywhere.length > 0 && (
        <section className="mt-8" data-testid="section-anywhere">
          <h2 className="text-lg font-bold text-slate-900">
            🌎 {t(lang, "region_section_anywhere")} <span className="text-sm font-semibold text-slate-400">({grouped.anywhere.length})</span>
          </h2>
          <p className="mb-3 text-sm text-slate-500">{t(lang, "region_anywhere_hint")}</p>
          <Grid items={grouped.anywhere} myStatus={myStatus} />
        </section>
      )}

      {grouped.elsewhere > 0 && (
        <p className="mt-8 text-center text-xs text-slate-400" data-testid="region-elsewhere">
          {tf(lang, "region_elsewhere", { n: grouped.elsewhere })}
        </p>
      )}
    </>
  );
}
