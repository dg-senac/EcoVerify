import { DEFAULT_LEGAL_INFO, type LegalInfo } from "@/lib/legal";

/** Server-side: controller name and privacy contact from the environment. */
export function getLegalInfo(): LegalInfo {
  const email = (process.env.LEGAL_CONTACT_EMAIL || "").trim();
  return {
    controllerName: (process.env.LEGAL_CONTROLLER_NAME || "").trim() || DEFAULT_LEGAL_INFO.controllerName,
    contactEmail: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null,
  };
}
