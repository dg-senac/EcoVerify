import { fileURLToPath } from "node:url";
import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Offline demo of EcoVerify (no server, no database).
 *
 * Builds a static app into demo/dist that the Android APK bundles when no
 * CAPACITOR_SERVER_URL is configured. It reuses the web app's translations, logo,
 * icons and theme from ../src through the "@" alias.
 */
const demoDir = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute URL of the published demo, used by link previews (og:image must be absolute).
 * DEMO_SITE_URL wins; on Vercel the production domain is detected automatically.
 * Empty (e.g. inside the APK): previews fall back to relative paths.
 */
function siteUrl() {
  const explicit = process.env.DEMO_SITE_URL?.trim();
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  const url = explicit || (vercel ? `https://${vercel}` : "");
  return url && !url.endsWith("/") ? `${url}/` : url;
}
const repoRoot = path.resolve(demoDir, "..");

export default defineConfig({
  root: demoDir,
  // Relative asset paths: works inside the APK (https://localhost) and on any static host.
  base: "./",
  plugins: [
    react(),
    {
      name: "ecoverify-site-url",
      transformIndexHtml: (html) => html.split("%SITE_URL%").join(siteUrl() || "./"),
    },
  ],
  resolve: {
    alias: { "@": path.resolve(repoRoot, "src") },
  },
  // Uses demo/postcss.config.mjs (Tailwind 4).
  css: { postcss: demoDir },
  build: {
    outDir: path.resolve(demoDir, "dist"),
    emptyOutDir: true,
    // Android System WebView on older devices.
    target: "es2020",
    chunkSizeWarningLimit: 1500,
  },
  server: { host: "0.0.0.0", port: 5173, allowedHosts: true },
  preview: { host: "0.0.0.0", port: 4173, allowedHosts: true },
});
