import { PAYMENTS_ENABLED } from "@/lib/features";
import { initials } from "@/lib/utils";
import { FoneAmount, FoneMark } from "@/components/brand/fone";

export function MetricsTab({
  metrics,
  topRanking,
}: {
  metrics: {
    pending: number;
    approved: number;
    rejected: number;
    approvalRate: number;
    pointsDistributed: number;
    totalUsers: number;
    foneQueued: string;
    fonePaid: string;
  };
  topRanking: { id: string; name: string; totalPoints: number }[];
}) {
  const cards = [
    { label: "Pendentes", value: metrics.pending, icon: "⏳", color: "from-amber-400 to-amber-500" },
    { label: "Aprovadas", value: metrics.approved, icon: "✅", color: "from-emerald-400 to-emerald-500" },
    { label: "Rejeitadas", value: metrics.rejected, icon: "❌", color: "from-red-400 to-red-500" },
    { label: "Taxa de aprovação", value: `${metrics.approvalRate}%`, icon: "📈", color: "from-sky-400 to-sky-500" },
    { label: "Pontos distribuídos", value: metrics.pointsDistributed, icon: "⭐", color: "from-purple-400 to-purple-500" },
    { label: "Total de usuários", value: metrics.totalUsers, icon: "👥", color: "from-teal-400 to-teal-500" },
    ...(PAYMENTS_ENABLED
      ? [
          { label: "FONE na fila", value: <FoneAmount amount={metrics.foneQueued} size={22} />, icon: "⏱️", color: "from-orange-400 to-orange-500" },
          { label: "FONE já pago", value: <FoneAmount amount={metrics.fonePaid} size={22} />, icon: "💸", color: "from-green-400 to-green-500" },
        ]
      : []),
  ];

  return (
    <div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm animate-slide-up">
            <div className={`mb-3 grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br text-lg text-white ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900">{card.value}</p>
            <p className="mt-0.5 text-xs font-medium text-slate-500">{card.label}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-black/5 bg-white p-5 shadow-sm">
        <h3 className="mb-3 font-bold text-slate-900">🏆 Topo do ranking</h3>
        <div className="space-y-2">
          {topRanking.map((row, i) => (
            <div key={row.id} className="flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-slate-50">
              <span className="w-5 text-sm font-bold text-slate-400">{i + 1}</span>
              <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-xs font-bold text-white">
                {initials(row.name)}
              </div>
              <span className="flex-1 text-sm font-medium text-slate-700">{row.name}</span>
              <span className="text-sm font-bold text-emerald-700">{row.totalPoints} pts</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
