"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { DUMP_SIZES, dumpText, type DumpError, type DumpItem, type DumpSize } from "@/lib/dumps";
import { DumpCard } from "./dump-card";

export type PickedPhoto = { file: File | null; preview: string; sample: string | null };
export type Coords = { latitude: number; longitude: number; accuracy: number };
export type DumpResult = { error?: DumpError; success?: boolean; missionId?: string | null };

type Props = {
  lang: Lang;
  myReports: DumpItem[];
  initialNearby: DumpItem[] | null;
  loadNearby: (lat: number, lng: number) => Promise<DumpItem[]>;
  onReport: (input: { photo: PickedPhoto; size: DumpSize; note: string; location: Coords }) => Promise<DumpResult>;
  onConfirm: (input: { reportId: string; photo: PickedPhoto; location: Coords }) => Promise<DumpResult>;
  /** Link/button to the cleanup mission. */
  missionLink: (missionId: string, label: string) => ReactNode;
  /** Extra ways to pick a photo (the APK offers sample photos). */
  photoExtras?: (pick: (photo: PickedPhoto) => void, kind: "report" | "confirm") => ReactNode;
  /** Extra way to fill the location (the APK offers "use the spot's location"). */
  locationExtras?: (set: (coords: Coords) => void, spot: { latitude: number; longitude: number } | null) => ReactNode;
};

function getPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude, accuracy: p.coords.accuracy }),
      reject,
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function PhotoPicker({ lang, photo, setPhoto, extras, testId }: { lang: Lang; photo: PickedPhoto | null; setPhoto: (p: PickedPhoto) => void; extras?: ReactNode; testId: string }) {
  const text = dumpText(lang);
  return (
    <div className="min-w-0">
      <label className="block text-sm font-semibold text-slate-700">{text.photo}</label>
      <p className="text-xs text-slate-500">{text.photoHint}</p>
      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-3">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="w-full min-w-0 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-50 file:px-3 file:py-2 file:font-semibold file:text-emerald-700 sm:w-auto"
          data-testid={testId}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) setPhoto({ file, preview: URL.createObjectURL(file), sample: null });
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {photo && <img src={photo.preview} alt="" className="h-16 w-16 rounded-xl object-cover" />}
      </div>
      {extras}
    </div>
  );
}

function LocationField({
  lang,
  location,
  setLocation,
  extras,
}: {
  lang: Lang;
  location: Coords | null;
  setLocation: (c: Coords) => void;
  extras?: ReactNode;
}) {
  const text = dumpText(lang);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-700">{text.location}</p>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            setError(false);
            try {
              setLocation(await getPosition());
            } catch {
              setError(true);
            } finally {
              setBusy(false);
            }
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          data-testid="dump-locate"
        >
          {text.getLocation}
        </button>
        {extras}
      </div>
      {location && <p className="mt-1 text-xs font-semibold text-emerald-700">✓ {text.locationOk(Math.round(location.accuracy))}</p>}
      {error && <p className="mt-1 text-xs font-semibold text-red-700">{text.locationError}</p>}
    </div>
  );
}

function ConfirmPanel({ lang, item, props, onDone }: { lang: Lang; item: DumpItem; props: Props; onDone: (missionId: string | null) => void }) {
  const text = dumpText(lang);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [location, setLocation] = useState<Coords | null>(null);
  const [error, setError] = useState<DumpError | null>(null);
  const [pending, start] = useTransition();
  return (
    <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-orange-200 bg-orange-50 p-3" data-testid="dump-confirm-panel">
      <p className="text-xs leading-relaxed text-orange-950">{text.confirmHint}</p>
      <PhotoPicker lang={lang} photo={photo} setPhoto={setPhoto} extras={props.photoExtras?.(setPhoto, "confirm")} testId="dump-confirm-photo" />
      <LocationField lang={lang} location={location} setLocation={setLocation} extras={props.locationExtras?.(setLocation, item)} />
      {error && <p className="text-xs font-semibold text-red-700" data-testid="dump-confirm-error">{text.errors[error]}</p>}
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (!photo) return setError("photo_required");
          if (!location) return setError("location_required");
          setError(null);
          start(async () => {
            const r = await props.onConfirm({ reportId: item.id, photo, location });
            if (r.error) setError(r.error);
            else onDone(r.missionId ?? null);
          });
        }}
        className="justify-self-start rounded-xl bg-orange-600 px-4 py-2 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-60"
        data-testid="dump-confirm-send"
      >
        {text.confirmSend}
      </button>
    </div>
  );
}

