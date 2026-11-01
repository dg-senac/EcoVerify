import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Unit tests of the pure rules in src/lib (shared by the web app and the APK). No database needed.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["tests/**/*.test.ts"],
    environment: "node",
  },
});
