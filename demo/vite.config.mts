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
const repoRoot = path.resolve(demoDir, "..");

export default defineConfig({
  root: demoDir,
  // Relative asset paths: works inside the APK (https://localhost) and on any static host.
  base: "./",
  plugins: [react()],
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
