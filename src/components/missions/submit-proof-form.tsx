"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { createSubmissionAction, type SubmissionActionState } from "@/lib/actions/submissions";
import { categoryEmoji, categoryLabels, t, type Lang } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

const initialState: SubmissionActionState = {};

const errorKeyMap: Record<string, string> = {
  photo_required: "error_photo_required",
  report_length: "error_report_length",
  daily_limit: "error_daily_limit",
  duplicate_photo: "error_duplicate_photo",
  outside_mission_area: "error_outside_mission_area",
  mission_location_not_configured: "error_mission_location_not_configured",
  location_inaccurate: "error_location_inaccurate",
  already_submitted: "error_already_submitted",
  invalid_photo: "error_invalid_photo",
  photo_too_large: "error_photo_too_large",
  banned: "error_banned",
};

export function SubmitProofForm({
  lang,
  mission,
}: {
  lang: Lang;
  mission: {
    id: string;
    title: string;
    titleEn?: string | null;
    titleEs?: string | null;
    context?: string | null;
    impact?: string | null;
    latitude: string | null;
    longitude: string | null;
    category: string;
    pointsReward: number;
    foneReward: string;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createSubmissionAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const getLocalizedTitle = () => {
    if (lang === "en" && mission.titleEn) return mission.titleEn;
    if (lang === "es" && mission.titleEs) return mission.titleEs;
    return mission.title;
  };

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        router.push("/missions");
      }, 1600);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPreview(url);
  }

  function handleLocate() {
    if (!("geolocation" in navigator)) {
      setLocationError(true);
      return;
    }
    setLocating(true);
    setLocationError(false);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLocating(false);
      },
      () => {
        setLocationError(true);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  }

  const reportTooShort = report.length > 0 && report.length < 50;
  const errorMessage = state.error
    ? t(lang, (errorKeyMap[state.error] as any) ?? "error_generic")
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="grid h-10 w-10 place-items-center rounded-full text-lg text-slate-400 hover:bg-slate-100 transition-colors"
        >
          ←
        </button>
        <div className="flex items-center gap-2">
          <span className="text-3xl">{categoryEmoji[mission.category]}</span>
          <h1 className="text-2xl font-bold text-slate-900">{getLocalizedTitle()}</h1>
        </div>
      </div>

      {state.success ? (
        <div className="flex flex-col items-center justify-center gap-4 px-8 py-16 text-center rounded-3xl bg-white shadow-lg">
          <div className="grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-5xl text-emerald-600 animate-scale-in">
            ✅
          </div>
          <p className="text-lg font-bold text-slate-900">{t(lang, "submission_success")}</p>
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="space-y-6 bg-white rounded-3xl p-6 shadow-lg">
          <input type="hidden" name="missionId" value={mission.id} />
          <input type="hidden" name="latitude" value={coords?.lat ?? ""} readOnly />
          <input type="hidden" name="longitude" value={coords?.lng ?? ""} readOnly />
          <input type="hidden" name="accuracy" value={coords?.accuracy ?? ""} readOnly />

          {(mission.context || mission.impact) && (
            <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
              {mission.context && <p><strong className="text-emerald-800">O que fazer:</strong> {mission.context}</p>}
              {mission.impact && <p><strong className="text-emerald-800">Por que importa:</strong> {mission.impact}</p>}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-lg">📷</span>
              {t(lang, "photo_tap")}
            </label>
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt="Pré-visualização" className="mx-auto max-h-56 rounded-xl object-cover" />
              ) : (
                <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
                  <span className="text-4xl">📷</span>
                  <span className="text-sm font-medium">{t(lang, "photo_tap")}</span>
                </div>
              )}
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={handleFile}
                required
              />
            </label>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="text-lg">📝</span>
                {t(lang, "report_label")}
              </label>
              <span className={`text-xs font-medium ${reportTooShort ? "text-red-500" : "text-slate-400"}`}>
                {report.length}/1000
              </span>
            </div>
            <textarea
              name="report"
              required
              minLength={50}
              maxLength={1000}
              rows={4}
              value={report}
              onChange={(e) => setReport(e.target.value)}
              placeholder="Conte como foi a experiência, onde e como você realizou a ação..."
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {reportTooShort && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                Faltam {50 - report.length} caracteres para o mínimo de 50.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-lg">📍</span>
              {t(lang, "use_current_location")}
            </label>
            <button
              type="button"
              onClick={handleLocate}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-teal-400 hover:bg-teal-50 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            >
              {locating ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-teal-600" />
              ) : (
                <span>📍</span>
              )}
              {coords ? `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)} (±${Math.round(coords.accuracy)} m)` : t(lang, "use_current_location")}
            </button>
            {locationError && (
              <p className="mt-1 text-xs font-medium text-red-500">
                É necessário permitir a localização para confirmar que você está no local da missão.
              </p>
            )}
          </div>

          {errorMessage && (
            <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            {categoryLabels[mission.category]?.[lang]} · ⭐ {mission.pointsReward} {t(lang, "reward_points")} ·{" "}
            <FoneAmount amount={mission.foneReward} size={14} className="align-middle" />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              {t(lang, "cancel")}
            </button>
            <button
              type="submit"
              disabled={pending || !coords}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-70 transition-opacity"
            >
              {pending && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              )}
              {t(lang, "send")}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
