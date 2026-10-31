import { tx, type Lang } from "@/lib/i18n";

export type StaffWorkStats = {
  /** Decisions this person made on proofs (approve + reject). */
  approved: number;
  rejected: number;
  /** Decisions in the last 7 days. */
  lastWeek: number;
  /** Yellow/red cards this person issued. */
  cardsGiven: number;
};

type Permission = { ok: boolean; text: string };

function permissions(lang: Lang, role: "moderator" | "admin"): Permission[] {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const shared: Permission[] = [
    { ok: true, text: T("Revisar comprovações duvidosas e as que a IA enviou para a equipe", "Review doubtful proofs and the ones the AI sent to the team", "Revisar comprobantes dudosos y los que la IA envió al equipo") },
    { ok: true, text: T("Analisar contestações de rejeição", "Handle appeals against rejections", "Analizar apelaciones de rechazo") },
    { ok: true, text: T("Dar cartão amarelo, sempre com o motivo", "Give yellow cards, always with a reason", "Dar tarjeta amarilla, siempre con el motivo") },
    { ok: true, text: T("Aprovar ou recusar missões sugeridas na região", "Approve or turn down missions suggested in the region", "Aprobar o rechazar misiones sugeridas en la región") },
  ];
  if (role === "moderator") {
    return [
      ...shared,
      { ok: false, text: T("Cartão vermelho, suspensão e bloqueio: só administradores", "Red cards, suspensions and bans: admins only", "Tarjeta roja, suspensión y bloqueo: solo administradores") },
      { ok: false, text: T("Missões, usuários, benefícios e dados: só administradores", "Missions, users, perks and data: admins only", "Misiones, usuarios, beneficios y datos: solo administradores") },
    ];
  }
  return [
    ...shared,
    { ok: true, text: T("Cartão vermelho, suspensão, bloqueio e revisão de cartões contestados", "Red cards, suspensions, bans and review of appealed cards", "Tarjeta roja, suspensión, bloqueo y revisión de tarjetas apeladas") },
    { ok: true, text: T("Criar e editar missões, benefícios e parceiros", "Create and edit missions, perks and partners", "Crear y editar misiones, beneficios y socios") },
    { ok: true, text: T("Usuários e equipe (ligar ou desligar moderadores)", "Users and team (turn moderators on or off)", "Usuarios y equipo (activar o desactivar moderadores)") },
    { ok: true, text: T("Reciclagem e dados agregados, sem nomes", "Recycling and aggregated data, with no names", "Reciclaje y datos agregados, sin nombres") },
  ];
}

/**
 * Profile body for staff (active moderators and admins): their review work and what the role
 * allows, instead of the citizen's points, level and cards. Shared by the web app and the APK.
 */
export function StaffWork({ lang, role, stats }: { lang: Lang; role: "moderator" | "admin"; stats: StaffWorkStats }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const tiles = [
    { label: T("Decisões tomadas", "Decisions made", "Decisiones tomadas"), value: stats.approved + stats.rejected, tone: "bg-slate-50 text-slate-800" },
    { label: T("Nos últimos 7 dias", "In the last 7 days", "En los últimos 7 días"), value: stats.lastWeek, tone: "bg-sky-50 text-sky-800" },
    { label: T("Aprovadas", "Approved", "Aprobadas"), value: stats.approved, tone: "bg-emerald-50 text-emerald-800" },
    { label: T("Rejeitadas", "Rejected", "Rechazadas"), value: stats.rejected, tone: "bg-red-50 text-red-800" },
    { label: T("Cartões dados", "Cards given", "Tarjetas dadas"), value: stats.cardsGiven, tone: "bg-amber-50 text-amber-800" },
  ];
  return (
    <div className="grid gap-4" data-testid="staff-work">
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">{T("Seu trabalho na equipe", "Your work on the team", "Tu trabajo en el equipo")}</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
          {tiles.map((tile) => (
            <div key={tile.label} className={`rounded-xl p-3 text-center ${tile.tone}`}>
              <p className="text-lg font-extrabold">{tile.value}</p>
              <p className="text-[11px] font-medium opacity-80">{tile.label}</p>
            </div>
          ))}
        </div>
      </div>
      <div>
        <p className="mb-2 text-sm font-semibold text-slate-700">{T("O que o seu papel permite", "What your role allows", "Lo que permite tu rol")}</p>
        <ul className="grid gap-1.5 text-sm">
          {permissions(lang, role).map((p) => (
            <li key={p.text} className={`flex gap-2 ${p.ok ? "text-slate-700" : "text-slate-400"}`}>
              <span className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] font-bold ${p.ok ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                {p.ok ? "✓" : "–"}
              </span>
              {p.text}
            </li>
          ))}
        </ul>
      </div>
      <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {T(
          "Para manter as decisões imparciais, contas da equipe não fazem missões, não enviam comprovações e não entram no ranking.",
          "To keep decisions impartial, team accounts do not do missions, submit proof or appear in the ranking.",
          "Para que las decisiones sean imparciales, las cuentas del equipo no hacen misiones, no envían comprobantes ni entran en el ranking.",
        )}
      </p>
    </div>
  );
}
