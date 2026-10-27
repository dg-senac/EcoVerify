import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { App } from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Installable web app + offline after the first visit (the published demo only; the APK bundles its files).
const inCapacitor = typeof window !== "undefined" && "Capacitor" in window;
if (import.meta.env.PROD && !inCapacitor && "serviceWorker" in navigator && window.isSecureContext) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {
      // Not critical: the demo works without it.
    });
  });
}
