"use client";

import { useState, useTransition } from "react";
import { Check, FileBarChart, Lock, MessageCircle, Users } from "lucide-react";
import { categoryEmoji, type Lang } from "@/lib/i18n";
import { formatBRL, type PlanId } from "@/lib/plans";
import { ORG_TEXT } from "@/lib/saas/org-text";
import {
  EVENT_PACKAGE_IDS,
  EVENT_PACKAGE_NAMES,
  EVENT_PACKAGES,
  EVENT_TEXT,
  eventUnlocked,
  isEventPackage,
  suggestedPackage,
  type EventPackage,
} from "@/lib/saas/events";
import { EventBadge } from "@/components/missions/event-badge";
import { PixBox, PixIcon, type BillingInvoice } from "@/components/org/billing-panel";

export interface EventRow {
  id: string;
  title: string;
  category: string;
  startsAt: string;
  endsAt: string;
  eventPackage: string | null;
  eventPaidAt: string | null;
  people: number;
  actions: number;
  pending: number;
  /** Pending Pix charge of this event (with the copy-and-paste code). */
  invoice: BillingInvoice | null;
}

type Result = { error?: string; success?: boolean };

/**
 * Events tab of an organization: one-off events (mutirões) with their numbers, the report link and,
 * without a paid plan, the "evento avulso" Pix checkout. Server actions on the web, local functions in the demo.
 */
export function EventsPanel({
  lang,
  plan,
  isOwner,
  events,
  pixAvailable,
  contactUrl,
  reportBase,
  onOpenReport,
  onCreate,
  onReport,
  onCancel,
}: {
  lang: Lang;
  plan: PlanId;
  isOwner: boolean;
  events: EventRow[];
  pixAvailable: boolean;
  contactUrl: string | null;
  /** Web: link to `${reportBase}/${id}`. Demo: onOpenReport(id). */
  reportBase?: string;
  onOpenReport?: (id: string) => void;
  onCreate: (missionId: string, pkg: EventPackage) => Promise<Result>;
  onReport: (invoiceId: string) => Promise<Result>;
  onCancel: (invoiceId: string) => Promise<Result>;
}) {
  const text = EVENT_TEXT[lang];
  return (
    <div className="grid gap-5" data-testid="events-panel">
      <p className="text-sm text-slate-500">{text.intro}</p>
      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500" data-testid="events-empty">
          {text.empty}
        </p>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            lang={lang}
            plan={plan}
            isOwner={isOwner}
            event={event}
            pixAvailable={pixAvailable}
            contactUrl={contactUrl}
            reportBase={reportBase}
            onOpenReport={onOpenReport}
            onCreate={onCreate}
            onReport={onReport}
            onCancel={onCancel}
          />
        ))
      )}
    </div>
  );
}

