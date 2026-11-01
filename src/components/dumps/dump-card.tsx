"use client";

import type { ReactNode } from "react";
import type { Lang } from "@/lib/i18n";
import { dumpExpiresAt, dumpText, formatDistance, type DumpItem, type DumpRejection } from "@/lib/dumps";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-slate-100 text-slate-700",
  review: "bg-amber-100 text-amber-800",
  open: "bg-orange-100 text-orange-800",
  confirmed: "bg-sky-100 text-sky-800",
  resolved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  expired: "bg-slate-100 text-slate-500",
};

export function dumpStatusKey(item: Pick<DumpItem, "status" | "needsReview">) {
  return item.status === "pending" && item.needsReview ? "review" : item.status;
}

/** One reported spot (citizen lists and the admin panel). */
export function DumpCard({ lang, item, children, admin }: { lang: Lang; item: DumpItem; children?: ReactNode; admin?: boolean }) {
  const text = dumpText(lang);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const date = (v: string | Date) => new Date(v).toLocaleDateString(locale, { day: "2-digit", month: "short" });
  const key = dumpStatusKey(item);
  const reason = item.status === "rejected" && item.rejectionCode ? text.rejection[item.rejectionCode as DumpRejection] : null;
  return (
    <li className="flex min-w-0 gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm" data-dump={item.id} data-dump-status={key}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={item.photoUrl} alt="" className="h-20 w-20 shrink-0 rounded-xl bg-slate-100 object-cover" />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_STYLE[key]}`}>{text.status[key as keyof typeof text.status]}</span>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">{text.sizes[item.size].split(" (")[0]}</span>
          {item.distanceM !== undefined && <span className="text-[11px] font-semibold text-slate-500">{text.away(formatDistance(item.distanceM))}</span>}
        </div>
        <p className="mt-1 truncate text-sm font-semibold text-slate-800">
          {item.city ?? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}`}
          {admin && item.reporterName ? <span className="font-normal text-slate-500"> · {text.by(item.reporterName)}</span> : null}
        </p>
        {item.note && <p className="mt-0.5 line-clamp-2 text-xs text-slate-600">“{item.note}”</p>}
        <p className="mt-0.5 text-[11px] text-slate-500">
          {text.reportedOn(date(item.createdAt))}
          {item.status === "open" && ` · ${text.expiresOn(date(dumpExpiresAt(item.createdAt)))}`}
          {admin && item.confirmations !== undefined && ` · ${text.confirmations(item.confirmations)}`}
        </p>
        {reason && <p className="mt-1 text-xs font-semibold text-red-700">{reason}</p>}
        {admin && item.aiReason && (
          <p className="mt-1 text-xs text-slate-600">
            <span className="font-bold">{text.aiSays}:</span> {item.aiReason}
          </p>
        )}
        {admin && (
          <a
            href={`https://www.openstreetmap.org/?mlat=${item.latitude}&mlon=${item.longitude}#map=18/${item.latitude}/${item.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="mt-1 inline-block text-xs font-semibold text-emerald-700 hover:underline"
          >
            📍 {item.latitude.toFixed(5)}, {item.longitude.toFixed(5)}
          </a>
        )}
        {children}
      </div>
    </li>
  );
}
