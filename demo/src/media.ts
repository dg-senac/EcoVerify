/** Photo, hashing and geolocation helpers for the offline demo. */

export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_DISTANCE_METERS = 150;
export const MAX_GPS_ACCURACY_METERS = 150;

/** Detects JPEG / PNG / WebP / HEIC from the file's magic bytes (never trust the extension). */
export function detectImageType(bytes: Uint8Array): string | null {
  if (bytes.length < 12) return null;
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  if (ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP") return "image/webp";
  if (ascii(4, 8) === "ftyp" && /^(heic|heix|mif1|msf1|hevc)$/.test(ascii(8, 12))) return "image/heic";
  return null;
}

/** SHA-256 hex of the original bytes (duplicate-photo detection), with a fallback outside secure contexts. */
export async function hashBytes(bytes: Uint8Array): Promise<string> {
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest("SHA-256", bytes as BufferSource);
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  }
  // FNV-1a (two seeds) – only used when crypto.subtle is unavailable (plain http).
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (const byte of bytes) {
    h1 = Math.imul(h1 ^ byte, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ byte, 0x811c9dc5) >>> 0;
  }
  return `fnv-${bytes.length}-${h1.toString(16)}${h2.toString(16)}`;
}

/** Downscales a photo to fit the device storage (max 1024 px, JPEG). */
export async function compressPhoto(file: Blob, maxSize = 1024, quality = 0.72): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("decode_failed"));
      image.src = url;
    });
    const scale = Math.min(1, maxSize / Math.max(img.naturalWidth, img.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("no_canvas");
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Great-circle distance in meters (same formula as the server). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(meters: number): string {
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export type Coords = { latitude: number; longitude: number; accuracy: number };

export function getCurrentPosition(): Promise<Coords> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error("unsupported"));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => reject(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/** Illustrative "photo" for the seeded submissions (SVG, no external files). */
export function placeholderPhoto(emoji: string, from: string, to: string, caption: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="600" viewBox="0 0 800 600">
<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/></linearGradient></defs>
<rect width="800" height="600" fill="url(#g)"/>
<circle cx="650" cy="120" r="70" fill="#fff" opacity="0.25"/>
<path d="M0 470 Q200 400 400 460 T800 440 V600 H0Z" fill="#fff" opacity="0.18"/>
<text x="400" y="320" font-size="160" text-anchor="middle">${emoji}</text>
<text x="400" y="430" font-size="34" font-family="sans-serif" font-weight="700" fill="#fff" text-anchor="middle">${caption}</text>
<text x="400" y="560" font-size="22" font-family="sans-serif" fill="#fff" opacity="0.8" text-anchor="middle">Foto ilustrativa · EcoVerify Demo</text>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

export function uid(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") return crypto.randomUUID();
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** Fake transaction hash for simulated payouts — clearly marked as demo. */
export function fakeTxHash(): string {
  const hex = Array.from({ length: 56 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `demo-${hex}`;
}

export function fakeWalletAddress(): string {
  const hex = Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
  return `0xFONE${hex}`;
}
