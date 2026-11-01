import { sweepVerifications } from "@/lib/verification-server";

export const dynamic = "force-dynamic";

/**
 * Verification window (src/lib/verification.ts): closes expired extra proofs and retries the AI on
 * proofs still being verified. Call it every 10-15 minutes from any scheduler (Vercel Cron, GitHub
 * Actions, cron-job.org) with the header "Authorization: Bearer <CRON_SECRET>".
 * Without a scheduler the same work runs when the moderation or submissions pages are opened.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await sweepVerifications({ force: true, limit: 20 });
  return Response.json({ ok: true, ...result });
}
