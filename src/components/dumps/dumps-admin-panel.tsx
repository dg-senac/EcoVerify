"use client";

import { useState, useTransition } from "react";
import type { Lang } from "@/lib/i18n";
import { dumpsCsv, dumpText, type DumpItem } from "@/lib/dumps";
import { DumpCard, dumpStatusKey } from "./dump-card";

type Filter = "all" | "review" | "open" | "confirmed" | "resolved";

/**
 * Admin → "Lixo irregular". Everything is automatic (AI check, confirmation by another person,
 * cleanup mission); the admin only decides what the AI sent for review, as a last resort, and can
 * download the spots as CSV for the city hall. Shared by the web app and the APK.
 */
export function DumpsAdminPanel({
  lang,
  items,
  onDecision,
}: {
  lang: Lang;
  items: DumpItem[];
  onDecision: (reportId: string, decision: "publish" | "confirm" | "reject") => Promise<{ error?: string }>;
}) {
  const text = dumpText(lang);
  const [filter, setFilter] = useState<Filter>("all");
  const [pending, start] = useTransition();
  const [busyId, setBusyId] = useState<string | null>(null);
  const counts = {
    review: items.filter((i) => dumpStatusKey(i) === "review").length,
    open: items.filter((i) => i.status === "open").length,
    confirmed: items.filter((i) => i.status === "confirmed").length,
    resolved: items.filter((i) => i.status === "resolved").length,
  };
  const shown = filter === "all" ? items : items.filter((i) => dumpStatusKey(i) === filter);

  const decide = (id: string, decision: "publish" | "confirm" | "reject") => {
    setBusyId(id);
    start(async () => {
      await onDecision(id, decision);
      setBusyId(null);
    });
  };

  const download = () => {
    const csv = dumpsCsv(items.map((i) => ({ ...i, confirmedAt: null, resolvedAt: null, stateCode: null })));
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lixo-irregular-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const btn = "rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-50";
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid="dumps-admin">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">🗑️ {text.adminTitle}</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">{text.adminHint}</p>
        </div>
        <button type="button" onClick={download} disabled={items.length === 0} className={`${btn} border border-slate-200 bg-white text-slate-700 hover:bg-slate-50`}>
          ⬇️ {text.adminCsv}
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(counts) as (keyof typeof counts)[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setFilter(filter === k ? "all" : k)}
            className={`rounded-xl border p-2 text-left ${filter === k ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            data-dump-filter={k}
          >
            <p className="text-xl font-extrabold text-slate-900">{counts[k]}</p>
            <p className="text-[11px] font-semibold text-slate-600">{text.adminStats[k]}</p>
          </button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">{text.adminEmpty}</p>
      ) : (
        <ul className="mt-4 grid min-w-0 grid-cols-1 gap-3">
          {shown.map((item) => {
            const key = dumpStatusKey(item);
            const busy = pending && busyId === item.id;
            return (
              <DumpCard key={item.id} lang={lang} item={item} admin>
                {(key === "review" || key === "open") && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {key === "review" && (
                      <button type="button" disabled={busy} onClick={() => decide(item.id, "publish")} className={`${btn} bg-emerald-600 text-white`} data-dump-action="publish">
                        {text.adminApprove}
                      </button>
                    )}
                    <button type="button" disabled={busy} onClick={() => decide(item.id, "confirm")} className={`${btn} bg-sky-600 text-white`} data-dump-action="confirm">
                      {text.adminConfirm}
                    </button>
                    <button type="button" disabled={busy} onClick={() => decide(item.id, "reject")} className={`${btn} bg-red-50 text-red-700`} data-dump-action="reject">
                      {text.adminReject}
                    </button>
                  </div>
                )}
              </DumpCard>
            );
          })}
        </ul>
      )}
    </section>
  );
}
