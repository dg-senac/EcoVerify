import { nearestMunicipality, type Municipality } from "@/lib/region";

/** The municipality list (~260 KB) is only downloaded when it is needed. */
let cache: Promise<Municipality[]> | null = null;
export function loadMunicipalities() {
  cache ??= import("@/data/municipios-br.json").then((m) => m.default as unknown as Municipality[]);
  return cache;
}

export async function placeOf(lat: number, lng: number): Promise<{ city: string; stateCode: string } | null> {
  const m = nearestMunicipality(await loadMunicipalities(), lat, lng);
  return m ? { city: m[1], stateCode: m[2] } : null;
}
