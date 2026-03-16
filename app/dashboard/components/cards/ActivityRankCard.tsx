"use client";

import { useState } from "react";
import { useTheme } from "../../../theme-provider";
import { TrendIcon } from "../ui/TrendIcon";
import type { StaffActivity } from "../../types";

export function ActivityRankCard({ title, data, prevData, field, color, unit }: { title: string; data: StaffActivity[]; prevData?: StaffActivity[]; field: keyof StaffActivity; color: string; unit?: string }) {
  const { t: tc } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const sorted = [...data].filter(s => s.staff && (s[field] as number) > 0).sort((a, b) => (b[field] as number) - (a[field] as number));
  const top3 = sorted.slice(0, 3);
  const total = sorted.reduce((sum, s) => sum + (s[field] as number), 0);
  const prevTotal = (prevData || []).reduce((sum, s) => sum + ((s[field] as number) || 0), 0);
  const totalDisplay = unit ? (Math.round(total * 10) / 10) : total;
  const medals = ["🥇", "🥈", "🥉"];
  const fmtVal = (v: number) => unit ? `${Math.round(v * 10) / 10}${unit}` : String(v);
  return (
    <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {prevData && <TrendIcon current={total} prev={prevTotal} />}
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{unit ? `${totalDisplay}${unit}` : totalDisplay}</span>
        </div>
      </div>
      {sorted.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>未入力</p> : (
        <>
          {top3.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${tc.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{medals[i]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: tc.textPrimary }}>{s.staff}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color }}>{fmtVal(s[field] as number)}</span>
            </div>
          ))}
          {sorted.length > 3 && (
            <>
              <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px solid #0077b6", borderRadius: 6, cursor: "pointer", width: "100%" }}>
                {showAll ? "閉じる" : `全${sorted.length}件を表示`}
              </button>
              {showAll && sorted.slice(3).map((s, i) => (
                <div key={i + 3} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8f9fa" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: tc.textSecondary, width: 20, textAlign: "center" }}>{i + 4}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: tc.textSecondary }}>{s.staff}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmtVal(s[field] as number)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}
