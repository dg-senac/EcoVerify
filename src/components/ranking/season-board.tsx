"use client";

import { useState, type ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import { initials, levelForPoints } from "@/lib/utils";
import { CUP_MIN_ACTIVE, daysLeft, seasonById, seasonProgress, seasonText, type CupStanding, type Ranked } from "@/lib/seasons";

export const RANKING_TABS = ["season", "all", "schools"] as const;
export type RankingTab = (typeof RANKING_TABS)[number];

export function rankingTab(value: string | null | undefined): RankingTab {
  return RANKING_TABS.find((tab) => tab === value) ?? "season";
}

export type BoardPerson = { id: string; name: string };
export type AllTimeRow = { id: string; name: string; points: number };

const MEDALS = ["🥇", "🥈", "🥉"];

function Avatar({ name, size = 40, gold = false }: { name: string; size?: number; gold?: boolean }) {
  return (
    <span
      className={`grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-bold text-white ${gold ? "from-amber-400 to-orange-500" : "from-emerald-500 to-teal-600"}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}

function Podium({ rows, viewerId, pointsLabel }: { rows: Ranked<BoardPerson>[]; viewerId: string; pointsLabel: string }) {
  const top = rows.slice(0, 3);
  if (top.length === 0) return null;
  // Visual order 2nd, 1st, 3rd.
  const order = [top[1], top[0], top[2]].filter(Boolean) as Ranked<BoardPerson>[];
  const heights = ["h-28", "h-20", "h-16"];
  return (
    <div className="mb-5 grid grid-cols-3 items-end gap-2 sm:gap-4" data-testid="season-podium">
      {order.map((row) => {
        const slot = top.indexOf(row);
        return (
          <div key={row.item.id} className="flex min-w-0 flex-col items-center gap-2 animate-slide-up">
            <Avatar name={row.item.name} size={slot === 0 ? 60 : 48} gold={slot === 0} />
            <p className={`max-w-full truncate text-center text-xs font-bold sm:text-sm ${row.item.id === viewerId ? "text-emerald-700" : "text-slate-800"}`}>{row.item.name.split(" ")[0]}</p>
            <div className={`flex w-full flex-col items-center rounded-t-2xl bg-gradient-to-b pt-2 ${heights[slot]} ${slot === 0 ? "from-amber-200 to-amber-50" : "from-emerald-100 to-emerald-50"}`}>
              <span className="text-2xl">{MEDALS[row.position - 1] ?? row.position}</span>
              <span className="text-sm font-extrabold text-slate-800">{row.points}</span>
              <span className="text-[10px] font-semibold text-slate-500">{pointsLabel}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Ranking screen with three tabs: the current season, all time and the Schools Cup (docs/COPA.md).
 * Shared by the web app (/ranking) and the APK; data comes ready from src/lib/seasons.ts.
 */
export function SeasonBoard({
  lang,
  viewerId,
  initialTab = "season",
  seasonId,
  previousId,
  now,
  people,
  viewerRank,
  previousPeople,
  allTime,
  cup,
  previousCup,
  mySchoolId,
  joinHintAction,
  onTabChange,
}: {
  lang: Lang;
  viewerId: string;
  initialTab?: RankingTab;
  seasonId: string;
  previousId: string;
  /** ms timestamp used for "ends in N days" (passed in so server and client agree). */
  now: number;
  people: Ranked<BoardPerson>[];
  /** The viewer's season position when `people` was cut (defaults to looking it up in `people`). */
  viewerRank?: Ranked<BoardPerson> | null;
  previousPeople: Ranked<BoardPerson>[];
  allTime: AllTimeRow[];
  cup: CupStanding[];
  previousCup: CupStanding[];
  mySchoolId: string | null;
  /** Link/button to the organizations screen (each platform renders its own). */
  joinHintAction?: ReactNode;
  onTabChange?: (tab: RankingTab) => void;
}) {
  const text = seasonText(lang);
  const [tab, setTab] = useState<RankingTab>(initialTab);
  const season = seasonById(seasonId)!;
  const previous = seasonById(previousId)!;
  const left = daysLeft(season, now);
  const progress = seasonProgress(season, now);
  const pointsLabel = t(lang, "reward_points");
  const me = viewerRank !== undefined ? viewerRank : people.find((r) => r.item.id === viewerId);
  const mySchool = mySchoolId ? cup.find((s) => s.school.id === mySchoolId) : undefined;

  const choose = (next: RankingTab) => {
    setTab(next);
    onTabChange?.(next);
  };
  const tabLabel: Record<RankingTab, string> = { season: `🔥 ${text.tabSeason}`, all: `⭐ ${text.tabAll}`, schools: `🏫 ${text.tabSchools}` };

  return (
    <div className="min-w-0">
      <div role="tablist" className="mb-5 grid grid-cols-3 gap-1 rounded-2xl bg-slate-100 p-1" data-testid="ranking-tabs">
        {RANKING_TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            data-tab={key}
            onClick={() => choose(key)}
            className={`min-w-0 truncate rounded-xl px-2 py-2 text-xs font-bold transition sm:text-sm ${tab === key ? "bg-white text-emerald-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tabLabel[key]}
          </button>
        ))}
      </div>

      {tab !== "all" && (
        <div className="mb-5 overflow-hidden rounded-3xl bg-gradient-to-r from-[#2cc35f] via-[#278c98] to-[#2456d0] p-5 text-white shadow-md" data-testid="season-banner">
          {tab === "schools" && <p className="mb-1 text-xs font-bold uppercase tracking-wider text-white/85">🏆 {text.cupTitle}</p>}
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="text-lg font-extrabold">{text.seasonName(season)}</p>
            <p className="text-sm font-semibold text-white/85">⏳ {text.daysLeft(left)}</p>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/25" aria-hidden>
            <div className="h-full rounded-full bg-white" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
          <p className="mt-3 text-sm leading-relaxed text-white/90">{tab === "season" ? text.seasonIntro : text.cupIntro}</p>
          {tab === "season" && (
            <p className="mt-2 text-sm font-bold" data-testid="season-me">
              {me ? text.myPosition(me.position, me.points) : text.notRankedYet}
            </p>
          )}
          {tab === "schools" && mySchoolId && (
            <p className="mt-2 text-sm font-bold" data-testid="cup-mine">
              🏫 {mySchool ? text.cupMine(mySchool.position, mySchool.school.name) : text.cupOrgNone}
            </p>
          )}
        </div>
      )}

      {tab === "season" && (
        <>
          {people.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{text.seasonEmpty}</p>
          ) : (
            <>
              <Podium rows={people} viewerId={viewerId} pointsLabel={pointsLabel} />
              <PeopleList rows={people.slice(3)} viewerId={viewerId} pointsLabel={pointsLabel} lang={lang} startTestId="season-list" />
            </>
          )}
          {previousPeople.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4" data-testid="season-previous">
              <p className="text-sm font-bold text-amber-900">🏅 {text.lastSeasonTop(previous)}</p>
              <ol className="mt-2 grid gap-1.5 sm:grid-cols-3">
                {previousPeople.map((row) => (
                  <li key={row.item.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                    <span>{MEDALS[row.position - 1]}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{row.item.name}</span>
                    <span className="text-xs font-bold text-slate-500">{row.points}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </>
      )}

      {tab === "all" && (
        <>
          <p className="mb-4 text-sm text-slate-500">{text.allIntro}</p>
          <PeopleList
            rows={allTime.map((row, index) => ({ item: { id: row.id, name: row.name }, points: row.points, position: index + 1 }))}
            viewerId={viewerId}
            pointsLabel={pointsLabel}
            lang={lang}
            showLevel
            startTestId="all-list"
          />
        </>
      )}

      {tab === "schools" && (
        <>
          {cup.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center text-sm text-slate-500">{text.cupEmpty}</p>
          ) : (
            <ol className="grid gap-2" data-testid="cup-table">
              {cup.map((row) => {
                const mine = row.school.id === mySchoolId;
                const ranked = row.position !== null;
                return (
                  <li
                    key={row.school.id}
                    data-testid="cup-row"
                    className={`flex min-w-0 items-center gap-3 rounded-2xl border px-4 py-3 shadow-sm ${
                      ranked && row.position! <= 3 ? "border-amber-200 bg-gradient-to-r from-amber-50 to-white" : ranked ? "border-black/5 bg-white" : "border-dashed border-slate-200 bg-slate-50"
                    } ${mine ? "ring-2 ring-emerald-400" : ""}`}
                  >
                    <span className="w-8 shrink-0 text-center text-lg font-extrabold text-slate-400">
                      {ranked ? (row.position! <= 3 ? MEDALS[row.position! - 1] : text.cupPositionShort(row.position!)) : "·"}
                    </span>
                    <span className="hidden h-10 w-10 shrink-0 place-items-center rounded-xl bg-blue-50 text-xl sm:grid" aria-hidden>
                      🏫
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 break-words font-semibold leading-snug text-slate-900">{row.school.name}</p>
                      <p className="mt-0.5 text-xs leading-snug text-slate-500">
                        {row.school.city ? `${row.school.city} · ` : ""}
                        {ranked ? text.cupActive(row.active) : text.cupWaiting(CUP_MIN_ACTIVE - row.active)}
                      </p>
                    </div>
                    <span className={`shrink-0 text-lg font-extrabold ${ranked ? "text-emerald-700" : "text-slate-400"}`}>
                      {row.points} <span className="text-xs font-medium text-slate-400">{text.pointsShort}</span>
                    </span>
                  </li>
                );
              })}
            </ol>
          )}

          {previousCup.length > 0 && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 p-4" data-testid="cup-champions">
              <p className="text-sm font-bold text-amber-900">🏆 {text.cupChampions(previous)}</p>
              <ol className="mt-2 grid gap-1.5">
                {previousCup.map((row) => (
                  <li key={row.school.id} className="flex min-w-0 items-center gap-2 rounded-xl bg-white px-3 py-2 text-sm">
                    <span>{MEDALS[(row.position ?? 1) - 1]}</span>
                    <span className="min-w-0 flex-1 truncate font-semibold text-slate-800">{row.school.name}</span>
                    {row.position === 1 && <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">{text.cupChampion}</span>}
                    <span className="text-xs font-bold text-slate-500">{row.points}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <details className="mt-6 rounded-2xl border border-black/5 bg-white p-4 shadow-sm" data-testid="cup-rules">
            <summary className="cursor-pointer text-sm font-bold text-slate-900">📋 {text.cupRulesTitle}</summary>
            <ul className="mt-3 grid gap-2 text-sm leading-relaxed text-slate-600">
              {text.cupRules.map((rule) => (
                <li key={rule} className="flex gap-2">
                  <span className="text-emerald-600">•</span>
                  <span>{rule}</span>
                </li>
              ))}
            </ul>
          </details>
          {!mySchoolId && (
            <p className="mt-4 text-sm leading-relaxed text-slate-500" data-testid="cup-join-hint">
              {text.cupJoinHint} {joinHintAction}
            </p>
          )}
        </>
      )}
    </div>
  );
}

function PeopleList({
  rows,
  viewerId,
  pointsLabel,
  lang,
  showLevel = false,
  startTestId,
}: {
  rows: Ranked<BoardPerson>[];
  viewerId: string;
  pointsLabel: string;
  lang: Lang;
  showLevel?: boolean;
  startTestId: string;
}) {
  if (rows.length === 0) return null;
  return (
    <ol className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-black/5 bg-white shadow-sm" data-testid={startTestId}>
      {rows.map((row) => {
        const isMe = row.item.id === viewerId;
        const level = showLevel ? levelForPoints(row.points, lang) : null;
        return (
          <li key={row.item.id} className={`flex min-w-0 items-center gap-3 px-4 py-3 ${isMe ? "bg-emerald-50/70" : ""}`}>
            <span className="w-7 shrink-0 text-center text-sm font-extrabold text-slate-400">{row.position <= 3 ? MEDALS[row.position - 1] : row.position}</span>
            <Avatar name={row.item.name} size={38} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-slate-900">
                {row.item.name} {isMe && <span className="text-xs font-bold text-emerald-600">{t(lang, "you_suffix")}</span>}
              </p>
              {level && (
                <p className="text-xs text-slate-500">
                  {level.emoji} {level.name}
                </p>
              )}
            </div>
            <span className="shrink-0 text-sm font-extrabold text-slate-800">
              {row.points} <span className="text-xs font-semibold text-slate-400">{pointsLabel}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