/** The citizen's "Lixo irregular" screen. Shared by the web app and the APK. */
export function DumpScreen(props: Props) {
  const { lang, myReports } = props;
  const text = dumpText(lang);
  const [photo, setPhoto] = useState<PickedPhoto | null>(null);
  const [size, setSize] = useState<DumpSize>("medium");
  const [note, setNote] = useState("");
  const [location, setLocationState] = useState<Coords | null>(null);
  const [error, setError] = useState<DumpError | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();
  const [nearby, setNearby] = useState<DumpItem[] | null>(props.initialNearby);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState<{ id: string; missionId: string | null } | null>(null);
  const [formKey, setFormKey] = useState(0);

  const setLocation = (c: Coords) => {
    setLocationState(c);
    props.loadNearby(c.latitude, c.longitude).then(setNearby);
  };

  const submit = () => {
    if (!photo) return setError("photo_required");
    if (!location) return setError("location_required");
    setError(null);
    start(async () => {
      const r = await props.onReport({ photo, size, note: note.trim(), location });
      if (r.error) return setError(r.error);
      setSent(true);
      setPhoto(null);
      setNote("");
      setFormKey((k) => k + 1);
      props.loadNearby(location.latitude, location.longitude).then(setNearby);
    });
  };

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6">
      <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950" data-testid="dump-how">
        <p className="font-bold">{text.howTitle}</p>
        <ol className="mt-2 space-y-1.5">
          {text.how.map((step) => (
            <li key={step} className="leading-relaxed">
              {step}
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-emerald-900">{text.expiryNote}</p>
        <p className="mt-1 text-xs font-semibold text-emerald-900">⚠️ {text.safety}</p>
      </section>

      <section className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="dump-report-form">
        <h2 className="text-lg font-bold text-slate-900">📸 {text.reportTitle}</h2>
        <PhotoPicker key={formKey} lang={lang} photo={photo} setPhoto={setPhoto} extras={props.photoExtras?.(setPhoto, "report")} testId="dump-photo" />
        <fieldset className="min-w-0">
          <legend className="text-sm font-semibold text-slate-700">{text.size}</legend>
          <div className="mt-1 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {DUMP_SIZES.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSize(s)}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold ${size === s ? "border-emerald-500 bg-emerald-50 text-emerald-900" : "border-slate-200 bg-white text-slate-600"}`}
                data-dump-size={s}
              >
                {text.sizes[s]}
              </button>
            ))}
          </div>
        </fieldset>
        <label className="block min-w-0 text-sm font-semibold text-slate-700">
          {text.note}
          <input
            value={note}
            maxLength={280}
            onChange={(e) => setNote(e.target.value)}
            placeholder={text.notePlaceholder}
            className="mt-1 w-full min-w-0 rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal outline-none focus:border-emerald-400"
          />
        </label>
        <LocationField lang={lang} location={location} setLocation={setLocation} extras={props.locationExtras?.(setLocation, null)} />
        {error && <p className="text-sm font-semibold text-red-700" data-testid="dump-error">{text.errors[error]}</p>}
        {sent && !error && <p className="text-sm font-semibold text-emerald-700" data-testid="dump-sent">✓ {text.sent}</p>}
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="justify-self-start rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:opacity-60"
          data-testid="dump-send"
        >
          {text.send}
        </button>
      </section>

      <section className="min-w-0" data-testid="dump-nearby">
        <h2 className="mb-2 text-lg font-bold text-slate-900">👀 {text.nearbyTitle}</h2>
        {nearby === null ? (
          <p className="text-sm text-slate-500">{text.nearbyNeedLocation}</p>
        ) : nearby.length === 0 ? (
          <p className="text-sm text-slate-500">{text.nearbyEmpty}</p>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-3">
            {nearby.map((item) => (
              <DumpCard key={item.id} lang={lang} item={item}>
                {justConfirmed?.id === item.id && <p className="mt-2 text-xs font-bold text-emerald-700">✓ {text.confirmed}</p>}
                {item.status === "open" && !item.mine && !item.confirmedByMe && justConfirmed?.id !== item.id && (
                  confirming === item.id ? (
                    <ConfirmPanel
                      lang={lang}
                      item={item}
                      props={props}
                      onDone={(missionId) => {
                        setConfirming(null);
                        setJustConfirmed({ id: item.id, missionId });
                        if (location) props.loadNearby(location.latitude, location.longitude).then(setNearby);
                      }}
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirming(item.id)}
                      className="mt-2 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700"
                      data-testid="dump-confirm"
                    >
                      {text.confirm}
                    </button>
                  )
                )}
                {item.status === "confirmed" && item.missionId && <div className="mt-2">{props.missionLink(item.missionId, text.openMission)}</div>}
              </DumpCard>
            ))}
          </ul>
        )}
      </section>

      <section className="min-w-0" data-testid="dump-mine">
        <h2 className="mb-2 text-lg font-bold text-slate-900">🗂️ {text.mineTitle}</h2>
        {myReports.length === 0 ? (
          <p className="text-sm text-slate-500">{text.mineEmpty}</p>
        ) : (
          <ul className="grid min-w-0 grid-cols-1 gap-3">
            {myReports.map((item) => (
              <DumpCard key={item.id} lang={lang} item={item}>
                {item.status === "confirmed" && item.missionId && <div className="mt-2">{props.missionLink(item.missionId, text.openMission)}</div>}
              </DumpCard>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export const DUMP_LINK_CLASS = "inline-block rounded-lg bg-sky-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-sky-700";
