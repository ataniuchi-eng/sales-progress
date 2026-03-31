"use client";

import { useTheme } from "../../../theme-provider";

export function InputGroup({ title, fields, onChange }: { title: string; fields: { label: string; value: string; key: string; disabled?: boolean }[]; onChange: (key: string, value: string) => void; }) {
  const { t: tc } = useTheme();
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #e0e0e0" }}>{title}</h3>
      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>{f.label}</label>
          <input type="text" inputMode="numeric" value={f.value} onChange={(e) => onChange(f.key, e.target.value)} placeholder="0" disabled={f.disabled}
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box", background: f.disabled ? "#f0f0f0" : "#fff", color: f.disabled ? "#999" : "#333", cursor: f.disabled ? "not-allowed" : "text" }} />
        </div>
      ))}
    </div>
  );
}
