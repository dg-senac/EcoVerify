import { useEffect } from "react";
import { AppSplash } from "@/components/brand/app-splash";
import { moderatorsOn, onStorageError, setGuestLanguage, updateSettings, useCurrentUser, useLang, useStore, type User } from "./store";
import { canReview, homeFor, isStaffExperience } from "@/lib/nav";
import { startTour, TourPanel } from "./components/Tour";
import { matchRoute, navigate, useRoute } from "./router";
import { dt } from "./i18n";
import { PAYMENTS_ENABLED } from "@/lib/features";
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
import { TransparencyScreen } from "./screens/Transparency";
import { BenefitsScreen, PartnerScreen } from "./screens/Benefits";
import { PointScreen } from "./screens/Point";
import { QuizScreen } from "./screens/Quiz";
import { DumpsScreen } from "./screens/Dumps";
import { MapScreenDemo } from "./screens/Map";
import { CertificateScreen, EventCertificateScreen, EventReportScreen, OrgListScreen, OrgNewScreen, OrgScreen } from "./screens/Orgs";

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

/**
 * Shareable links: ?lang=pt|en|es opens the demo in that language and ?tour=1 starts the
 * presentation mode (e.g. https://…/?lang=en&tour=1). The parameters are removed afterwards.
 */
// Read before useUrlOptions cleans the URL: the guided tour already explains the app, so no "how it works".
const OPENED_WITH_TOUR = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("tour") === "1";

function useUrlOptions() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const lang = params.get("lang");
    const tour = params.get("tour");
    if (!lang && !tour) return;
    if (lang === "pt" || lang === "en" || lang === "es") {
      setGuestLanguage(lang);
      updateSettings({ language: lang });
    }
    if (tour === "1") startTour();
    window.history.replaceState(null, "", `${window.location.pathname}${window.location.hash}`);
  }, []);
}

function Redirect({ to }: { to: string }) {
  useEffect(() => navigate(to, { replace: true }), [to]);
  return null;
}

function AuthedRoutes({ user, path }: { user: User; path: string }) {
  const staff = useStore((s) => canReview(user.role, moderatorsOn(s)));
  const home = useStore((s) => homeFor(user.role, moderatorsOn(s)));
  // Staff (active moderators and admins) have their own app: citizen screens send them home.
  const staffApp = useStore((s) => isStaffExperience(user.role, moderatorsOn(s)));
  const citizenOnly = path.startsWith("/missions") || path.startsWith("/org") || ["/submissions", "/ranking", "/beneficios", "/community", "/wallet", "/quiz", "/lixo"].includes(path);
  if (staffApp && citizenOnly) return <Redirect to={home} />;
  const submit = matchRoute("/missions/:id/submit", path);
  if (submit) return <SubmitScreen key={submit.id} missionId={submit.id} />;
  if (path === "/org") return <OrgListScreen user={user} />;
  if (path === "/org/nova") return <OrgNewScreen user={user} />;
  const org = matchRoute("/org/:slug", path) ?? matchRoute("/org/:slug/:tab", path);
  if (org) return <OrgScreen key={org.slug} user={user} slug={org.slug} tab={org.tab} />;
  const eventReport = matchRoute("/evento/:id", path);
  if (eventReport) return <EventReportScreen user={user} missionId={eventReport.id} />;
  const eventCertificate = matchRoute("/certificado/evento/:id", path);
  if (eventCertificate) return <EventCertificateScreen submissionId={eventCertificate.id} />;
  const certificate = matchRoute("/certificado/:id", path);
  if (certificate) return <CertificateScreen memberId={certificate.id} />;

  switch (path) {
    case "/missions":
      return <MissionsScreen user={user} />;
    case "/wallet":
      return PAYMENTS_ENABLED ? <WalletSetupScreen /> : <Redirect to="/profile" />;
    case "/submissions":
      return <SubmissionsScreen user={user} />;
    case "/ranking":
      return <RankingScreen user={user} />;
    case "/quiz":
      return <QuizScreen key={user.id} user={user} />;
    case "/lixo":
      return <DumpsScreen key={user.id} user={user} />;
    case "/mapa":
      return <MapScreenDemo />;
    case "/beneficios":
      return <BenefitsScreen user={user} />;
    case "/community":
      return <CommunityScreen user={user} />;
    case "/notifications":
      return <NotificationsScreen user={user} />;
    case "/profile":
      return <ProfileScreen user={user} />;
    case "/settings":
      return <SettingsScreen user={user} />;
    case "/moderation":
      return staff ? <ModerationScreen user={user} /> : <Redirect to={home} />;
    case "/admin":
      return user.role === "admin" ? <AdminScreen user={user} /> : <Redirect to={home} />;
    default:
      return <Redirect to={home} />;
  }
}

export function App() {
  const user = useCurrentUser();
  const path = useRoute();
  const lang = useLang();
  useHtmlSettings(user);
  useUrlOptions();

  useEffect(() => {
    onStorageError(() => toast(dt(lang, "demo_storage_full"), "error"));
  }, [lang]);
  // Partner page: public (no login), like /parceiro/<token> on the web.
  const partner = matchRoute("/parceiro/:token", path);
  // Collection point page: public too, like /ponto/<token>.
  const point = matchRoute("/ponto/:token", path);

  return (
    <>
      {partner ? (
        <PartnerScreen key={partner.token} token={partner.token} />
      ) : point ? (
        <PointScreen key={point.token} token={point.token} />
      ) : path === "/termos" || path === "/privacidade" ? (
        <LegalScreen doc={path === "/termos" ? "terms" : "privacy"} />
      ) : path === "/transparencia" ? (
        <TransparencyScreen />
      ) : !user || user.isBanned ? (
        path === "/register" ? <RegisterScreen /> : path === "/" ? <LoginScreen /> : <Redirect to="/" />
      ) : (
        <Shell user={user}>
          <AuthedRoutes user={user} path={path} />
        </Shell>
      )}
      <TourPanel />
      <Toaster />
      {!partner && !point && <AppSplash lang={lang} onboarding={!OPENED_WITH_TOUR} />}
    </>
  );
}
