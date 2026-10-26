import { useSyncExternalStore, type MouseEvent, type ReactNode } from "react";

/**
 * Minimal hash router: "#/missions/abc/submit". Hash navigation adds browser history
 * entries, so the Android back button works inside the APK.
 */
function currentPath(): string {
  const hash = window.location.hash.replace(/^#/, "");
  return hash.startsWith("/") ? hash : "/";
}

function subscribe(listener: () => void) {
  window.addEventListener("hashchange", listener);
  return () => window.removeEventListener("hashchange", listener);
}

export function useRoute(): string {
  return useSyncExternalStore(subscribe, currentPath);
}

export function navigate(path: string, options: { replace?: boolean } = {}) {
  if (options.replace) {
    const url = `${window.location.pathname}${window.location.search}#${path}`;
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
  } else {
    window.location.hash = path;
  }
  window.scrollTo({ top: 0 });
}

export function goBack(fallback: string) {
  if (window.history.length > 1) window.history.back();
  else navigate(fallback, { replace: true });
}

/** Matches "/missions/:id/submit" style patterns; returns params or null. */
export function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const p = pattern.split("/").filter(Boolean);
  const a = path.split("/").filter(Boolean);
  if (p.length !== a.length) return null;
  const params: Record<string, string> = {};
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) params[p[i].slice(1)] = decodeURIComponent(a[i]);
    else if (p[i] !== a[i]) return null;
  }
  return params;
}

export function Link({
  to,
  className,
  children,
  onClick,
  ariaLabel,
}: {
  to: string;
  className?: string;
  children: ReactNode;
  onClick?: () => void;
  ariaLabel?: string;
}) {
  return (
    <a
      href={`#${to}`}
      aria-label={ariaLabel}
      className={className}
      onClick={(event: MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        onClick?.();
        if (currentPath() !== to) navigate(to);
      }}
    >
      {children}
    </a>
  );
}
