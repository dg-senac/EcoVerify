import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isValidStoragePath, readStoredFile } from "@/lib/storage";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ folder: string; name: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { folder, name } = await params;
  if (!isValidStoragePath(folder, name)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const file = await readStoredFile(folder, name);
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(file.body as BodyInit, {
    headers: {
      "Content-Type": file.contentType,
      "Cache-Control": "private, max-age=86400, immutable",
      // Files are user generated: never let the browser sniff them into HTML/JS.
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; media-src 'self'; sandbox",
      "Content-Disposition": "inline",
    },
  });
}
