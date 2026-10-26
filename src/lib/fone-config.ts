import { isValidFoneAddress, normalizeHex } from "@/lib/fone";

/**
 * Server-side Fone settings (read from the environment, never sent to the client except the
 * public verification address shown to users).
 *
 * FONE_TREASURY_ADDRESS: native FONE address of the EcoVerify wallet that receives the
 *   ownership-proof transfers. Use a dedicated wallet, not the one holding the reward pool.
 * FONE_EXPLORER_URL: explorer base URL (default https://fone.dev).
 */
export function getFoneConfig() {
  const rawTreasury = normalizeHex(process.env.FONE_TREASURY_ADDRESS);
  const treasury = isValidFoneAddress(rawTreasury) ? rawTreasury : null;
  if (rawTreasury && !treasury) {
    console.warn("[fone] FONE_TREASURY_ADDRESS is not a valid native FONE address; wallet verification is disabled.");
  }
  const explorerUrl = (process.env.FONE_EXPLORER_URL || "").trim() || undefined;
  return { treasury, explorerUrl };
}
