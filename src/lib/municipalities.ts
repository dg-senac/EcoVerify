import "server-only";
import data from "@/data/municipios-br.json";
import { nearestMunicipality, type Municipality } from "@/lib/region";

export const MUNICIPALITIES = data as unknown as Municipality[];

export function municipalityByIbge(ibge: number): Municipality | null {
  return MUNICIPALITIES.find((m) => m[0] === ibge) ?? null;
}

/** City / UF / IBGE code of a point, for mission labels and metrics. */
export function placeOf(lat: number, lng: number) {
  const m = nearestMunicipality(MUNICIPALITIES, lat, lng);
  return m ? { city: m[1], stateCode: m[2], ibgeCode: m[0] } : { city: null, stateCode: null, ibgeCode: null };
}
