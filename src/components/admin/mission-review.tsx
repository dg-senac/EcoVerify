"use client";

import { useActionState } from "react";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { reviewMissionAction, type AdminActionState } from "@/lib/actions/admin";
import { categoryEmoji, categoryLabels } from "@/lib/i18n";

export type ReviewMission = {
  id: string;
  title: string;
  description: string;
  category: string;
  pointsReward: number;
  origin: "admin" | "auto" | "suggestion";
  city: string | null;
  stateCode: string | null;
  latitude: string | null;
  longitude: string | null;
};

const initialState: AdminActionState = {};

/** One mission waiting for review: set a FONE reward, keep it points-only, or switch it off. */
export function MissionReview({ mission }: { mission: ReviewMission }) {
  const [state, formAction, pending] = useActionState(reviewMissionAction, initialState);
  if (state.success) {
    return <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700">✓ {mission.title} — revisada</p>;
  }
  const map =
    mission.latitude && mission.longitude
      ? `https://www.openstreetmap.org/?mlat=${mission.latitude}&mlon=${mission.longitude}#map=17/${mission.latitude}/${mission.longitude}`
      : null;
  return (
    <form action={formAction} className="rounded-xl border border-black/5 p-4" data-testid="mission-review">
      <input type="hidden" name="missionId" value={mission.id} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-lg">{categoryEmoji[mission.category]}</span>
        <p className="font-semibold text-slate-800">{mission.title}</p>
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
          {mission.origin === "auto" ? "✨ OpenStreetMap" : "🙋 Sugestão da comunidade"}
        </span>
      </div>
      <p className="mt-1 text-xs text-slate-400">
        {categoryLabels[mission.category]?.pt} · ⭐ {mission.pointsReward}
        {mission.city ? ` · ${mission.city}${mission.stateCode ? `, ${mission.stateCode}` : ""}` : ""}
        {map && (
          <>
            {" · "}
            <a href={map} target="_blank" rel="noreferrer" className="font-semibold text-emerald-700 underline">
              ver no mapa
            </a>
          </>
        )}
      </p>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{mission.description}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {PAYMENTS_ENABLED ? (
          <>
            <input
              type="number"
              name="foneReward"
              step="0.01"
              min={0.01}
              placeholder="FONE"
              aria-label="Recompensa em FONE"
              className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            />
            <button name="decision" value="fone" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
              Aprovar com FONE
            </button>
            <button name="decision" value="points" disabled={pending} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 disabled:opacity-60">
              Manter só pontos
            </button>
          </>
        ) : (
          <button name="decision" value="points" disabled={pending} className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">
            Aprovar missão
          </button>
        )}
        <button name="decision" value="deactivate" disabled={pending} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 disabled:opacity-60">
          Desativar
        </button>
      </div>
      {state.error && <p className="mt-2 text-xs font-medium text-red-500">Informe um valor de FONE válido.</p>}
    </form>
  );
}
