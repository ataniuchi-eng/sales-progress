"use client";

export function Row({ label, value, labelColor, valueColor, small }: { label: string; value: string; labelColor: string; valueColor: string; small?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", marginBottom: small ? 2 : 6, fontSize: small ? 11 : 13, gap: 6 }}>
      <span style={{ color: labelColor, whiteSpace: "nowrap", flexShrink: 0 }}>{label}</span>
      <span style={{ flex: 1, fontWeight: small ? 600 : 700, color: valueColor, whiteSpace: "nowrap", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{value}</span>
    </div>
  );
}
