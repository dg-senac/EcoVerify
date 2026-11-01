import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { citizenOnly } from "@/lib/role-guard";
import { getRegion } from "@/lib/regional/cookie";
import { dumpText } from "@/lib/dumps";
import { myDumpReports } from "@/lib/dumps-server";
import { nearbyDumpsAction } from "@/lib/actions/dumps";
import { DumpScreenWeb } from "@/components/dumps/dump-screen-web";

export const dynamic = "force-dynamic";

export default async function DumpsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  citizenOnly(user.role);
  const lang = user.language;
  const text = dumpText(lang);
  const region = await getRegion();
  // Until the person shares the exact location, the list uses the region chosen on the missions screen.
  const nearby = region ? await nearbyDumpsAction(region.lat, region.lng) : null;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">🗑️ {text.title}</h1>
      <p className="mt-1 mb-5 text-sm leading-relaxed text-slate-500">{text.subtitle}</p>
      <DumpScreenWeb lang={lang} myReports={await myDumpReports(user.id)} initialNearby={nearby} />
    </div>
  );
}
