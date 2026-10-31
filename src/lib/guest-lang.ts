import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LANG, isLang, LANG_COOKIE, type Lang } from "@/lib/i18n";

/**
 * Language for a page: ?lang= link, then the signed-in user's setting, then the language the
 * visitor picked on the login/sign-up screen (cookie), then English.
 */
export async function guestLang(param?: string | null, user?: { language: Lang } | null): Promise<Lang> {
  if (isLang(param)) return param;
  if (user) return user.language;
  const saved = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(saved) ? saved : DEFAULT_LANG;
}
