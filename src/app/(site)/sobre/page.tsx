import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth";
import { LandingPage, pickLandingLang } from "../landing-page";

export const metadata: Metadata = {
  title: "EcoVerify · Ações ambientais verificadas e recompensadas",
  description: "Missões com foto e GPS, verificação por IA, ranking e recompensas em FONE. Planos para escolas, empresas e prefeituras.",
};

export default async function AboutPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await getCurrentUser();
  const lang = await pickLandingLang((await searchParams).lang, user);
  return <LandingPage lang={lang} user={user} path="/sobre" />;
}