function EventCard({
  lang,
  plan,
  isOwner,
  event,
  pixAvailable,
  contactUrl,
  reportBase,
  onOpenReport,
  onCreate,
  onReport,
  onCancel,
}: {
  lang: Lang;
  plan: PlanId;
  isOwner: boolean;
  event: EventRow;
  pixAvailable: boolean;
  contactUrl: string | null;
  reportBase?: string;
  onOpenReport?: (id: string) => void;
  onCreate: (missionId: string, pkg: EventPackage) => Promise<Result>;
  onReport: (invoiceId: string) => Promise<Result>;
  onCancel: (invoiceId: string) => Promise<Result>;
}) {
  const text = EVENT_TEXT[lang];
  const orgText = ORG_TEXT[lang];
  const [choice, setChoice] = useState<EventPackage>(suggestedPackage(event.people));
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const unlocked = eventUnlocked(plan, event);
  const paidPackage = isEventPackage(event.eventPackage) && event.eventPaidAt ? event.eventPackage : null;

  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const result = await fn();
      setError(result.error ? (orgText.errors[result.error] ?? orgText.errors.invalid) : null);
    });

  const reportButton = (
    <>
      <FileBarChart className="h-4 w-4" /> {text.openReport}
    </>
  );
  const reportClass =
    "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg";

  return (
    <section className="rounded-2xl border border-black/5 bg-white p-5 shadow-sm" data-testid="event-card">
      <div className="flex flex-wrap items-start gap-3">
        <span className="text-2xl">{categoryEmoji[event.category] ?? "🎪"}</span>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-slate-900">{event.title}</h3>
          <EventBadge lang={lang} mission={event} />
        </div>
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-bold ${unlocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}
          data-testid={unlocked ? "event-unlocked" : "event-locked"}
        >
          {unlocked ? <Check className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
          {unlocked ? text.unlocked : text.locked}
          {unlocked && !paidPackage ? ` · ${text.includedInPlan}` : paidPackage ? ` · ${EVENT_PACKAGE_NAMES[paidPackage][lang]}` : ""}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-sm text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <Users className="h-4 w-4 text-slate-400" /> <b className="text-slate-900">{event.people}</b> {text.participants}
        </span>
        <span>
          <b className="text-slate-900">{event.actions}</b> {text.actions}
        </span>
        {event.pending > 0 && <span className="text-amber-700">⏳ {event.pending}</span>}
      </div>

      {unlocked ? (
        <div className="mt-4">
          {reportBase ? (
            <a href={`${reportBase}/${event.id}`} className={reportClass} data-testid="event-report-link">
              {reportButton}
            </a>
          ) : (
            <button type="button" onClick={() => onOpenReport?.(event.id)} className={reportClass} data-testid="event-report-link">
              {reportButton}
            </button>
          )}
        </div>
      ) : !isOwner ? (
        <p className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-600">{text.ownerOnlyPay}</p>
      ) : event.invoice ? (
        <div className="mt-4">
          <PixBox
            lang={lang}
            invoice={event.invoice}
            pending={pending}
            label={text.pixLabel(isEventPackage(event.invoice.eventPackage) ? EVENT_PACKAGE_NAMES[event.invoice.eventPackage][lang] : "")}
            onReport={() => run(() => onReport(event.invoice!.id))}
            onCancel={() => run(() => onCancel(event.invoice!.id))}
          />
        </div>
      ) : (
        <div className="mt-4 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-bold text-slate-800">{text.choosePackage}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {EVENT_PACKAGE_IDS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => setChoice(id)}
                data-testid={`event-package-${id}`}
                className={`rounded-xl border p-3 text-left transition ${choice === id ? "border-violet-400 bg-white ring-2 ring-violet-200" : "border-slate-200 bg-white hover:bg-slate-50"}`}
              >
                <span className="flex items-center justify-between text-sm font-bold text-slate-900">
                  {EVENT_PACKAGE_NAMES[id][lang]} {choice === id && <Check className="h-4 w-4 text-violet-600" />}
                </span>
                <span className="block text-lg font-extrabold text-slate-900">{formatBRL(EVENT_PACKAGES[id].cents, lang)}</span>
                <span className="block text-xs text-slate-500">{text.upTo(EVENT_PACKAGES[id].people)}</span>
              </button>
            ))}
          </div>
          {pixAvailable ? (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => onCreate(event.id, choice))}
              data-testid="event-generate-pix"
              className="mt-3 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-bold text-white shadow-md hover:shadow-lg disabled:opacity-60"
            >
              <PixIcon /> {text.payEvent}
            </button>
          ) : (
            <div className="mt-3 text-sm text-slate-600">
              <p>{orgText.pixNotConfigured}</p>
              {contactUrl && (
                <a href={contactUrl} className="mt-1 inline-flex items-center gap-1.5 font-bold text-emerald-700 hover:underline">
                  <MessageCircle className="h-4 w-4" /> {orgText.talkToUs}
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
    </section>
  );
}
