"use client";

import { useCallback, useEffect, useState } from "react";

export type SimulatorTheme = "light" | "dark";

const STORAGE_KEY = "litopc.theme";

function readStoredTheme(): SimulatorTheme {
  if (typeof window === "undefined") return "light";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}

/** Applies the simulator theme to <html data-theme> so every simulator stylesheet can key on it. */
export function applySimulatorTheme(theme: SimulatorTheme) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset.theme = theme;
}

/**
 * Simulator colour theme: light is the default (the landing look), dark is the
 * same system on neutral greys. The choice persists per browser.
 */
export function useSimulatorTheme(): [SimulatorTheme, (next: SimulatorTheme) => void] {
  const [theme, setThemeState] = useState<SimulatorTheme>("light");

  useEffect(() => {
    const stored = readStoredTheme();
    setThemeState(stored);
    applySimulatorTheme(stored);
    return () => {
      delete document.documentElement.dataset.theme;
    };
  }, []);

  const setTheme = useCallback((next: SimulatorTheme) => {
    setThemeState(next);
    applySimulatorTheme(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* private mode: the choice simply does not persist */
    }
  }, []);

  return [theme, setTheme];
}
