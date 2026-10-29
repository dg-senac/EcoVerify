/**
 * Reverse image search with Google Cloud Vision "Web Detection" — pure part (no server imports), so
 * the decision rules and the moderator panel are shared by the web app and the offline demo.
 *
 * Pricing (Oct 2026): first 1,000 images/month free, then US$ 3.50 per 1,000; needs a Google Cloud
 * project with billing enabled. The app stops at VISION_MONTHLY_LIMIT (default 1,000) so it stays free.
 */

export const VISION_FREE_UNITS_PER_MONTH = 1000;
export const VISION_ENDPOINT = "https://vision.googleapis.com/v1/images:annotate";
const MAX_LINKS = 5;

export type WebPage = { url: string; title: string | null };

export type WebMatches = {
  /** The same picture found on the internet (exact or resized). */
  fullMatches: string[];
  /** Pages that show the same picture. */
  pages: WebPage[];
  /** Crops/edits of the picture: a weaker signal (common scenes can match). */
  partialCount: number;
  /** Google's guess of what the picture is ("beach cleanup"...). */
  bestGuess: string | null;
};

/** "copy": the same picture is on the web; "partial": only crops/edits; "none": nothing found. */
export type WebVerdict = "copy" | "partial" | "none";

const isHttpUrl = (value: unknown): value is string => typeof value === "string" && /^https?:\/\//i.test(value) && value.length <= 2000;

function urls(list: unknown): string[] {
  if (!Array.isArray(list)) return [];
  return list.map((item) => (item && typeof item === "object" ? (item as { url?: unknown }).url : null)).filter(isHttpUrl);
}

/** Validates the Vision answer (untrusted JSON) for one image. */
export function parseWebDetection(raw: unknown): WebMatches | null {
  if (!raw || typeof raw !== "object") return null;
  const response = Array.isArray((raw as { responses?: unknown }).responses) ? (raw as { responses: unknown[] }).responses[0] : null;
  if (!response || typeof response !== "object") return null;
  if ((response as { error?: unknown }).error) return null;
  const web = (response as { webDetection?: Record<string, unknown> }).webDetection ?? {};

  const pagesRaw = Array.isArray(web.pagesWithMatchingImages) ? (web.pagesWithMatchingImages as Record<string, unknown>[]) : [];
  // Only pages that contain the *same* picture count as evidence; pages with partial matches don't.
  const pages: WebPage[] = pagesRaw
    .filter((page) => page && isHttpUrl(page.url) && urls(page.fullMatchingImages).length > 0)
    .slice(0, MAX_LINKS)
    .map((page) => ({ url: page.url as string, title: typeof page.pageTitle === "string" ? stripTags(page.pageTitle).slice(0, 160) : null }));

  const guess = Array.isArray(web.bestGuessLabels) ? (web.bestGuessLabels as { label?: unknown }[])[0]?.label : null;
  return {
    fullMatches: urls(web.fullMatchingImages).slice(0, MAX_LINKS),
    pages,
    partialCount: urls(web.partialMatchingImages).length,
    bestGuess: typeof guess === "string" ? guess.slice(0, 120) : null,
  };
}

export function webVerdict(matches: WebMatches | null | undefined): WebVerdict | null {
  if (!matches) return null;
  if (matches.fullMatches.length > 0 || matches.pages.length > 0) return "copy";
  if (matches.partialCount > 0) return "partial";
  return "none";
}

export function visionRequestBody(base64: string) {
  return { requests: [{ image: { content: base64 }, features: [{ type: "WEB_DETECTION", maxResults: 10 }] }] };
}

/** Readable host for the moderator ("noticias.exemplo.com"). */
export function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

function stripTags(text: string): string {
  return text.replace(/<[^>]*>/g, "").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}
