"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  t: typeof lightColors;
}

const lightColors = {
  bg: "#f0f2f5",
  bgCard: "#ffffff",
  bgSidebar: "#ffffff",
  bgInput: "#ffffff",
  bgHover: "#f8f9fa",
  bgSection: "#f8f9fa",
  bgBadge: "#e8f4fd",
  text: "#333333",
  textPrimary: "#1a1a2e",
  textSecondary: "#666666",
  textMuted: "#999999",
  textDisabled: "#bbbbbb",
  textHeading: "#0c4a6e",
  border: "#e0e0e0",
  borderLight: "#eeeeee",
  shadow: "0 2px 12px rgba(0,0,0,0.08)",
  shadowHeavy: "0 4px 24px rgba(0,0,0,0.1)",
  accent: "#0284c7",
  accentLight: "#e8f4fd",
  accentText: "#0077b6",
  headerBg: "linear-gradient(135deg, #0c4a6e 0%, #0284c7 100%)",
  headerText: "#ffffff",
  tabActive: "#0284c7",
  tabInactive: "#999999",
  tabBorder: "#e0e0e0",
  buttonBg: "#ffffff",
  buttonBorder: "#dddddd",
  buttonText: "#666666",
  calToday: "#0284c7",
  calSelected: "#0ea5e9",
  inputBorder: "#dddddd",
  errorBg: "#fff0f0",
  errorText: "#e63946",
  errorBorder: "#fecdd3",
  successBg: "#d4edda",
  successText: "#388e3c",
  warningBg: "#fff3cd",
  warningText: "#f57c00",
  toastBg: "#0284c7",
  toastText: "#ffffff",
  cardGrid: "#ffffff",
  tableHeaderBg: "#f8f9fa",
  tableRowAlt: "#fafafa",
  tableRowHover: "#f0f7ff",
  scrollbar: "#ccc",
};

const darkColors: typeof lightColors = {
  bg: "#0f172a",
  bgCard: "#1e293b",
  bgSidebar: "#1e293b",
  bgInput: "#334155",
  bgHover: "#334155",
  bgSection: "#334155",
  bgBadge: "#1e3a5f",
  text: "#e2e8f0",
  textPrimary: "#e2e8f0",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  textDisabled: "#475569",
  textHeading: "#e0f2fe",
  border: "#334155",
  borderLight: "#475569",
  shadow: "0 2px 12px rgba(0,0,0,0.3)",
  shadowHeavy: "0 4px 24px rgba(0,0,0,0.4)",
  accent: "#0ea5e9",
  accentLight: "#0c4a6e",
  accentText: "#38bdf8",
  headerBg: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
  headerText: "#e0f2fe",
  tabActive: "#38bdf8",
  tabInactive: "#64748b",
  tabBorder: "#334155",
  buttonBg: "#334155",
  buttonBorder: "#475569",
  buttonText: "#e2e8f0",
  calToday: "#0ea5e9",
  calSelected: "#38bdf8",
  inputBorder: "#475569",
  errorBg: "#3b1419",
  errorText: "#f87171",
  errorBorder: "#7f1d1d",
  successBg: "#14532d",
  successText: "#4ade80",
  warningBg: "#451a03",
  warningText: "#fbbf24",
  toastBg: "#0ea5e9",
  toastText: "#ffffff",
  cardGrid: "#1e293b",
  tableHeaderBg: "#334155",
  tableRowAlt: "#1a2332",
  tableRowHover: "#1e3a5f",
  scrollbar: "#475569",
};

const ThemeContext = createContext<ThemeContextType>({
  theme: "light",
  toggleTheme: () => {},
  t: lightColors,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("adash-theme") as Theme | null;
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  const toggleTheme = () => {
    setTheme((prev) => {
      const next = prev === "light" ? "dark" : "light";
      localStorage.setItem("adash-theme", next);
      return next;
    });
  };

  const t = theme === "light" ? lightColors : darkColors;

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, t }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export { lightColors, darkColors };
