"use client";

export function TrendIcon({ current, prev }: { current: number; prev: number }) {
  if (current > prev) return <span style={{ color: "#2ecc71", fontSize: 14, fontWeight: 700 }}>▲</span>;
  if (current < prev) return <span style={{ color: "#e63946", fontSize: 14, fontWeight: 700 }}>▼</span>;
  return <span style={{ color: "#999", fontSize: 12, fontWeight: 700 }}>→</span>;
}
