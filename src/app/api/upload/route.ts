import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { detectFileType, type MediaKind } from "@/lib/file-type";
import { rateLimit } from "@/lib/rate-limit";
import { saveFile } from "@/lib/storage";
import { sanitizeImage } from "@/lib/image-sanitize";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const KINDS: MediaKind[] = ["image", "audio", "video"];

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!rateLimit(`upload:${user.id}`, 20, 10 * 60 * 1000)) {
    return NextResponse.json({ error: "Too many uploads, try again later" }, { status: 429 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const type = String(formData.get("type") ?? "") as MediaKind;

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!KINDS.includes(type)) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }
    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 10MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // The real format comes from the file content, not from the name/MIME sent by the browser.
    const detected = detectFileType(buffer, type);
    if (!detected) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    // Images lose their EXIF (exact GPS, phone model) before anyone else can see them.
    const stored = detected.kind === "image" ? await sanitizeImage(buffer, detected.contentType) : buffer;
    if (!stored) {
      return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
    }

    const url = await saveFile(type, stored, detected.extension, detected.contentType);
    return NextResponse.json({ url, type: detected.contentType });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
