import type { ReactNode } from "react";
import { isInternetCopyFlag, rejectionReasonText, type AiChecks } from "@/lib/ai/decision";
import { t, tf, type Lang } from "@/lib/i18n";
import { hostOf } from "@/lib/ai/web-detection-core";

/**
 * Result of the automatic verification, shown to moderators on each pending proof.
 * Presentational only: shared by the web app and the offline demo.
 */
export type AiPanelData = {
  aiStatus: "queued" | "done" | "failed" | null;
  aiVerdict: "approve" | "reject" | "review" | null;
  aiConfidence: number | null;
  aiReasonCode: string | null;
  aiSummary: string | null;
  aiChecks: AiChecks | null;
};

const VERDICT_STYLE = {
  approve: "border-emerald-200 bg-emerald-50 text-emerald-800",
  reject: "border-red-200 bg-red-50 text-red-800",
  review: "border-amber-200 bg-amber-50 text-amber-800",
} as const;

/** Google Lens: the moderator uploads (or drags) the downloaded photo there. */
export const GOOGLE_LENS_URL = "https://lens.google.com/";

/**
 * Red alert for a proof the AI flagged as a possible copy from the internet. The model cannot search
 * the web, so a person confirms with a reverse image search before deciding. Photos are behind the
 * login, so they cannot be sent to Lens by URL: the moderator downloads and uploads the file.
 */
export function InternetCopyAlert({ lang, signs, photoUrl, checks }: { lang: Lang; signs?: string | null; photoUrl?: string; checks?: AiChecks }) {
  const pages = checks?.webPages ?? [];
  const images = checks?.webFullMatches ?? [];
  return (
    <div className="mt-4 rounded-xl border-2 border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900" data-testid="internet-flag">
      <p className="font-bold">⚠️ {t(lang, "internet_flag_title")}</p>
      {(pages.length > 0 || images.length > 0) && (
        <div className="mt-2 rounded-lg bg-white/70 px-3 py-2" data-testid="web-matches">
          <p className="font-semibold">{t(lang, "web_found_title")}</p>
          <ul className="mt-1 space-y-0.5 text-xs">
            {(pages.length ? pages : images.map((url) => ({ url, title: null }))).map((page) => (
              <li key={page.url} className="break-words [overflow-wrap:anywhere]">
                <a href={page.url} target="_blank" rel="noopener noreferrer nofollow" className="font-semibold text-red-700 underline">
                  {hostOf(page.url)}
                </a>
                {page.title && <span className="text-red-800/80"> · {page.title}</span>}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11px] text-red-800/80">{t(lang, "web_found_hint")}</p>
        </div>
      )}
      {signs && (
        <p className="mt-1">
          <span className="font-semibold">{t(lang, "internet_flag_signs")}:</span> {signs}
        </p>
      )}
      <p className="mt-1.5 text-xs leading-relaxed text-red-800">{t(lang, "internet_flag_hint")}</p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {photoUrl && (
          <a
            href={photoUrl}
            download="ecoverify-comprovacao.jpg"
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-bold text-red-700 transition hover:bg-red-100"
            data-testid="internet-download"
          >
            ⬇️ {t(lang, "internet_download")}
          </a>
        )}
        <a
          href={GOOGLE_LENS_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-red-500"
          data-testid="internet-lens"
        >
          🔎 {t(lang, "internet_lens")}
        </a>
      </div>
    </div>
  );
}

export function AiPanel({
  lang,
  data,
  action,
  photoUrl,
}: {
  lang: Lang;
  data: AiPanelData;
  action?: ReactNode;
  /** Photo of the proof, for the "download / reverse search" buttons of a flagged proof. */
  photoUrl?: string;
}) {
  if (!data.aiStatus) return null;

  if (data.aiStatus === "queued") {
    return (
      <div className="mt-4 flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-500" aria-hidden="true" />
        <span className="font-semibold">🤖 {t(lang, "ai_queued")}</span>
      </div>
    );
  }

  if (data.aiStatus === "failed") {
    return (
      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
        <p>🤖 {t(lang, "ai_failed")}</p>
        {action && <div className="mt-2">{action}</div>}
      </div>
    );
  }

  const verdict = data.aiVerdict ?? "review";
  const checks = data.aiChecks ?? {};
  const reason = rejectionReasonText(data.aiReasonCode, lang);
  const title =
    verdict === "approve" ? t(lang, "ai_suggests_approve") : verdict === "reject" ? t(lang, "ai_suggests_reject") : t(lang, "ai_suggests_review");

  return (
    <>
    {isInternetCopyFlag(data.aiReasonCode) && <InternetCopyAlert lang={lang} signs={checks.internetSigns} photoUrl={photoUrl} checks={checks} />}
    <div className={`mt-4 rounded-xl border px-4 py-3 text-sm ${VERDICT_STYLE[verdict]}`} data-testid="ai-panel">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-bold">🤖 {title}</span>
        {data.aiConfidence !== null && (
          <span className="rounded-full bg-slate-900/5 px-2 py-0.5 text-xs font-semibold">
            {data.aiConfidence}% {t(lang, "ai_confidence")}
          </span>
        )}
      </div>
      {reason && <p className="mt-1.5 font-medium">{reason}</p>}
      {data.aiSummary && <p className="mt-1.5 opacity-90">{data.aiSummary}</p>}
      {checks.whatIsVisible && (
        <p className="mt-1.5 text-xs opacity-80">
          <span className="font-semibold">{t(lang, "ai_seen")}:</span> {checks.whatIsVisible}
        </p>
      )}
      {(checks.similarSubmissionId || checks.identifiableFaces) && (
        <ul className="mt-2 space-y-0.5 text-xs font-semibold">
          {checks.similarSubmissionId && (
            <li>
              ⚠️ {t(lang, "ai_flag_similar")} ({checks.similarDistance}/64)
            </li>
          )}
          {checks.identifiableFaces && <li>👤 {t(lang, "ai_flag_faces")}</li>}
        </ul>
      )}
      {checks.webChecked && !isInternetCopyFlag(data.aiReasonCode) && (
        <p className="mt-2 text-xs font-semibold" data-testid="web-status">
          {checks.webError
            ? t(lang, "web_failed")
            : (checks.webPartialCount ?? 0) > 0
              ? tf(lang, "web_partial", { count: checks.webPartialCount ?? 0 })
              : t(lang, "web_none")}
        </p>
      )}
      {!checks.whatIsVisible && !data.aiSummary && !checks.webChecked && <p className="mt-1 text-xs opacity-80">{t(lang, "ai_rules_only")}</p>}
    </div>
    </>
  );
}
