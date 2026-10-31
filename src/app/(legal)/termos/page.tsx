import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";
import { getLegalInfo } from "@/lib/legal-config";
import { LegalPage } from "@/components/legal/legal-page";
import { TermsContent } from "@/components/legal/terms-content";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Terms of Use · EcoVerify" };

export default async function TermsPage() {
  const lang = await guestLang(null, await getCurrentUser());
  return (
    <LegalPage lang={lang} title={t(lang, "terms_of_use")}>
      <TermsContent info={getLegalInfo()} />
    </LegalPage>
  );
}
