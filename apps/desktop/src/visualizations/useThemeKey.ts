import { useEffect, useState } from "react";

/**
 * The resolved theme on the document root. Canvas renderers read colour
 * tokens at draw time, so they include this in their effect dependencies to
 * repaint when the theme changes.
 */
export function useThemeKey(): string {
  const [theme, setTheme] = useState(() => document.documentElement.dataset.theme ?? "light");

  useEffect(() => {
    const root = document.documentElement;
    const observer = new MutationObserver(() => setTheme(root.dataset.theme ?? "light"));
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
