"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { createSubmissionAction, type SubmissionActionState } from "@/lib/actions/submissions";
import { categoryEmoji, categoryLabels, inLang, t, tx, type Lang } from "@/lib/i18n";
import { useRouter } from "next/navigation";
import { FoneAmount, FoneMark } from "@/components/brand/fone";
import { CountField } from "@/components/missions/count-field";
import { PROOF_TYPE_INFO, proofTypeHint, proofTypeName, proofTypeOf } from "@/lib/proof";

const initialState: SubmissionActionState = {};

const errorKeyMap: Record<string, string> = {
  photo_required: "error_photo_required",
  report_length: "error_report_length",
  daily_limit: "error_daily_limit",
  duplicate_photo: "error_duplicate_photo",
  outside_mission_area: "error_outside_mission_area",
  mission_location_not_configured: "error_mission_location_not_configured",
  location_inaccurate: "error_location_inaccurate",
  event_not_started: "error_event_not_started",
  event_ended: "error_event_ended",
  already_submitted: "error_already_submitted",
  invalid_photo: "error_invalid_photo",
  photo_too_large: "error_photo_too_large",
  banned: "error_banned",
  count_invalid: "error_count_invalid",
  count_below_target: "error_count_below_target",
  photo_before_required: "error_photo_before_required",
  before_after_same_photo: "error_before_after_same_photo",
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
    contextEn?: string | null;
    contextEs?: string | null;
    impact?: string | null;
    impactEn?: string | null;
    impactEs?: string | null;
    latitude: string | null;
    longitude: string | null;
    scope?: "local" | "anywhere";
    origin?: "admin" | "auto" | "suggestion";
    category: string;
    pointsReward: number;
    foneReward: string;
    proofType?: string | null;
    countItem?: string | null;
    countTarget?: number | null;
  };
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(createSubmissionAction, initialState);
  const [preview, setPreview] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState(false);
  const [itemCount, setItemCount] = useState("");
  const [beforePreview, setBeforePreview] = useState<string | null>(null);
  const proofType = proofTypeOf(mission);
  const formRef = useRef<HTMLFormElement>(null);

  const getLocalizedTitle = () => {
    if (lang === "en" && mission.titleEn) return mission.titleEn;
    if (lang === "es" && mission.titleEs) return mission.titleEs;
    return mission.title;
  };

  useEffect(() => {
    if (state.success) {
      const timeout = setTimeout(() => {
        // Collection point: straight to the QR the person shows at the counter.
        router.push(mission.proofType === "partner" ? "/submissions" : "/missions");
      }, mission.proofType === "partner" ? 2600 : 1600);
      return () => clearTimeout(timeout);
    }
  }, [state.success, router, mission.proofType]);

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
          {mission.proofType === "partner" && (
            <p className="max-w-sm text-sm text-teal-800" data-testid="partner-next">
              ⚖️ {tx(lang, "Agora leve o material ao ponto de coleta e mostre o QR que aparece em Meus envios.", "Now take the material to the collection point and show the QR in My submissions.", "Ahora lleva el material al punto de recolección y muestra el QR que aparece en Mis envíos.")}
            </p>
          )}
        </div>
      ) : (
        <form ref={formRef} action={formAction} className="space-y-6 bg-white rounded-3xl p-6 shadow-lg">
          <input type="hidden" name="missionId" value={mission.id} />
          <input type="hidden" name="latitude" value={coords?.lat ?? ""} readOnly />
          <input type="hidden" name="longitude" value={coords?.lng ?? ""} readOnly />
          <input type="hidden" name="accuracy" value={coords?.accuracy ?? ""} readOnly />

          {(mission.context || mission.impact) && (
            <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-sm text-slate-700">
              {mission.context && <p><strong className="text-emerald-800">{t(lang, "what_to_do")}:</strong> {inLang(lang, mission.context, mission.contextEn, mission.contextEs)}</p>}
              {mission.impact && <p><strong className="text-emerald-800">{t(lang, "why_it_matters")}:</strong> {inLang(lang, mission.impact, mission.impactEn, mission.impactEs)}</p>}
            </div>
          )}

          <div className="flex gap-3 rounded-2xl border border-sky-100 bg-sky-50 p-4 text-sm text-sky-900" data-testid="proof-type">
            <span className="text-2xl" aria-hidden="true">{PROOF_TYPE_INFO[proofType].emoji}</span>
            <div>
              <p className="font-bold">{tx(lang, "Como provar", "How to prove it", "Cómo comprobarlo")}: {proofTypeName(proofType, lang)}</p>
              <p className="mt-0.5 text-xs">{proofTypeHint(proofType, lang)}</p>
            </div>
          </div>

          {proofType === "before_after" && (
            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="text-lg">⏮️</span>
                {tx(lang, "Foto ANTES", "BEFORE photo", "Foto ANTES")}
              </label>
              <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40">
                {beforePreview ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={beforePreview} alt={t(lang, "photo_preview")} className="mx-auto max-h-56 rounded-xl object-cover" />
                ) : (
                  <div className="flex flex-col items-center gap-2 py-6 text-slate-500">
                    <span className="text-4xl">📷</span>
                    <span className="text-sm font-medium">{tx(lang, "Tire a foto antes de começar", "Take it before you start", "Tómala antes de empezar")}</span>
                  </div>
                )}
                <input
                  type="file"
                  name="photoBefore"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBeforePreview(URL.createObjectURL(file));
                  }}
                  required
                />
              </label>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-lg">{proofType === "before_after" ? "⏭️" : "📷"}</span>
              {proofType === "before_after" ? tx(lang, "Foto DEPOIS (mesmo lugar e enquadramento)", "AFTER photo (same place and framing)", "Foto DESPUÉS (mismo lugar y encuadre)") : t(lang, "photo_tap")}
            </label>
            <label className="block cursor-pointer rounded-2xl border-2 border-dashed border-slate-300 p-4 text-center transition hover:border-emerald-400 hover:bg-emerald-50/40 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100">
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={preview} alt={t(lang, "photo_preview")} className="mx-auto max-h-56 rounded-xl object-cover" />
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
            <p className="flex items-start gap-1.5 text-xs text-slate-500" data-testid="internet-warning">
              <span aria-hidden="true">🔎</span> {t(lang, "submit_internet_warning")}
            </p>
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
              placeholder={t(lang, "report_placeholder")}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
            />
            {reportTooShort && (
              <p className="mt-1 text-xs font-medium text-amber-600">
                {tx(lang, `Faltam ${50 - report.length} caracteres para o mínimo de 50.`, `${50 - report.length} more characters to reach the minimum of 50.`, `Faltan ${50 - report.length} caracteres para el mínimo de 50.`)}
              </p>
            )}
          </div>

          {proofType === "count" && <CountField lang={lang} mission={mission} value={itemCount} onChange={setItemCount} />}

          <div className="space-y-2">
            <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="text-lg">📍</span>
              {t(lang, "use_current_location")}
            </label>
            {mission.scope === "anywhere" && (
              <p className="text-xs text-slate-500" data-testid="anywhere-note">🌎 {t(lang, "anywhere_location_note")}</p>
            )}
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
                {tx(lang, "É necessário permitir a localização para confirmar que você está no local da missão.", "Allow location access so we can confirm you are at the mission place.", "Debes permitir la ubicación para confirmar que estás en el lugar de la misión.")}
              </p>
            )}
            {mission.origin === "auto" && <p className="text-[10px] text-slate-400">{t(lang, "osm_attribution")}</p>}
          </div>

          {errorMessage && (
            <p className="animate-fade-in rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
              {errorMessage}
            </p>
          )}

          <div className="rounded-xl bg-slate-50 px-4 py-2.5 text-xs text-slate-500">
            {categoryLabels[mission.category]?.[lang]} · ⭐ {mission.pointsReward} {t(lang, "reward_points")}
            {PAYMENTS_ENABLED && Number(mission.foneReward) > 0 && (
              <>
                {" · "}
                <FoneAmount amount={mission.foneReward} size={14} className="align-middle" />
              </>
            )}
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
