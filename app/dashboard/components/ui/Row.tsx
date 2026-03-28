"use client";

export function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: 6, fontSize: 13, gap: 6 }}>
      <span style={{ color: labelColor, whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontWeight: 700, color: valueColor, whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
