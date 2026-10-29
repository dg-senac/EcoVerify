import { useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, Crosshair, Loader2, MapPin, Navigation, Star, Target, Lightbulb } from "lucide-react";
import { categoryEmoji, t } from "@/lib/i18n";
import { goBack, Link, navigate } from "../router";
import { dt, errorText } from "../i18n";
import { checkProof, localizedDescription, localizedTitle, submitProof, useLang, useStore, type NewSubmission } from "../store";
import { analyzeWithMyKey, byokErrorText, useGeminiKey } from "../byok";
import { AiUnavailableError } from "@/lib/ai/gemini-core";
import {
  compressPhoto,
  detectImageType,
  distanceMeters,
  formatDistance,
  getCurrentPosition,
  hashBytes,
  MAX_DISTANCE_METERS,
  MAX_GPS_ACCURACY_METERS,
  MAX_PHOTO_BYTES,
  type Coords,
} from "../media";
import { categoryStyles } from "../components/MissionCard";
import { drawSamplePhoto, SAMPLE_KINDS, sampleEmoji, sampleLabel, type SampleKind } from "../demoAi";
import { btnPrimary, btnSecondary, card, EmptyState, label, toast } from "../components/ui";
import { FoneAmount } from "@/components/brand/fone";

type Location = Coords & { simulated: boolean };

