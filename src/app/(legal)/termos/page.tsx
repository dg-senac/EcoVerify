import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { getLegalInfo } from "@/lib/legal-config";
import { LegalPage } from "@/components/legal/legal-page";
import { TermsContent } from "@/components/legal/terms-content";
import { t } from "@/lib/i18n";

export const metadata: Metadata = { title: "Termos de Uso · EcoVerify" };

export default async function TermsPage() {
  const lang = (await getCurrentUser())?.language ?? "pt";
  return (
    <LegalPage lang={lang} title={t(lang, "terms_of_use")}>
      <TermsContent info={getLegalInfo()} />
    </LegalPage>
  );
}
