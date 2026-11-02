import { PAYMENTS_ENABLED } from "@/lib/features";
import { MissionForm } from "@/components/admin/mission-form";
import { MissionRow } from "@/components/admin/mission-row";
import { MissionReview, type ReviewMission } from "@/components/admin/mission-review";
import { SponsorsPanel, type SponsorItem } from "@/components/admin/sponsors-panel";

type MissionItem = ReviewMission & {
  foneReward: string;
  isActive: boolean;
  needsReview: boolean;
  scope: "local" | "anywhere";
};

export type CityDemand = { ibgeCode: number; city: string; stateCode: string; label: string; requests: number; missions: number };
export type SeedLog = { ibgeCode: number; city: string | null; status: string; missionsCreated: number; error: string | null; attemptedAt: string };

export function MissionsTab({
  missions,
  demand = [],
  seeds = [],
  sponsors = [],
  points,
}: {
  missions: MissionItem[];
  points?: { id: string; name: string; city?: string | null }[];
  demand?: CityDemand[];
  seeds?: SeedLog[];
  sponsors?: SponsorItem[];
}) {
  const toReview = missions.filter((mission) => mission.needsReview && mission.isActive);
  return (
    <div className="space-y-6">
      {toReview.length > 0 && (
        <div className="rounded-2xl border border-sky-200 bg-white p-5 shadow-sm" data-testid="missions-review">
          <h3 className="font-bold text-slate-900">🔎 Para revisar ({toReview.length})</h3>
          <p className="mt-1 text-sm text-slate-500">
            Missões criadas a partir do OpenStreetMap ou de sugestões da comunidade. Já aparecem para as pessoas, mas dão
            só pontos até você revisar: confira no mapa se o lugar existe e é seguro.
          </p>
          <div className="mt-3 space-y-3">
            {toReview.map((mission) => (
              <MissionReview key={mission.id} mission={mission} />
            ))}
          </div>
        </div>
      )}

      {demand.length > 0 && (
        <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="city-demand">
          <h3 className="font-bold text-slate-900">🙋 Cidades pedindo missões</h3>
          <p className="mt-1 text-sm text-slate-500">Pedidos do botão “Quero mais missões aqui”. Só a cidade é guardada.</p>
          <table className="mt-3 w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400">
                <th className="py-1 font-semibold">Cidade</th>
                <th className="py-1 text-right font-semibold">Pedidos</th>
                <th className="py-1 text-right font-semibold">Missões ativas</th>
              </tr>
            </thead>
            <tbody>
              {demand.map((row) => (
                <tr key={row.ibgeCode} className="border-t border-black/5">
                  <td className="py-1.5 font-medium text-slate-700">
                    {row.label}
                  </td>
                  <td className="py-1.5 text-right font-bold text-slate-900">{row.requests}</td>
                  <td className={`py-1.5 text-right ${row.missions === 0 ? "font-bold text-red-600" : "text-slate-600"}`}>{row.missions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <MissionForm sponsors={sponsors.filter((sponsor) => sponsor.isActive)} points={points} />
      {PAYMENTS_ENABLED && <SponsorsPanel sponsors={sponsors} />}
      <div className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-900">Todas as missões</h3>
        <div className="space-y-2">
          {missions.map((mission) => (
            <MissionRow key={mission.id} mission={mission} />
          ))}
        </div>
      </div>

      {seeds.length > 0 && (
        <details className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
          <summary className="cursor-pointer font-bold text-slate-900">🗺️ Buscas automáticas no OpenStreetMap ({seeds.length})</summary>
          <ul className="mt-3 space-y-1 text-sm">
            {seeds.map((seed) => (
              <li key={seed.ibgeCode} className="flex flex-wrap justify-between gap-2 border-t border-black/5 pt-1.5">
                <span className="text-slate-700">{seed.city ?? seed.ibgeCode}</span>
                <span className="text-xs text-slate-500">
                  {seed.status === "done" ? `✓ ${seed.missionsCreated} criada(s)` : seed.status === "running" ? "⏳ buscando" : `⚠️ falhou${seed.error ? `: ${seed.error}` : ""}`} · {seed.attemptedAt}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
