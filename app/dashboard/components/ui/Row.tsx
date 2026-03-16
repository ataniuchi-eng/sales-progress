"use client";

export function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: labelColor }}>{label}</span><span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}
