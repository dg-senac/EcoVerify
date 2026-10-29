import "server-only";
import sharp from "sharp";

const MAX_SIDE = 2048;

/**
 * Community images are seen by every user: phone photos carry EXIF with the exact GPS position
 * (often the person's home), the phone model and the date. Re-encode them upright and without
 * metadata (sharp drops EXIF/XMP/ICC unless asked to keep them), keeping the format.
 * GIFs are kept as they are (animation; the format has no EXIF/GPS block).
 * Returns null when the file cannot be decoded as an image.
 */
export async function sanitizeImage(buffer: Buffer, contentType: string): Promise<Buffer | null> {
  if (contentType === "image/gif") return buffer;
  try {
    const image = sharp(buffer, { failOn: "error" })
      .rotate()
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true });
    if (contentType === "image/png") return await image.png({ compressionLevel: 9 }).toBuffer();
    if (contentType === "image/webp") return await image.webp({ quality: 85 }).toBuffer();
    return await image.jpeg({ quality: 85, mozjpeg: true }).toBuffer();
  } catch {
    return null;
  }
}
