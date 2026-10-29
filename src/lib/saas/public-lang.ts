import "server-only";
import { headers } from "next/headers";
import type { Lang } from "@/lib/i18n";
import type { SessionUser } from "@/lib/auth";

/** Language of public pages (organization page, certificate): ?lang=, the signed-in user, or the browser. */
export async function pickPublicLang(param: string | undefined, user: SessionUser | null): Promise<Lang> {
  if (param === "pt" || param === "en" || param === "es") return param;
  if (user) return user.language;
  const accept = ((await headers()).get("accept-language") ?? "").toLowerCase();
  if (accept.startsWith("en")) return "en";
  if (accept.startsWith("es")) return "es";
  return "pt";
}
