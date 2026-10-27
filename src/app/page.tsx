import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { LandingPage, pickLandingLang } from "./(site)/landing-page";

export const metadata: Metadata = {
  title: "EcoVerify · Ações ambientais verificadas e recompensadas",
  description: "Missões com foto e GPS, verificação por IA, ranking e recompensas em FONE. Planos para escolas, empresas e prefeituras.",
};

/** Signed in → the app. Signed out → the public site (also at /sobre). */
export default async function RootPage({ searchParams }: { searchParams: Promise<{ lang?: string }> }) {
  const user = await getCurrentUser();
  if (user) redirect("/missions");
  const lang = await pickLandingLang((await searchParams).lang, null);
  return <LandingPage lang={lang} user={null} path="/" />;
}
