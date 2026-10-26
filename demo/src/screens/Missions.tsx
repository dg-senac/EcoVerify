import { Sprout } from "lucide-react";
import { t } from "@/lib/i18n";
import { useLang, useStore, type User, type SubmissionStatus } from "../store";
import { MissionCard } from "../components/MissionCard";
import { EmptyState, PageHeader } from "../components/ui";

export function MissionsScreen({ user }: { user: User }) {
  const lang = useLang();
  const missions = useStore((s) => s.missions);
  const submissions = useStore((s) => s.submissions);
  const active = missions.filter((m) => m.isActive);

  // Latest status of my submission for each mission (a rejected one can be resent).
  const myStatus = new Map<string, SubmissionStatus>();
  for (const sub of [...submissions].filter((s) => s.userId === user.id).sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))) {
    myStatus.set(sub.missionId, sub.status);
  }

  return (
    <>
      <PageHeader title={t(lang, "missions_title")} subtitle={t(lang, "missions_subtitle")} icon={Sprout} />
      {active.length === 0 ? (
        <EmptyState emoji="🌱" text={t(lang, "missions_empty")} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {active.map((mission) => (
            <MissionCard key={mission.id} lang={lang} mission={mission} myStatus={myStatus.get(mission.id)} />
          ))}
        </div>
      )}
    </>
  );
}
