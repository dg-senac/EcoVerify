import { useState } from "react";
import { MapPinCheck } from "lucide-react";
import { tx } from "@/lib/i18n";
import { dumpText } from "@/lib/dumps";
import { DumpScreen, DUMP_LINK_CLASS, type PickedPhoto } from "@/components/dumps/dump-screen";
import { confirmDump, getState, myDumps, nearbyDumps, reportDump, useLang, useStore, type User } from "../store";
import { PageHeader } from "../components/ui";
import { navigate } from "../router";
import { compressPhoto, detectImageType, hashBytes, MAX_PHOTO_BYTES } from "../media";
import { drawSamplePhoto, type SampleKind } from "../demoAi";

/** Photo for the store: compressed data URL + hash of the original bytes (same as the proof screen). */
async function readPicked(photo: PickedPhoto): Promise<{ photoUrl: string; hash: string; sample: SampleKind | null } | "invalid_photo" | "photo_too_large"> {
  if (photo.sample) return { photoUrl: photo.preview, hash: await hashBytes(new TextEncoder().encode(photo.preview)), sample: photo.sample as SampleKind };
  if (!photo.file) return "invalid_photo";
  if (photo.file.size > MAX_PHOTO_BYTES) return "photo_too_large";
  const bytes = new Uint8Array(await photo.file.arrayBuffer());
  if (!detectImageType(bytes)) return "invalid_photo";
  const [hash, photoUrl] = await Promise.all([hashBytes(bytes), compressPhoto(photo.file)]);
  return { photoUrl, hash, sample: null };
}

const chip = "rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100";

export function DumpsScreen({ user }: { user: User }) {
  const lang = useLang();
  const text = dumpText(lang);
  const mine = useStore((s) => myDumps(s, user.id));
  const region = useStore((s) => s.region ?? null);
  const [initialNearby] = useState(() => (region ? nearbyDumps(getState(), user.id, region.lat, region.lng) : null));

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={text.title} subtitle={text.subtitle} icon={MapPinCheck} />
      <DumpScreen
        lang={lang}
        myReports={mine}
        initialNearby={initialNearby}
        loadNearby={async (lat, lng) => nearbyDumps(getState(), user.id, lat, lng)}
        onReport={async ({ photo, size, note, location }) => {
          const read = await readPicked(photo);
          if (typeof read === "string") return { error: read };
          return reportDump({ ...read, size, note, location });
        }}
        onConfirm={async ({ reportId, photo, location }) => {
          const read = await readPicked(photo);
          if (typeof read === "string") return { error: read };
          return confirmDump({ reportId, photoUrl: read.photoUrl, hash: read.hash, location });
        }}
        missionLink={(missionId, label) => (
          <button type="button" className={DUMP_LINK_CLASS} onClick={() => navigate(`/missions/${missionId}/submit`)}>
            🧹 {label}
          </button>
        )}
        photoExtras={(pick, kind) => {
          const samples: { kind: SampleKind; label: string }[] =
            kind === "confirm"
              ? [{ kind: "cleanup", label: tx(lang, "🗑️ Lixo no local", "🗑️ Rubbish on site", "🗑️ Basura en el lugar") }]
              : [
                  { kind: "cleanup", label: tx(lang, "🗑️ Lixo na rua", "🗑️ Rubbish on the street", "🗑️ Basura en la calle") },
                  { kind: "planting", label: tx(lang, "🌱 Jardim limpo", "🌱 Clean garden", "🌱 Jardín limpio") },
                  { kind: "screen", label: tx(lang, "📱 Foto de uma tela", "📱 Photo of a screen", "📱 Foto de una pantalla") },
                ];
          return (
            <div className="mt-2 flex flex-wrap items-center gap-1.5" data-testid={`dump-samples-${kind}`}>
              <span className="text-xs font-semibold text-slate-500">🤖 {tx(lang, "Usar foto de exemplo:", "Use a sample photo:", "Usar foto de ejemplo:")}</span>
              {samples.map((s) => (
                <button
                  key={s.kind}
                  type="button"
                  className={chip}
                  data-sample={s.kind}
                  onClick={() => {
                    const dataUrl = drawSamplePhoto(s.kind);
                    if (dataUrl) pick({ file: null, preview: dataUrl, sample: s.kind });
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          );
        }}
        locationExtras={(set, spot) => (
          <button
            type="button"
            className={chip}
            data-testid={spot ? "dump-use-spot" : "dump-use-sample-location"}
            onClick={() => {
              // A few metres from the spot (confirmation) or a random place near the chosen region / Recife (report).
              const jitter = (m: number) => (Math.random() - 0.5) * (m / 55_500);
              const base = spot ?? { latitude: region?.lat ?? -8.0631, longitude: region?.lng ?? -34.8711 };
              set({ latitude: base.latitude + jitter(spot ? 20 : 1500), longitude: base.longitude + jitter(spot ? 20 : 1500), accuracy: 12 });
            }}
          >
            📍 {spot ? tx(lang, "Usar a localização do ponto", "Use the spot's location", "Usar la ubicación del punto") : tx(lang, "Usar um local de exemplo", "Use a sample location", "Usar una ubicación de ejemplo")}
          </button>
        )}
      />
    </div>
  );
}
