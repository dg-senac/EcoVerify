import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { t } from "@/lib/i18n";
import { SuggestMissionForm } from "@/components/missions/suggest-mission-form";

export default async function SuggestMissionPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const lang = user.language;
  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/missions" className="text-sm font-semibold text-slate-500 hover:text-slate-800">
        ← {t(lang, "missions_title")}
      </Link>
      <h1 className="mt-3 text-2xl font-bold text-slate-900">🙋 {t(lang, "suggest_title")}</h1>
      <p className="mt-1 text-sm text-slate-500">{t(lang, "suggest_subtitle")}</p>
      <SuggestMissionForm lang={lang} />
    </div>
  );
}
