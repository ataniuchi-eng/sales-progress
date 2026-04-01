"use client";

export function Badge({ text, type }: { text: string; type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    proper: { bg: "#e8f4fd", color: "#0077b6" }, bp: { bg: "#fff3e0", color: "#f57c00" }, fl: { bg: "#e8f5e9", color: "#388e3c" },
    dispatch: { bg: "#e8f4fd", color: "#0077b6" }, quasi: { bg: "#fce4ec", color: "#c62828" }, both: { bg: "#f3e5f5", color: "#7b1fa2" },
  };
  const c = colors[type] || colors.proper;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>{text}</span>;
}
