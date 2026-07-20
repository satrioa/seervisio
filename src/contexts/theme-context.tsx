"use client";

import { createContext, useContext, useState } from "react";

export type ThemeName = "default" | "light" | "dark";

interface ThemeContextValue {
  currentTheme: ThemeName;
  previewDarkMode: boolean;
  setTheme: (theme: ThemeName) => void;
  setPreviewDarkMode: (value: boolean) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  currentTheme: "default",
  previewDarkMode: false,
  setTheme: () => {},
  setPreviewDarkMode: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setTheme] = useState<ThemeName>("default");
  const [previewDarkMode, setPreviewDarkMode] = useState(false);

  return (
    <ThemeContext.Provider
      value={{ currentTheme, previewDarkMode, setTheme, setPreviewDarkMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
