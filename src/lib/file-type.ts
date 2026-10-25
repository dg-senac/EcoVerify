/**
 * Detects the real type of an uploaded file from its first bytes ("magic numbers").
 *
 * Never trust the browser-provided `File.type` or the file name: both are fully
 * controlled by the client. A file named `photo.png` with `type=image/png` could be
 * an HTML page or a script.
 */

export type MediaKind = "image" | "audio" | "video";

export type DetectedFile = {
  kind: MediaKind;
  contentType: string;
  extension: string;
};

function ascii(buffer: Buffer, start: number, end: number) {
  return buffer.subarray(start, end).toString("latin1");
}

/**
 * Returns the detected type for the given buffer, restricted to `expected` kind.
 * Containers that can hold both audio and video (MP4, WebM, Ogg) are resolved using
 * the expected kind. Returns `null` when the content does not match an allowed format.
 */
export function detectFileType(buffer: Buffer, expected: MediaKind): DetectedFile | null {
  if (buffer.length < 12) return null;

  // ---- Images -------------------------------------------------------------
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return expected === "image" ? { kind: "image", contentType: "image/jpeg", extension: "jpg" } : null;
  }
  if (buffer[0] === 0x89 && ascii(buffer, 1, 4) === "PNG") {
    return expected === "image" ? { kind: "image", contentType: "image/png", extension: "png" } : null;
  }
  if (ascii(buffer, 0, 4) === "GIF8") {
    return expected === "image" ? { kind: "image", contentType: "image/gif", extension: "gif" } : null;
  }
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WEBP") {
    return expected === "image" ? { kind: "image", contentType: "image/webp", extension: "webp" } : null;
  }

  // ---- Audio only ---------------------------------------------------------
  if (ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 12) === "WAVE") {
    return expected === "audio" ? { kind: "audio", contentType: "audio/wav", extension: "wav" } : null;
  }
  if (ascii(buffer, 0, 3) === "ID3" || (buffer[0] === 0xff && (buffer[1] & 0xe0) === 0xe0)) {
    return expected === "audio" ? { kind: "audio", contentType: "audio/mpeg", extension: "mp3" } : null;
  }

  // ---- Audio or video containers -----------------------------------------
  if (expected === "image") return null;

  // MP4 / M4A / MOV: "ftyp" box at offset 4
  if (ascii(buffer, 4, 8) === "ftyp") {
    const brand = ascii(buffer, 8, 12);
    if (brand === "qt  ") {
      return expected === "video" ? { kind: "video", contentType: "video/quicktime", extension: "mov" } : null;
    }
    return expected === "audio"
      ? { kind: "audio", contentType: "audio/mp4", extension: "m4a" }
      : { kind: "video", contentType: "video/mp4", extension: "mp4" };
  }
  // WebM / Matroska (EBML header)
  if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
    return { kind: expected, contentType: `${expected}/webm`, extension: "webm" };
  }
  // Ogg
  if (ascii(buffer, 0, 4) === "OggS") {
    return { kind: expected, contentType: `${expected}/ogg`, extension: "ogg" };
  }

  return null;
}

export function contentTypeFromExtension(fileName: string): string {
  const ext = fileName.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    case "wav":
      return "audio/wav";
    case "mp3":
      return "audio/mpeg";
    case "m4a":
      return "audio/mp4";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "ogg":
      return "audio/ogg";
    default:
      return "application/octet-stream";
  }
}
