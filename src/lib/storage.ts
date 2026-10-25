import "server-only";
import crypto from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { contentTypeFromExtension } from "@/lib/file-type";

/**
 * File storage for proof photos and community media.
 *
 * - Production: Supabase Storage (private bucket), enabled when SUPABASE_URL and
 *   SUPABASE_SERVICE_ROLE_KEY are set. Survives redeploys and works on serverless hosts.
 * - Development: local folder (UPLOAD_DIR, default ./storage/uploads), outside `public/`.
 *
 * Files are never served directly. They go through `/api/files/...`, which requires a
 * logged-in session. Next.js does not serve files written to `public/` after the build,
 * and serverless disks are ephemeral, so the previous `public/uploads` approach lost files.
 */

export type StorageFolder = "proofs" | "image" | "audio" | "video";

const FOLDERS: StorageFolder[] = ["proofs", "image", "audio", "video"];
const SAFE_NAME = /^[a-zA-Z0-9-]+\.[a-z0-9]{2,5}$/;

export const FILES_ROUTE_PREFIX = "/api/files/";

function supabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "uploads";
  if (!url || !key) return null;
  return { url, key, bucket };
}

function localDir() {
  return process.env.UPLOAD_DIR || path.join(/*turbopackIgnore: true*/ process.cwd(), "storage", "uploads");
}

export function isValidStoragePath(folder: string, fileName: string): folder is StorageFolder {
  return FOLDERS.includes(folder as StorageFolder) && SAFE_NAME.test(fileName);
}

/** Stores a file and returns the URL the app should use to display it. */
export async function saveFile(
  folder: StorageFolder,
  buffer: Buffer,
  extension: string,
  contentType: string,
): Promise<string> {
  const fileName = `${crypto.randomUUID()}.${extension}`;
  const objectPath = `${folder}/${fileName}`;
  const supabase = supabaseConfig();

  if (supabase) {
    const response = await fetch(`${supabase.url}/storage/v1/object/${supabase.bucket}/${objectPath}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabase.key}`,
        apikey: supabase.key,
        "Content-Type": contentType,
        "x-upsert": "false",
      },
      body: new Uint8Array(buffer),
    });
    if (!response.ok) {
      throw new Error(`Supabase Storage upload failed (${response.status}): ${await response.text()}`);
    }
  } else {
    const dir = path.join(/*turbopackIgnore: true*/ localDir(), folder);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(/*turbopackIgnore: true*/ dir, fileName), buffer);
  }

  return `${FILES_ROUTE_PREFIX}${objectPath}`;
}

/** Reads a stored file. Returns null when it does not exist. */
export async function readStoredFile(
  folder: StorageFolder,
  fileName: string,
): Promise<{ body: Uint8Array; contentType: string } | null> {
  const supabase = supabaseConfig();

  if (supabase) {
    const response = await fetch(
      `${supabase.url}/storage/v1/object/authenticated/${supabase.bucket}/${folder}/${fileName}`,
      { headers: { Authorization: `Bearer ${supabase.key}`, apikey: supabase.key }, cache: "no-store" },
    );
    if (!response.ok) return null;
    return {
      body: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || contentTypeFromExtension(fileName),
    };
  }

  try {
    const body = await readFile(path.join(/*turbopackIgnore: true*/ localDir(), folder, fileName));
    return { body: new Uint8Array(body), contentType: contentTypeFromExtension(fileName) };
  } catch {
    return null;
  }
}
