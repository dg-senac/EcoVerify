"use client";

import { useState } from "react";
import { tx, type Lang } from "@/lib/i18n";
import { formatKg } from "@/lib/impact";
import type { Badge, PersonalImpact, Streak } from "@/lib/achievements";

/**
 * Citizen profile extras: weekly streak, personal impact (with a shareable image) and badges.
 * Shared by the web app and the APK; data comes from src/lib/achievements.ts.
 */

const box = "rounded-3xl border border-black/5 bg-white p-5 shadow-sm";

export function StreakCard({ lang, streak }: { lang: Lang; streak: Streak }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const hint =
    streak.current === 0
      ? T("Comece uma sequência: uma ação aprovada por semana.", "Start a streak: one approved action a week.", "Empieza una racha: una acción aprobada por semana.")
      : streak.thisWeekDone
        ? T("Semana garantida! Volte na próxima para continuar.", "This week is done! Come back next week to keep it going.", "¡Semana lograda! Vuelve la próxima para seguir.")
        : T("Faça uma ação até domingo para manter a sequência.", "Do one action by Sunday to keep your streak.", "Haz una acción antes del domingo para mantener la racha.");
  return (
    <div className={box} data-testid="streak-card">
      <div className="flex items-center gap-4">
        <div className={`grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-3xl ${streak.current > 0 ? "bg-orange-50" : "bg-slate-50 grayscale"}`}>🔥</div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-extrabold text-slate-900">
            {streak.current}{" "}
            {streak.current === 1 ? T("semana seguida", "week in a row", "semana seguida") : T("semanas seguidas", "weeks in a row", "semanas seguidas")}
          </p>
          <p className="text-xs text-slate-500">
            {T("Recorde", "Best", "Récord")}: {streak.best} · {hint}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-start gap-1.5" aria-label={T("Últimas 8 semanas", "Last 8 weeks", "Últimas 8 semanas")}>
        {streak.lastWeeks.map((done, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1">
            <div className={`h-2.5 w-full rounded-full ${done ? "bg-gradient-to-r from-orange-400 to-amber-400" : "bg-slate-100"}`} />
            {i === streak.lastWeeks.length - 1 && <span className="text-[10px] font-semibold text-slate-400">{T("agora", "now", "ahora")}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function impactTiles(lang: Lang, impact: PersonalImpact) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  return [
    { emoji: "✅", value: String(impact.actions), label: T("ações verificadas", "verified actions", "acciones verificadas") },
    { emoji: "♻️", value: formatKg(impact.recycledKg, lang), label: T("reciclados", "recycled", "reciclados") },
    { emoji: "🌳", value: String(impact.plantings), label: T("plantios", "plantings", "plantaciones") },
    { emoji: "🧹", value: String(impact.cleanups), label: T("limpezas", "clean-ups", "limpiezas") },
    { emoji: "🤝", value: String(impact.donations), label: T("doações", "donations", "donaciones") },
    { emoji: "👥", value: String(impact.events), label: T("mutirões", "clean-up events", "jornadas") },
  ];
}

export function ImpactCard({ lang, name, impact, streak, badgesEarned }: { lang: Lang; name: string; impact: PersonalImpact; streak: Streak; badgesEarned: number }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const tiles = impactTiles(lang, impact);
  return (
    <div className={box} data-testid="impact-card">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="font-bold text-slate-900">🌍 {T("Meu impacto", "My impact", "Mi impacto")}</h3>
        <ShareImpactButton lang={lang} name={name} impact={impact} streak={streak} badgesEarned={badgesEarned} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {tiles.map((tile) => (
          <div key={tile.label} className="rounded-xl bg-emerald-50/60 p-2.5 text-center">
            <p className="text-base">{tile.emoji}</p>
            <p className="text-base font-extrabold text-slate-900">{tile.value}</p>
            <p className="text-[11px] leading-tight text-slate-500">{tile.label}</p>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-400">
        {T("Só conta o que foi aprovado (foto + GPS conferidos).", "Only approved actions count (photo + GPS checked).", "Solo cuenta lo aprobado (foto + GPS verificados).")}
      </p>
    </div>
  );
}

export function BadgesGrid({ lang, badges }: { lang: Lang; badges: Badge[] }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const earned = badges.filter((b) => b.earned).length;
  return (
    <div className={box} data-testid="badges">
      <h3 className="mb-3 flex items-center justify-between font-bold text-slate-900">
        <span>🏆 {T("Conquistas", "Badges", "Logros")}</span>
        <span className="text-xs font-semibold text-slate-400">
          {earned}/{badges.length}
        </span>
      </h3>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {badges.map((b) => (
          <div key={b.id} className={`rounded-2xl border p-2.5 text-center ${b.earned ? "border-amber-200 bg-amber-50" : "border-slate-100 bg-slate-50"}`} title={b.goal}>
            <p className={`text-2xl ${b.earned ? "" : "opacity-40 grayscale"}`}>{b.emoji}</p>
            <p className={`mt-1 text-[11px] font-bold leading-tight ${b.earned ? "text-amber-900" : "text-slate-500"}`}>{b.name}</p>
            {b.earned ? (
              <p className="mt-0.5 text-[10px] text-amber-700">✓ {T("conquistado", "earned", "logrado")}</p>
            ) : (
              <>
                <div className="mx-auto mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.round(b.progress * 100)}%` }} />
                </div>
                <p className="mt-0.5 text-[10px] leading-tight text-slate-400">{b.goal}</p>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Share card (image drawn on a canvas, shared or downloaded)          */
/* ------------------------------------------------------------------ */

function drawShareCard(lang: Lang, name: string, impact: PersonalImpact, streak: Streak, badgesEarned: number): HTMLCanvasElement {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#2cc35f");
  bg.addColorStop(0.5, "#278c98");
  bg.addColorStop(1, "#2456d0");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Soft circles for depth.
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  ctx.beginPath();
  ctx.arc(W - 120, 140, 260, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(80, H - 120, 220, 0, Math.PI * 2);
  ctx.fill();

  const font = (weight: number, size: number) => `${weight} ${size}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
  ctx.fillStyle = "#fff";
  ctx.textBaseline = "alphabetic";
  ctx.font = font(800, 56);
  ctx.fillText("🌍 EcoVerify", 80, 130);

  ctx.font = font(600, 40);
  ctx.globalAlpha = 0.85;
  ctx.fillText(T("Meu impacto verificado", "My verified impact", "Mi impacto verificado"), 80, 250);
  ctx.globalAlpha = 1;
  ctx.font = font(800, 76);
  const shortName = name.length > 22 ? `${name.slice(0, 21)}…` : name;
  ctx.fillText(shortName, 80, 340);

  const tiles = impactTiles(lang, impact);
  const cols = 2;
  const tileW = (W - 160 - 40) / cols;
  const tileH = 220;
  tiles.forEach((tile, i) => {
    const x = 80 + (i % cols) * (tileW + 40);
    const y = 420 + Math.floor(i / cols) * (tileH + 30);
    ctx.fillStyle = "rgba(255,255,255,0.16)";
    ctx.beginPath();
    ctx.roundRect(x, y, tileW, tileH, 36);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = font(400, 54);
    ctx.fillText(tile.emoji, x + 36, y + 80);
    ctx.font = font(800, 72);
    ctx.fillText(tile.value, x + 36, y + 160);
    ctx.font = font(600, 32);
    ctx.globalAlpha = 0.85;
    ctx.fillText(tile.label, x + 36, y + 200);
    ctx.globalAlpha = 1;
  });

  ctx.font = font(700, 38);
  ctx.fillText(
    `🔥 ${streak.best} ${T("semanas seguidas (recorde)", "weeks in a row (best)", "semanas seguidas (récord)")}  ·  🏆 ${badgesEarned}`,
    80,
    H - 150,
  );
  ctx.font = font(500, 30);
  ctx.globalAlpha = 0.8;
  ctx.fillText(T("Ações comprovadas com foto e GPS no EcoVerify", "Actions proven with photo and GPS on EcoVerify", "Acciones comprobadas con foto y GPS en EcoVerify"), 80, H - 90);
  ctx.globalAlpha = 1;
  return canvas;
}

export function ShareImpactButton({ lang, name, impact, streak, badgesEarned }: { lang: Lang; name: string; impact: PersonalImpact; streak: Streak; badgesEarned: number }) {
  const T = (pt: string, en: string, es: string) => tx(lang, pt, en, es);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const shareText = T(
    `Já fiz ${impact.actions} ações ambientais verificadas no EcoVerify! 🌱`,
    `I've done ${impact.actions} verified environmental actions on EcoVerify! 🌱`,
    `¡Ya hice ${impact.actions} acciones ambientales verificadas en EcoVerify! 🌱`,
  );

  const open = () => {
    const canvas = drawShareCard(lang, name, impact, streak, badgesEarned);
    setPreview(canvas.toDataURL("image/png"));
    canvas.toBlob((blob) => {
      if (blob) setFile(new File([blob], "ecoverify-impact.png", { type: "image/png" }));
    }, "image/png");
  };

  const canShareFile = typeof navigator !== "undefined" && !!file && !!navigator.canShare?.({ files: [file] });
  const share = async () => {
    if (!file) return;
    try {
      await navigator.share({ files: [file], text: shareText });
    } catch {
      /* cancelled by the person */
    }
  };

  return (
    <>
      <button type="button" onClick={open} className="rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-emerald-700" data-testid="share-impact">
        {T("Compartilhar", "Share", "Compartir")}
      </button>
      {preview && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" role="dialog" aria-modal="true" onClick={() => setPreview(null)}>
          <div className="w-full max-w-sm rounded-3xl bg-white p-4 shadow-xl" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element -- generated data URL */}
            <img src={preview} alt={T("Cartão do meu impacto", "My impact card", "Tarjeta de mi impacto")} className="w-full rounded-2xl" />
            <p className="mt-2 text-center text-xs text-slate-500">{T("Sem localização nem fotos: só os seus números.", "No location or photos: just your numbers.", "Sin ubicación ni fotos: solo tus números.")}</p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {canShareFile ? (
                <button type="button" onClick={share} className="rounded-xl bg-emerald-600 px-3 py-2.5 text-sm font-bold text-white">
                  {T("Compartilhar", "Share", "Compartir")}
                </button>
              ) : (
                <a href={preview} download="ecoverify-impact.png" className="rounded-xl bg-emerald-600 px-3 py-2.5 text-center text-sm font-bold text-white">
                  {T("Baixar imagem", "Download image", "Descargar imagen")}
                </a>
              )}
              <button type="button" onClick={() => setPreview(null)} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600">
                {T("Fechar", "Close", "Cerrar")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
