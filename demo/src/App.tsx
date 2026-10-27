import { useEffect } from "react";
import { onStorageError, useCurrentUser, useLang, type User } from "./store";
import { matchRoute, navigate, useRoute } from "./router";
import { dt } from "./i18n";
import { Shell } from "./components/Shell";
import { Toaster, toast } from "./components/ui";
import { LoginScreen, RegisterScreen } from "./screens/Login";
import { WalletSetupScreen } from "./screens/Wallet";
import { MissionsScreen } from "./screens/Missions";
import { SubmitScreen } from "./screens/Submit";
import { SubmissionsScreen } from "./screens/Submissions";
import { RankingScreen } from "./screens/Ranking";
import { CommunityScreen } from "./screens/Community";
import { ModerationScreen } from "./screens/Moderation";
import { AdminScreen } from "./screens/Admin";
import { NotificationsScreen } from "./screens/Notifications";
import { ProfileScreen } from "./screens/Profile";
import { SettingsScreen } from "./screens/Settings";
import { LegalScreen } from "./screens/Legal";
import { THEME_COLORS } from "@/lib/theme";

/** Applies the user's accessibility settings to <html>, like src/app/layout.tsx. */
function useHtmlSettings(user: User | null) {
  const lang = useLang();
  useEffect(() => {
    const html = document.documentElement;
    html.lang = lang === "pt" ? "pt-BR" : lang;
    html.classList.remove("font-small", "font-medium", "font-large", "high-contrast", "reduce-motion");
    html.classList.add(`font-${user?.fontSize ?? "medium"}`);
    if (user?.highContrast) html.classList.add("high-contrast");
    if (user?.reducedMotion) html.classList.add("reduce-motion");
  }, [lang, user?.fontSize, user?.highContrast, user?.reducedMotion]);

  // Theme: data-theme drives the CSS color-scheme (see src/app/theme.css); index.html applies it before the first paint.
  const theme = user?.theme ?? "system";
  useEffect(() => {
    const html = document.documentElement;
    html.dataset.theme = theme;
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    const dark = theme === "dark" || (theme === "system" && window.matchMedia?.("(prefers-color-scheme: dark)").matches);
    if (meta) meta.content = dark ? THEME_COLORS.dark : THEME_COLORS.light;
  }, [theme]);
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function AuthedRoutes({ user, path }: { user: User; path: string }) {
  const staff = user.role === "moderator" || user.role === "admin";
  const submit = matchRoute("/missions/:id/submit", path);
  if (submit) return <SubmitScreen key={submit.id} missionId={submit.id} />;

  switch (path) {
    case "/missions":
      return <MissionsScreen user={user} />;
    case "/wallet":
      return <WalletSetupScreen />;
    case "/submissions":
      return <SubmissionsScreen user={user} />;
    case "/ranking":
      return <RankingScreen user={user} />;
    case "/community":
      return <CommunityScreen user={user} />;
    case "/notifications":
      return <NotificationsScreen user={user} />;
    case "/profile":
      return <ProfileScreen user={user} />;
    case "/settings":
      return <SettingsScreen user={user} />;
    case "/moderation":
      return staff ? <ModerationScreen user={user} /> : <Redirect to="/missions" />;
    case "/admin":
      return user.role === "admin" ? <AdminScreen user={user} /> : <Redirect to="/missions" />;
    default:
      return <Redirect to={user.role === "citizen" ? "/missions" : user.role === "moderator" ? "/moderation" : "/admin"} />;
  }
}

export function App() {
  const user = useCurrentUser();
  const path = useRoute();
  const lang = useLang();
  useHtmlSettings(user);

  useEffect(() => {
    onStorageError(() => toast(dt(lang, "demo_storage_full"), "error"));
  }, [lang]);

  return (
    <>
      {path === "/termos" || path === "/privacidade" ? (
        <LegalScreen doc={path === "/termos" ? "terms" : "privacy"} />
      ) : !user || user.isBanned ? (
        path === "/register" ? <RegisterScreen /> : path === "/" ? <LoginScreen /> : <Redirect to="/" />
      ) : (
        <Shell user={user}>
          <AuthedRoutes user={user} path={path} />
        </Shell>
      )}
      <Toaster />
    </>
  );
}
