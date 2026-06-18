import { atom, useAtom } from "jotai";

export type Theme = "light" | "dark" | "system";
const STORAGE_KEY = "verycloudy.theme";

function readStored(): Theme {
  const v = localStorage.getItem(STORAGE_KEY);
  return v === "light" || v === "dark" || v === "system" ? v : "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Apply the resolved theme to <html> by toggling the `.dark` class. */
export function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && systemPrefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

const baseThemeAtom = atom<Theme>(readStored());

/** Read/write the theme; persists to localStorage and updates <html>. */
export const themeAtom = atom(
  (get) => get(baseThemeAtom),
  (_get, set, next: Theme) => {
    set(baseThemeAtom, next);
    localStorage.setItem(STORAGE_KEY, next);
    applyTheme(next);
  },
);

export function useTheme() {
  return useAtom(themeAtom);
}

/** Call once at boot, before React renders, to avoid a flash of the wrong theme. */
export function initTheme() {
  const theme = readStored();
  applyTheme(theme);
  // keep "system" in sync with OS changes
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (readStored() === "system") applyTheme("system");
  });
}