export function SubmitScreen({ missionId }: { missionId: string }) {
  const lang = useLang();
  const mission = useStore((s) => s.missions.find((m) => m.id === missionId && m.isActive));
  const fileRef = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState<{ dataUrl: string; hash: string; sample: SampleKind | null } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [report, setReport] = useState("");
  const [location, setLocation] = useState<Location | null>(null);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const myKey = useGeminiKey();

  if (!mission) return <EmptyState emoji="🔎" text={t(lang, "missions_empty")} />;

  const onPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setError(null);
    if (file.size > MAX_PHOTO_BYTES) return setError(t(lang, "error_photo_too_large"));
    setProcessing(true);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      if (!detectImageType(bytes)) throw new Error("invalid");
      const [hash, dataUrl] = await Promise.all([hashBytes(bytes), compressPhoto(file)]);
      setPhoto({ dataUrl, hash, sample: null });
    } catch {
      setError(t(lang, "error_invalid_photo"));
    } finally {
      setProcessing(false);
    }
  };

  const pickSample = async (kind: SampleKind) => {
    setError(null);
    const dataUrl = drawSamplePhoto(kind);
    if (!dataUrl) return setError(t(lang, "error_invalid_photo"));
    setPhoto({ dataUrl, hash: await hashBytes(new TextEncoder().encode(dataUrl)), sample: kind });
  };

  const useGps = async () => {
    setError(null);
    setLocating(true);
    try {
      setLocation({ ...(await getCurrentPosition()), simulated: false });
    } catch {
      setError(dt(lang, "location_error"));
    } finally {
      setLocating(false);
    }
  };

  const simulate = () => {
    setError(null);
    // A random point up to ~40 m away from the mission, with good accuracy.
    const angle = Math.random() * 2 * Math.PI;
    const meters = 10 + Math.random() * 30;
    setLocation({
      latitude: mission.latitude + (meters * Math.cos(angle)) / 111320,
      longitude: mission.longitude + (meters * Math.sin(angle)) / (111320 * Math.cos((mission.latitude * Math.PI) / 180)),
      accuracy: 8 + Math.round(Math.random() * 12),
      simulated: true,
    });
  };

  const distance = location ? distanceMeters(location.latitude, location.longitude, mission.latitude, mission.longitude) : null;
  const anywhere = mission.scope === "anywhere";
  const locationOk =
    !!location && distance !== null && (anywhere || distance <= MAX_DISTANCE_METERS) && location.accuracy <= MAX_GPS_ACCURACY_METERS;
  const reportLength = report.trim().length;
  const canSend = !!photo && reportLength >= 50 && reportLength <= 1000 && !!location && !processing && !analyzing;

  const send = async () => {
    if (!photo) return setError(t(lang, "error_photo_required"));
    if (!location) return setError(t(lang, "use_current_location"));
    setError(null);
    const proof: NewSubmission = {
      missionId: mission.id,
      photo: photo.dataUrl,
      photoHash: photo.hash,
      report,
      latitude: location.latitude,
      longitude: location.longitude,
      accuracy: location.accuracy,
      simulatedLocation: location.simulated,
      sample: photo.sample,
    };
    // Check every rule first, so no Gemini request is spent on a proof that would be refused.
    const checked = checkProof(proof);
    if (checked.error) return setError(errorText(lang, checked.error));

    if (!photo.sample && myKey) {
      setAnalyzing(true);
      try {
        proof.realAi = await analyzeWithMyKey({
          key: myKey,
          dataUrl: photo.dataUrl,
          mission: { title: mission.title, description: mission.description, category: mission.category, context: mission.context ?? null, aiChecklist: null },
          report: report.trim(),
          lang,
        });
      } catch (err) {
        proof.realAi = { failed: true };
        const kind = err instanceof AiUnavailableError ? err.kind : "http";
        toast(dt(lang, "byok_failed_to_moderation", { reason: byokErrorText(lang, kind) }), "error");
      } finally {
        setAnalyzing(false);
      }
    }

    const result = submitProof(proof);
    if (result.error) return setError(errorText(lang, result.error));
    toast(t(lang, "submission_success"));
    navigate("/submissions", { replace: true });
  };

  return (
    <div className="mx-auto max-w-2xl">
      <button type="button" onClick={() => goBack("/missions")} className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800">
        <ArrowLeft className="h-4 w-4" /> {dt(lang, "back")}
      </button>

      <div className={`${card} overflow-hidden animate-slide-up`}>
        <div className={`flex items-center gap-4 bg-gradient-to-br p-5 text-white ${categoryStyles[mission.category] ?? categoryStyles.other}`}>
          <span className="text-4xl">{categoryEmoji[mission.category] ?? "🌱"}</span>
          <div>
            <h1 className="text-xl font-extrabold leading-tight">{localizedTitle(mission, lang)}</h1>
            <div className="mt-2 flex gap-2 text-xs font-bold">
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5"><Star className="h-3.5 w-3.5" /> {mission.pointsReward} {t(lang, "points")}</span>
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5"><FoneAmount amount={mission.foneReward} size={14} /></span>
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-5 text-sm text-slate-600">
          <p>{localizedDescription(mission, lang)}</p>
          {mission.context && (
            <p className="flex gap-2 rounded-xl bg-emerald-50 p-3 text-emerald-900"><Target className="mt-0.5 h-4 w-4 shrink-0" /><span><b>{dt(lang, "what_to_do")}:</b> {mission.context}</span></p>
          )}
          {mission.impact && (
            <p className="flex gap-2 rounded-xl bg-sky-50 p-3 text-sky-900"><Lightbulb className="mt-0.5 h-4 w-4 shrink-0" /><span><b>{dt(lang, "why_it_matters")}:</b> {mission.impact}</span></p>
          )}
        </div>
      </div>

      <div className={`${card} mt-4 grid gap-5 p-5 animate-slide-up`}>
        {/* Photo */}
        <div>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPhoto} />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-2xl border-2 border-dashed border-emerald-200 bg-emerald-50/50 text-emerald-700 transition hover:bg-emerald-50"
          >
            {photo ? (
              <img src={photo.dataUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
            ) : processing ? (
              <Loader2 className="h-8 w-8 animate-spin" />
            ) : (
              <span className="flex flex-col items-center gap-2 text-sm font-semibold">
                <Camera className="h-10 w-10" /> {t(lang, "photo_tap")}
              </span>
            )}
            {photo && (
              <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/60 px-3 py-1 text-xs font-semibold text-white">
                <Camera className="h-3.5 w-3.5" /> {t(lang, "photo_tap")}
              </span>
            )}
          </button>
          <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" data-testid="sample-photos">
            <p className="text-xs font-bold text-slate-700">🤖 {dt(lang, "sample_title")}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SAMPLE_KINDS.map((kind) => (
                <button
                  key={kind}
                  type="button"
                  data-sample={kind}
                  onClick={() => pickSample(kind)}
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
                    photo?.sample === kind ? "border-emerald-500 bg-emerald-50 text-emerald-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sampleEmoji(kind)} {sampleLabel(kind, lang)}
                </button>
              ))}
            </div>
            <p className="mt-2 text-[11px] leading-snug text-slate-500">
              {photo && !photo.sample ? (myKey ? dt(lang, "byok_submit_hint") : dt(lang, "sim_real_photo")) : dt(lang, "sample_hint")}
            </p>
            {!myKey && (
              <Link to="/settings" className="mt-1 inline-block text-[11px] font-semibold text-emerald-700 hover:underline" data-testid="byok-setup-link">
                {dt(lang, "byok_submit_setup")}
              </Link>
            )}
            {myKey && !(photo && !photo.sample) && (
              <p className="mt-1 text-[11px] font-semibold text-emerald-700">🤖 {dt(lang, "byok_status_on")}</p>
            )}
          </div>
        </div>

        {/* Report */}
        <div>
          <label className={label} htmlFor="report">{t(lang, "report_label")}</label>
          <textarea
            id="report"
            rows={5}
            maxLength={1000}
            value={report}
            onChange={(e) => setReport(e.target.value)}
            placeholder={dt(lang, "report_placeholder")}
            className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
          />
          <div className="mt-1 flex justify-between text-xs">
            <span className={reportLength >= 50 ? "text-emerald-600" : "text-slate-400"}>
              {reportLength < 50 ? dt(lang, "report_missing", { n: 50 - reportLength }) : "✓"}
            </span>
            <span className="text-slate-400">{report.length}/1000</span>
          </div>
        </div>

        {/* Location */}
        <div className="grid gap-2">
          <span className={label}>📍 GPS</span>
          <div className="grid gap-2 sm:grid-cols-2">
            <button type="button" className={btnSecondary} onClick={useGps} disabled={locating}>
              {locating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />} {t(lang, "use_current_location")}
            </button>
            <button type="button" onClick={simulate} className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-100 px-4 py-2.5 text-sm font-semibold text-amber-900 transition hover:bg-amber-200">
              <Navigation className="h-4 w-4" /> {dt(lang, "simulate_location")}
            </button>
          </div>
          <p className="text-xs text-slate-400">{dt(lang, "simulate_location_hint")}</p>
          {anywhere && <p className="text-xs text-slate-500" data-testid="anywhere-note">🌎 {t(lang, "anywhere_location_note")}</p>}
          {location && distance !== null && (
            <div className={`flex items-start gap-2 rounded-xl p-3 text-sm ${locationOk ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`}>
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <p className="font-semibold">
                  {dt(lang, location.simulated ? "location_simulated" : "location_real")}
                  {anywhere ? "" : ` · ${dt(lang, "distance_to_mission")}: ${formatDistance(distance)}`} (± {Math.round(location.accuracy)} m)
                </p>
                {!locationOk && (
                  <p className="mt-0.5 text-xs">
                    {location.accuracy > MAX_GPS_ACCURACY_METERS ? t(lang, "error_location_inaccurate") : t(lang, "error_outside_mission_area")}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        <button type="button" className={btnPrimary} onClick={send} disabled={!canSend}>
          {analyzing ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> {dt(lang, "byok_analyzing")}
            </>
          ) : (
            t(lang, "send_proof")
          )}
        </button>
      </div>
    </div>
  );
}
