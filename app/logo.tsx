"use client";

import { useTheme } from "./theme-provider";

export function ADashLogo({ height = 40 }: { height?: number }) {
  const { theme } = useTheme();
  const scale = height / 80;
  const width = 340 * scale;

  if (theme === "dark") {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 80" width={width} height={height}>
        <defs>
          <linearGradient id="a1d" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
          </linearGradient>
          <linearGradient id="a2d" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
            <stop offset="100%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
          </linearGradient>
          <filter id="sad" x="-5%" y="-5%" width="110%" height="130%">
            <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0ea5e9" floodOpacity={0.4} />
          </filter>
        </defs>
        <rect x="4" y="10" width="60" height="60" rx="14" fill="url(#a1d)" filter="url(#sad)" />
        <circle cx="34" cy="42" r="20" fill="none" stroke="white" strokeWidth="3" strokeDasharray="94 32" strokeOpacity={0.9} transform="rotate(-90 34 42)" />
        <line x1="34" y1="42" x2="45" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity={0.95} />
        <circle cx="34" cy="42" r="3" fill="white" opacity={0.9} />
        <circle cx="16" cy="52" r="1.8" fill="white" opacity={0.5} />
        <circle cx="15" cy="40" r="1.8" fill="white" opacity={0.5} />
        <circle cx="21" cy="28" r="1.8" fill="white" opacity={0.5} />
        <text x="78" y="52" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="36" fontWeight="700" fill="#e0f2fe" letterSpacing="-1">A Dash</text>
        <rect x="78" y="58" width="50" height="3" rx="1.5" fill="url(#a2d)" />
        <rect x="240" y="35" width="28" height="3" rx="1.5" fill="url(#a2d)" opacity={0.6} />
        <rect x="272" y="35" width="14" height="3" rx="1.5" fill="url(#a2d)" opacity={0.35} />
        <rect x="290" y="35" width="7" height="3" rx="1.5" fill="url(#a2d)" opacity={0.15} />
      </svg>
    );
  }

  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 340 80" width={width} height={height}>
      <defs>
        <linearGradient id="a1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#0ea5e9", stopOpacity: 1 }} />
        </linearGradient>
        <linearGradient id="a2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#0284c7", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#38bdf8", stopOpacity: 1 }} />
        </linearGradient>
        <filter id="sa" x="-5%" y="-5%" width="110%" height="130%">
          <feDropShadow dx="0" dy="2" stdDeviation="4" floodColor="#0284c7" floodOpacity={0.35} />
        </filter>
      </defs>
      <rect x="4" y="10" width="60" height="60" rx="14" fill="url(#a1)" filter="url(#sa)" />
      <circle cx="34" cy="42" r="20" fill="none" stroke="white" strokeWidth="3" strokeDasharray="94 32" strokeOpacity={0.9} transform="rotate(-90 34 42)" />
      <line x1="34" y1="42" x2="45" y2="30" stroke="white" strokeWidth="2.5" strokeLinecap="round" opacity={0.95} />
      <circle cx="34" cy="42" r="3" fill="white" opacity={0.9} />
      <circle cx="16" cy="52" r="1.8" fill="white" opacity={0.5} />
      <circle cx="15" cy="40" r="1.8" fill="white" opacity={0.5} />
      <circle cx="21" cy="28" r="1.8" fill="white" opacity={0.5} />
      <text x="78" y="52" fontFamily="'Helvetica Neue', Arial, sans-serif" fontSize="36" fontWeight="700" fill="#0c4a6e" letterSpacing="-1">A Dash</text>
      <rect x="78" y="58" width="50" height="3" rx="1.5" fill="url(#a2)" />
      <rect x="240" y="35" width="28" height="3" rx="1.5" fill="url(#a2)" opacity={0.6} />
      <rect x="272" y="35" width="14" height="3" rx="1.5" fill="url(#a2)" opacity={0.35} />
      <rect x="290" y="35" width="7" height="3" rx="1.5" fill="url(#a2)" opacity={0.15} />
    </svg>
  );
}

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      title={theme === "light" ? "ダークモードに切替" : "ライトモードに切替"}
      style={{
        width: 40,
        height: 40,
        border: "none",
        background: theme === "light" ? "#f0f2f5" : "#334155",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: 10,
        transition: "background 0.2s",
      }}
    >
      {theme === "light" ? (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0c4a6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      )}
    </button>
  );
}
