"use client";

import { useState } from "react";
import { useTheme } from "../../../theme-provider";
import { TrendIcon } from "../ui/TrendIcon";
import type { StaffActivity, OrderEntry } from "../../types";

export function AmountRankCard({ title, data, prevData, entryType, color, darkMode }: {
  title: string; data: StaffActivity[]; prevData?: StaffActivity[]; entryType: "ra" | "ca" | "raPU" | "caPU"; color: string; darkMode?: boolean;
}) {
  const { t: tc } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const [detailOpen, setDetailOpen] = useState<Record<number, boolean>>({});
  const isPU = entryType === "raPU" || entryType === "caPU";
  const getEntries = (s: StaffActivity) => {
    switch (entryType) {
      case "ra": return s.raEntries || [];
      case "ca": return s.caEntries || [];
      case "raPU": return s.raPriceUpEntries || [];
      case "caPU": return s.caPriceUpEntries || [];
    }
  };
  const getTotal = (s: StaffActivity) => getEntries(s).reduce((sum, e) => sum + (e.amount || 0), 0);
  const sorted = [...data].filter(s => s.staff && getTotal(s) > 0).sort((a, b) => getTotal(b) - getTotal(a));
  const top3 = sorted.slice(0, 3);
  const total = Math.round(sorted.reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const prevTotal = Math.round((prevData || []).reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const medals = ["🥇", "🥈", "🥉"];
  const fmtVal = (v: number) => `${Math.round(v * 10) / 10}万円`;
  const revLabel = (entryType === "ra" || entryType === "raPU") ? "売上" : "仕入";

  const renderEntry = (s: StaffActivity, i: number, isSub?: boolean) => {
    const entries = getEntries(s);
    const staffTotal = Math.round(getTotal(s) * 10) / 10;
    const textPrimary = darkMode ? "#fff" : (isSub ? tc.textSecondary : tc.textPrimary);
    const textDetail = darkMode ? "rgba(255,255,255,0.45)" : tc.textMuted;
    const borderCol = darkMode ? "rgba(255,255,255,0.08)" : tc.border;
    const isOpen = detailOpen[i] || false;
    return (
      <div key={i} style={{ padding: darkMode ? "6px 0" : "8px 0", borderBottom: `1px solid ${borderCol}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: darkMode ? 6 : 8 }}>
            {isSub ? <span style={{ fontSize: darkMode ? 10 : 12, color: darkMode ? "rgba(255,255,255,0.5)" : tc.textMuted, width: darkMode ? 18 : 20, textAlign: "center" }}>{i + 1}</span> : <span style={{ fontSize: darkMode ? 14 : 16 }}>{medals[i]}</span>}
            <span style={{ fontSize: darkMode ? (isSub ? 11 : 12) : (isSub ? 13 : 14), fontWeight: 600, color: textPrimary }}>{s.staff}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ fontSize: darkMode ? (isSub ? 12 : 14) : (isSub ? 14 : 16), fontWeight: 700, color }}>{fmtVal(staffTotal)}</span>
            {isPU && <span style={{ fontSize: darkMode ? 10 : 11, color: textDetail }}>{entries.length}件</span>}
            {entries.length > 0 && (
              <button onClick={() => setDetailOpen(prev => ({ ...prev, [i]: !prev[i] }))} style={{
                padding: darkMode ? "1px 6px" : "2px 8px", fontSize: darkMode ? 9 : 10, fontWeight: 600, color,
                background: "transparent", border: `1px solid ${darkMode ? color + "60" : color}`, borderRadius: 4, cursor: "pointer", lineHeight: 1.4
              }}>
                {isOpen ? "閉じる" : "詳細"}
              </button>
            )}
          </div>
        </div>
        {isOpen && entries.map((e, ei) => {
          const details = [e.company, e.affiliation, e.position].filter(Boolean).join(" / ");
          const revVal = e.revenue || 0;
          const amtVal = e.amount || 0;
          const priceStr = revVal > 0 && amtVal > 0 ? ` (${revLabel}${fmtVal(revVal)}／粗利${fmtVal(amtVal)})` : revVal > 0 ? ` (${revLabel}${fmtVal(revVal)})` : amtVal > 0 ? ` (粗利${fmtVal(amtVal)})` : "";
          return details || priceStr ? <div key={ei} style={{ fontSize: darkMode ? 10 : 11, color: textDetail, marginTop: 2, paddingLeft: darkMode ? 20 : 28 }}>{entries.length > 1 ? `${ei + 1}件目: ` : ""}{details}{priceStr}</div> : null;
        })}
      </div>
    );
  };

  if (darkMode) {
    const bgCard = "rgba(255,255,255,0.06)";
    const textDisabled = "rgba(255,255,255,0.35)";
    const btnBg = "rgba(255,255,255,0.1)";
    return (
      <div style={{ background: bgCard, borderRadius: 10, padding: "16px 14px", borderLeft: `3px solid ${color}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <h3 style={{ fontSize: 13, fontWeight: 700, color, margin: 0 }}>{title}</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {prevData && <TrendIcon current={total} prev={prevTotal} />}
            <span style={{ fontSize: 20, fontWeight: 800, color, lineHeight: 1 }}>{total}万円</span>
          </div>
        </div>
        {sorted.length === 0 ? <p style={{ color: textDisabled, fontSize: 12, margin: 0 }}>未入力</p> : (
          <>
            {top3.map((s, i) => renderEntry(s, i))}
            {sorted.length > 3 && (
              <>
                <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 6, padding: "4px 8px", fontSize: 10, fontWeight: 600, color, background: btnBg, border: `1px solid ${color}40`, borderRadius: 4, cursor: "pointer", width: "100%" }}>
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

  // Light mode (original)
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
