"use client";

export function DonutChart({ rate, size, color, trackColor }: { rate: number; size: number; color: string; trackColor: string }) {
  const sw = Math.max(Math.round(size / 8), 5);
  const r = (size - sw) / 2, c = Math.PI * 2 * r, pct = Math.min(rate, 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}
