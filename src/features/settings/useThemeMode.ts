import { useEffect, useState } from "react";

import type { ThemeMode } from "../../appShared";
import { readStoredTheme, THEME_STORAGE_KEY } from "../../appShared";

export function useThemeMode() {
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => readStoredTheme());

  useEffect(() => {
    if (typeof window === "undefined") return;

    window.localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme =
      themeMode === "dark" || themeMode === "clinic-dark" ? "dark" : "light";
  }, [themeMode]);

  return {
    themeMode,
    setThemeMode,
  };
}
