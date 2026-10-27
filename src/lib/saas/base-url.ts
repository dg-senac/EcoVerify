import "server-only";
import { headers } from "next/headers";
import { appUrl } from "@/lib/email";

/** Absolute base URL for links printed on QR codes: APP_URL, or the host of the current request. */
export async function publicBaseUrl(): Promise<string> {
  const configured = appUrl();
  if (configured) return configured;
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
