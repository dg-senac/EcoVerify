import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { guestLang } from "@/lib/guest-lang";
import { getLegalInfo } from "@/lib/legal-config";
import { LegalPage } from "@/components/legal/legal-page";
import { PrivacyContent } from "@/components/legal/privacy-content";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Política de Privacidade · EcoVerify" };

export default async function PrivacyPage() {
  const lang = await guestLang(null, await getCurrentUser());
  return (
    <LegalPage lang={lang} title={t(lang, "privacy_policy")}>
      <PrivacyContent info={getLegalInfo()} />
    </LegalPage>
  );
}
