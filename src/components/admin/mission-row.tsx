"use client";

import { useState, useTransition } from "react";
import { PAYMENTS_ENABLED } from "@/lib/features";
import { toggleMissionAction } from "@/lib/actions/admin";
import { categoryEmoji, categoryLabels } from "@/lib/i18n";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

export function MissionRow({
  mission,
}: {
  mission: {
    id: string;
    title: string;
    category: string;
    pointsReward: number;
    foneReward: string;
    isActive: boolean;
    scope?: "local" | "anywhere";
    city?: string | null;
    stateCode?: string | null;
    needsReview?: boolean;
  };
}) {
  const [active, setActive] = useState(mission.isActive);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3 rounded-xl border border-black/5 px-4 py-3">
      <span className="text-xl">{categoryEmoji[mission.category]}</span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{mission.title}</p>
        <p className="text-xs text-slate-400">
          {categoryLabels[mission.category]?.pt} · ⭐ {mission.pointsReward}
          {PAYMENTS_ENABLED && (
            <>
              {" · "}
              <FoneAmount amount={mission.foneReward} size={14} className="align-middle" />
            </>
          )}
          {" · "}
          {mission.scope === "anywhere" ? "🌎 qualquer lugar" : mission.city ? `📍 ${mission.city}${mission.stateCode ? `, ${mission.stateCode}` : ""}` : "📍"}
          {mission.needsReview ? " · 🔎 revisar" : ""}
        </p>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={() =>
          startTransition(async () => {
            setActive((prev) => !prev);
            await toggleMissionAction(mission.id, !active);
          })
        }
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${active ? "bg-emerald-500" : "bg-slate-300"}`}
        aria-label="Ativa/Inativa"
      >
        <span
          className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${active ? "left-6" : "left-1"}`}
        />
      </button>
      <span className={`w-16 text-xs font-bold ${active ? "text-emerald-600" : "text-slate-400"}`}>
        {active ? "Ativa" : "Inativa"}
      </span>
    </div>
  );
}
