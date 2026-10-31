import "server-only";
import type { Lang } from "@/lib/i18n";
import type { SessionUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";

/** Language of public pages (organization page, certificate, partner page): ?lang=, the signed-in user, the visitor's choice or English. */
export async function pickPublicLang(param: string | undefined, user: SessionUser | null): Promise<Lang> {
  return guestLang(param, user);
}
