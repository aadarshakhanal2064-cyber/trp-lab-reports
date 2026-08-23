/**
 * Browser-local preferences only.
 *
 * Clinic settings used to live here, which meant every computer needed them
 * set separately. They now live in the `organisation` table so the letterhead
 * and verifier are the same on every machine. What remains here is genuinely
 * per-device: the colour theme.
 */

export type Theme = "light" | "dark";

const THEME_KEY = "trp.theme.v1";

export function loadTheme(): Theme {
  if (typeof window === "undefined") return "light";
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function saveTheme(theme: Theme): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Private browsing or storage full: the theme just won't persist.
  }
}

/** Sets the attribute the CSS token overrides key off. */
export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}
