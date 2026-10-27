import type { MetadataRoute } from "next";

/** Lets people install the web app on the phone's home screen. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "EcoVerify",
    short_name: "EcoVerify",
    description: "Ações sustentáveis, verificadas e recompensadas em FONE.",
    lang: "pt-BR",
    start_url: "/missions",
    display: "standalone",
    background_color: "#f7f8f7",
    theme_color: "#059669",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
