"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Lang } from "@/lib/i18n";
import type { DumpItem } from "@/lib/dumps";
import { confirmDumpAction, nearbyDumpsAction, reportDumpAction } from "@/lib/actions/dumps";
import { DumpScreen, DUMP_LINK_CLASS, type Coords, type PickedPhoto } from "./dump-screen";

function formData(photo: PickedPhoto, location: Coords, fields: Record<string, string>) {
  const data = new FormData();
  if (photo.file) data.set("photo", photo.file);
  data.set("latitude", String(location.latitude));
  data.set("longitude", String(location.longitude));
  data.set("accuracy", String(location.accuracy));
  for (const [k, v] of Object.entries(fields)) data.set(k, v);
  return data;
}

/** Web wrapper: the shared screen + server actions. */
export function DumpScreenWeb({ lang, myReports, initialNearby }: { lang: Lang; myReports: DumpItem[]; initialNearby: DumpItem[] | null }) {
  const router = useRouter();
  return (
    <DumpScreen
      lang={lang}
      myReports={myReports}
      initialNearby={initialNearby}
      loadNearby={(lat, lng) => nearbyDumpsAction(lat, lng)}
      onReport={async ({ photo, size, note, location }) => {
        const r = await reportDumpAction({}, formData(photo, location, { size, note }));
        if (r.success) router.refresh();
        return r;
      }}
      onConfirm={async ({ reportId, photo, location }) => {
        const r = await confirmDumpAction({}, formData(photo, location, { reportId }));
        if (r.success) router.refresh();
        return r;
      }}
      missionLink={(missionId, label) => (
        <Link href={`/missions/${missionId}/submit`} className={DUMP_LINK_CLASS}>
          🧹 {label}
        </Link>
      )}
    />
  );
}
