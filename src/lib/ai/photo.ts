import "server-only";
import sharp from "sharp";

/**
 * Proof photo processing (local, free, no AI):
 * - stored copy: rotated upright, max 2048 px, re-encoded as JPEG **without metadata** (EXIF can
 *   carry the exact GPS position, the phone model and the date; we keep only what the app needs);
 * - perceptual hash (dHash, 64 bits) to find the same picture re-saved, resized or lightly cropped;
 * - small copy (max 1024 px, no metadata) for the vision model.
 */

const STORED_MAX_SIDE = 2048;
const AI_MAX_SIDE = 1024;

export type PreparedPhoto = {
  buffer: Buffer;
  extension: string;
  contentType: string;
  /** 16 hex chars, or null if the image could not be decoded. */
  phash: string | null;
};

export async function prepareProofPhoto(original: Buffer): Promise<PreparedPhoto | null> {
  try {
    const image = sharp(original, { failOn: "error" }).rotate();
    const buffer = await image
      .clone()
      .resize({ width: STORED_MAX_SIDE, height: STORED_MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true })
      .toBuffer(); // sharp drops EXIF/XMP/ICC unless asked to keep them
    return { buffer, extension: "jpg", contentType: "image/jpeg", phash: await perceptualHash(buffer) };
  } catch {
    return null;
  }
}

/** dHash: 9x8 grayscale, each bit says whether a pixel is brighter than its right neighbour. */
export async function perceptualHash(input: Buffer): Promise<string | null> {
  try {
    const pixels = await sharp(input).rotate().grayscale().resize(9, 8, { fit: "fill" }).raw().toBuffer();
    let hex = "";
    for (let row = 0; row < 8; row++) {
      let byte = 0;
      for (let col = 0; col < 8; col++) {
        const left = pixels[row * 9 + col];
        const right = pixels[row * 9 + col + 1];
        byte = (byte << 1) | (left > right ? 1 : 0);
      }
      hex += byte.toString(16).padStart(2, "0");
    }
    return hex;
  } catch {
    return null;
  }
}

/** Number of different bits between two 16-hex perceptual hashes (0-64). */
export function hammingDistance(a: string, b: string): number {
  let distance = 0;
  for (let i = 0; i < 16; i += 2) {
    let x = parseInt(a.slice(i, i + 2), 16) ^ parseInt(b.slice(i, i + 2), 16);
    while (x) {
      distance += x & 1;
      x >>= 1;
    }
  }
  return distance;
}

/** Small JPEG without metadata, sent to the vision model. */
export async function photoForAi(input: Buffer): Promise<{ base64: string; mimeType: string }> {
  const buffer = await sharp(input)
    .rotate()
    .resize({ width: AI_MAX_SIDE, height: AI_MAX_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();
  return { base64: buffer.toString("base64"), mimeType: "image/jpeg" };
}
