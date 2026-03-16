"use client";

import { useState } from "react";
import { useTheme } from "../../../theme-provider";
import { TrendIcon } from "../ui/TrendIcon";
import type { StaffActivity, OrderEntry } from "../../types";

export function AmountRankCard({ title, data, prevData, entryType, color }: {
  title: string; data: StaffActivity[]; prevData?: StaffActivity[]; entryType: "ra" | "ca"; color: string;
}) {
  const { t: tc } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const getEntries = (s: StaffActivity) => entryType === "ra" ? (s.raEntries || []) : (s.caEntries || []);
  const getTotal = (s: StaffActivity) => getEntries(s).reduce((sum, e) => sum + (e.amount || 0), 0);
  const sorted = [...data].filter(s => s.staff && getTotal(s) > 0).sort((a, b) => getTotal(b) - getTotal(a));
  const top3 = sorted.slice(0, 3);
  const total = Math.round(sorted.reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const prevTotal = Math.round((prevData || []).reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const medals = ["🥇", "🥈", "🥉"];
  const fmtVal = (v: number) => `${Math.round(v * 10) / 10}万円`;
  const renderEntry = (s: StaffActivity, i: number, isSub?: boolean) => {
    const entries = getEntries(s);
    const staffTotal = Math.round(getTotal(s) * 10) / 10;
    return (
      <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${tc.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSub ? <span style={{ fontSize: 12, color: tc.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span> : <span style={{ fontSize: 16 }}>{medals[i]}</span>}
            <span style={{ fontSize: isSub ? 13 : 14, fontWeight: 600, color: isSub ? tc.textSecondary : tc.textPrimary }}>{s.staff}</span>
          </div>
          <span style={{ fontSize: isSub ? 14 : 16, fontWeight: 700, color }}>{fmtVal(staffTotal)}</span>
        </div>
        {entries.map((e, ei) => {
          const details = [e.company, e.affiliation, e.position].filter(Boolean).join(" / ");
          const revLabel = entryType === "ra" ? "売上" : "仕入";
          const revVal = e.revenue || 0;
          const amtVal = e.amount || 0;
          const priceStr = revVal > 0 && amtVal > 0 ? ` (${revLabel}${fmtVal(revVal)}／粗利${fmtVal(amtVal)})` : revVal > 0 ? ` (${revLabel}${fmtVal(revVal)})` : amtVal > 0 ? ` (粗利${fmtVal(amtVal)})` : "";
          return details || priceStr ? <div key={ei} style={{ fontSize: 11, color: tc.textMuted, marginTop: 2, paddingLeft: 28 }}>{entries.length > 1 ? `${ei + 1}件目: ` : ""}{details}{priceStr}</div> : null;
        })}
      </div>
    );
  };
  return (
    <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {prevData && <TrendIcon current={total} prev={prevTotal} />}
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{total}万円</span>
        </div>
      </div>
      {sorted.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>未入力</p> : (
        <>
          {top3.map((s, i) => renderEntry(s, i))}
          {sorted.length > 3 && (
            <>
              <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px solid #0077b6", borderRadius: 6, cursor: "pointer", width: "100%" }}>
                {showAll ? "閉じる" : `全${sorted.length}件を表示`}
              </button>
              {showAll && sorted.slice(3).map((s, i) => renderEntry(s, i + 3, true))}
            </>
          )}
        </>
      )}
    </div>
  );
}
