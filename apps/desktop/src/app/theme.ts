export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "sm-theme";

export function readThemePreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
  } catch {
    // Storage unavailable: fall back to the default.
  }
  return "light";
}

export function resolveTheme(preference: ThemePreference, prefersDark: boolean): "light" | "dark" {
  if (preference === "system") return prefersDark ? "dark" : "light";
  return preference;
}

/** Persist the preference and apply the resolved theme to the document root. */
export function applyTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // Non-fatal: the theme still applies for this session.
  }
  const prefersDark = matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.dataset.theme = resolveTheme(preference, prefersDark);
}

const MOTION_KEY = "sm-reduced-motion";

/** The user's own reduced-motion choice (the OS preference is always respected too). */
export function readReducedMotion(): boolean {
  try {
    return localStorage.getItem(MOTION_KEY) === "true";
  } catch {
    return false;
  }
}

/** Persist and apply `data-reduced-motion`, which zeroes every duration token. */
export function applyReducedMotion(on: boolean): void {
  try {
    localStorage.setItem(MOTION_KEY, String(on));
  } catch {
    // Non-fatal: applies for this session.
  }
  if (on) document.documentElement.dataset.reducedMotion = "true";
  else delete document.documentElement.dataset.reducedMotion;
}

/** Re-resolve the theme when the OS scheme changes while "System" is selected. */
export function watchSystemTheme(): () => void {
  const query = matchMedia("(prefers-color-scheme: dark)");
  const onChange = () => {
    if (readThemePreference() === "system") applyTheme("system");
  };
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}
