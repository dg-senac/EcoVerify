import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { THEME_COLORS } from "@/lib/theme";
import { AppSplash, SPLASH_HEAD_SCRIPT } from "@/components/brand/app-splash";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

const HTML_LANG: Record<string, string> = { pt: "pt-BR", en: "en", es: "es" };

export const metadata: Metadata = {
  title: "EcoVerify — Ações sustentáveis, reconhecidas e recompensadas",
  description:
    "EcoVerify conecta ações sustentáveis do mundo real a recompensas reais: missões, comprovações, pontos e a criptomoeda FONE.",
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser().catch(() => null);

  const fontClass = `font-${user?.fontSize ?? "medium"}`;
  const classes = [
    fontClass,
    user?.highContrast ? "high-contrast" : "",
    user?.reducedMotion ? "reduce-motion" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // data-theme drives the CSS color-scheme (see theme.css): no script, so no flash of the wrong theme.
  const theme = user?.theme ?? "system";
  // Screen readers and the browser translator use this: it must follow the language chosen in Settings.
  const htmlLang = HTML_LANG[user?.language ?? "pt"] ?? "pt-BR";

  return (
    <html lang={htmlLang} className={classes} data-theme={theme} suppressHydrationWarning>
      <head>
        {/* Hides the splash before the first paint when it was already shown in this session. */}
        <script dangerouslySetInnerHTML={{ __html: SPLASH_HEAD_SCRIPT }} />
        {theme === "system" ? (
          <>
            <meta name="theme-color" media="(prefers-color-scheme: light)" content={THEME_COLORS.light} />
            <meta name="theme-color" media="(prefers-color-scheme: dark)" content={THEME_COLORS.dark} />
          </>
        ) : (
          <meta name="theme-color" content={THEME_COLORS[theme]} />
        )}
      </head>
      <body className={`${inter.variable} font-sans antialiased`} suppressHydrationWarning>
        {children}
        <AppSplash lang={user?.language ?? "pt"} />
      </body>
    </html>
  );
}
