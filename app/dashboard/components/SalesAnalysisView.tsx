"use client";

import { useState } from "react";
import { useTheme } from "../../theme-provider";
import { STAFF_LIST } from "../constants/data";
import type { AllData } from "../types";

interface Props {
  allData: AllData;
  monthlyYM: string;
  setMonthlyYM: (ym: string) => void;
  isMobile: boolean;
  totalTarget?: number;
  totalCarryover?: number;
}

export function SalesAnalysisView({ allData, monthlyYM, setMonthlyYM, isMobile, totalTarget = 0, totalCarryover = 0 }: Props) {
  const { t: tc, theme } = useTheme();
  const isDark = theme === "dark";
  const [analysisMode, setAnalysisMode] = useState<"funnel" | "matrix">("funnel");
  // ファネルソート
  const [funnelSortKey, setFunnelSortKey] = useState<string>("cv3");
  const [funnelSortDir, setFunnelSortDir] = useState<"asc" | "desc">("desc");
  // マトリクスソート (CA / RA)
  const [caSortKey, setCaSortKey] = useState<string>("total");
  const [caSortDir, setCaSortDir] = useState<"asc" | "desc">("desc");
  const [raSortKey, setRaSortKey] = useState<string>("total");
  const [raSortDir, setRaSortDir] = useState<"asc" | "desc">("desc");

  const toggleSort = (current: string, dir: "asc" | "desc", key: string, setKey: (k: string) => void, setDir: (d: "asc" | "desc") => void) => {
    if (current === key) setDir(dir === "asc" ? "desc" : "asc");
    else { setKey(key); setDir("desc"); }
  };
  const sortIcon = (currentKey: string, dir: "asc" | "desc", key: string) => currentKey === key ? (dir === "asc" ? "▲" : "▼") : "";

  const [ymYear, ymMonth] = monthlyYM.split("-").map(Number);
  const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();

  // 月の全日分のデータを集計
  const days: { key: string; d: number }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    days.push({ key: `${ymYear}-${("0" + ymMonth).slice(-2)}-${("0" + d).slice(-2)}`, d });
  }

  // 担当者別の月間集計
  const getStaffMonthData = (staff: string) => {
    let interviewSetups = 0;
    let interviewsConducted = 0;
    let ordersRA = 0;
    let ordersCA = 0;
    const caByAffiliation: Record<string, { count: number; profit: number }> = {};
    const raByAffiliation: Record<string, { count: number; profit: number }> = {};

    days.forEach(day => {
      const dayData = allData[day.key];
      if (!dayData || !Array.isArray(dayData.staffActivities)) return;
      const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
      if (!entry) return;
      interviewSetups += entry.interviewSetups || 0;
      interviewsConducted += entry.interviewsConducted || 0;
      ordersRA += entry.ordersRA || 0;
      ordersCA += entry.ordersCA || 0;
      // CA所属別
      (entry.caEntries || []).forEach((e: any) => {
        const af = e.affiliation || "未選択";
        if (!caByAffiliation[af]) caByAffiliation[af] = { count: 0, profit: 0 };
        caByAffiliation[af].count += 1;
        caByAffiliation[af].profit += e.amount || 0;
      });
      // RA所属別
      (entry.raEntries || []).forEach((e: any) => {
        const af = e.affiliation || "未選択";
        if (!raByAffiliation[af]) raByAffiliation[af] = { count: 0, profit: 0 };
        raByAffiliation[af].count += 1;
        raByAffiliation[af].profit += e.amount || 0;
      });
    });
    return { staff, interviewSetups, interviewsConducted, ordersRA, ordersCA, caByAffiliation, raByAffiliation };
  };

  const staffData = STAFF_LIST.map(getStaffMonthData);
  const affiliations = ["プロパー", "BP", "フリーランス", "協業"];

  // ===== ファネル =====
  const renderFunnel = () => {
    const totals = staffData.reduce((acc, s) => ({
      setups: acc.setups + s.interviewSetups,
      conducted: acc.conducted + s.interviewsConducted,
      ordersRA: acc.ordersRA + s.ordersRA,
      ordersCA: acc.ordersCA + s.ordersCA,
    }), { setups: 0, conducted: 0, ordersRA: 0, ordersCA: 0 });
    const totalOrders = totals.ordersRA + totals.ordersCA;
    const cvSetToConducted = totals.setups > 0 ? Math.round((totals.conducted / totals.setups) * 1000) / 10 : 0;
    const cvConductedToOrder = totals.conducted > 0 ? Math.round((totalOrders / totals.conducted) * 1000) / 10 : 0;
    const cvSetToOrder = totals.setups > 0 ? Math.round((totalOrders / totals.setups) * 1000) / 10 : 0;

    const funnelSteps = [
      { label: "面談設定", value: totals.setups, color: "#0077b6" },
      { label: "面談実施", value: totals.conducted, color: "#e67e22" },
      { label: "受注（RA+CA）", value: totalOrders, color: "#2ecc71" },
    ];

    const barMaxWidth = isMobile ? 200 : 400;
    const maxVal = Math.max(...funnelSteps.map(s => s.value), 1);

    return (
      <div>
        {/* 全体ファネル */}
        <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: "0 0 16px" }}>全体コンバージョンファネル</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {funnelSteps.map((step, idx) => (
              <div key={step.label}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary, minWidth: 120 }}>{step.label}</span>
                  <div style={{ width: barMaxWidth, background: isDark ? "rgba(255,255,255,0.08)" : "#f0f2f5", borderRadius: 6, height: 28, position: "relative" }}>
                    <div style={{ width: maxVal > 0 ? `${(step.value / maxVal) * 100}%` : "0%", background: step.color, borderRadius: 6, height: "100%", minWidth: step.value > 0 ? 2 : 0, transition: "width 0.3s" }} />
                    <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", fontSize: 13, fontWeight: 700, color: isDark ? "#fff" : "#333" }}>{step.value}</span>
                  </div>
                </div>
                {idx < funnelSteps.length - 1 && (
                  <div style={{ marginLeft: 132, fontSize: 11, color: tc.textMuted }}>
                    ↓ 転換率：<span style={{ fontWeight: 700, color: idx === 0 ? "#e67e22" : "#2ecc71" }}>
                      {idx === 0 ? `${cvSetToConducted}%` : `${cvConductedToOrder}%`}
                    </span>
                  </div>
                )}
              </div>
            ))}
            <div style={{ marginLeft: 132, fontSize: 12, fontWeight: 600, color: tc.textPrimary, paddingTop: 4, borderTop: `1px solid ${tc.border}` }}>
              設定→受注 総合転換率：<span style={{ color: "#2ecc71", fontSize: 14 }}>{cvSetToOrder}%</span>
            </div>
            {(() => {
              const monthlyOrderTarget = totalTarget - totalCarryover;
              const requiredSetups = cvSetToOrder > 0 ? Math.ceil(monthlyOrderTarget / (cvSetToOrder / 100)) : 0;
              return (
                <div style={{ marginLeft: 132, fontSize: 12, fontWeight: 600, color: tc.textPrimary, marginTop: 6 }}>
                  <div>今月受注粗利目標：<span style={{ color: "#0077b6" }}>¥{Math.max(0, monthlyOrderTarget).toLocaleString()}</span></div>
                  <div style={{ marginTop: 2 }}>必要面談設定数：<span style={{ color: "#e63946", fontSize: 14 }}>{requiredSetups > 0 ? requiredSetups : "—"}</span></div>
                </div>
              );
            })()}
          </div>
        </div>

        {/* 担当者別ファネル */}
        <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: "0 0 16px" }}>担当者別コンバージョン</h3>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 600, fontSize: 13 }}>
              <thead>
                <tr>
                  {([
                    { key: "staff", label: "担当", align: "left" as const, color: tc.textHeading },
                    { key: "setups", label: "面談設定", align: "right" as const, color: "#0077b6" },
                    { key: "conducted", label: "面談実施", align: "right" as const, color: "#e67e22" },
                    { key: "cv1", label: "設定→実施", align: "center" as const, color: tc.textMuted },
                    { key: "ordersRA", label: "RA受注", align: "right" as const, color: "#e74c3c" },
                    { key: "ordersCA", label: "CA受注", align: "right" as const, color: "#9b59b6" },
                    { key: "ordersTotal", label: "受注計", align: "right" as const, color: "#2ecc71" },
                    { key: "cv2", label: "実施→受注", align: "center" as const, color: tc.textMuted },
                    { key: "cv3", label: "設定→受注", align: "center" as const, color: tc.textMuted },
                  ]).map(col => (
                    <th key={col.key} onClick={() => toggleSort(funnelSortKey, funnelSortDir, col.key, setFunnelSortKey, setFunnelSortDir)} style={{ padding: "8px 12px", textAlign: col.align, borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: col.color, cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                      {col.label} {sortIcon(funnelSortKey, funnelSortDir, col.key)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {staffData
                  .filter(s => s.interviewSetups > 0 || s.interviewsConducted > 0 || s.ordersRA > 0 || s.ordersCA > 0)
                  .sort((a, b) => {
                    const getVal = (s: typeof a) => {
                      const total = s.ordersRA + s.ordersCA;
                      const cv1 = s.interviewSetups > 0 ? s.interviewsConducted / s.interviewSetups : 0;
                      const cv2 = s.interviewsConducted > 0 ? total / s.interviewsConducted : 0;
                      const cv3 = s.interviewSetups > 0 ? total / s.interviewSetups : 0;
                      switch (funnelSortKey) {
                        case "staff": return s.staff;
                        case "setups": return s.interviewSetups;
                        case "conducted": return s.interviewsConducted;
                        case "cv1": return cv1;
                        case "ordersRA": return s.ordersRA;
                        case "ordersCA": return s.ordersCA;
                        case "ordersTotal": return total;
                        case "cv2": return cv2;
                        case "cv3": return cv3;
                        default: return cv3;
                      }
                    };
                    const va = getVal(a);
                    const vb = getVal(b);
                    const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
                    return funnelSortDir === "asc" ? cmp : -cmp;
                  })
                  .map((s, idx) => {
                    const totalOrders = s.ordersRA + s.ordersCA;
                    const cv1 = s.interviewSetups > 0 ? Math.round((s.interviewsConducted / s.interviewSetups) * 1000) / 10 : 0;
                    const cv2 = s.interviewsConducted > 0 ? Math.round((totalOrders / s.interviewsConducted) * 1000) / 10 : 0;
                    const cv3 = s.interviewSetups > 0 ? Math.round((totalOrders / s.interviewSetups) * 1000) / 10 : 0;
                    const rowBg = idx % 2 === 1 ? (isDark ? "#1e2533" : "#f8f9fb") : "transparent";
                    return (
                      <tr key={s.staff} style={{ background: rowBg }}>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, fontWeight: 600 }}>{s.staff}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "right" }}>{s.interviewSetups}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "right" }}>{s.interviewsConducted}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", color: cv1 >= 80 ? "#2ecc71" : cv1 >= 50 ? "#f39c12" : "#e74c3c", fontWeight: 600 }}>{s.interviewSetups > 0 ? `${cv1}%` : "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "right" }}>{s.ordersRA}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "right" }}>{s.ordersCA}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "right", fontWeight: 700, color: "#2ecc71" }}>{totalOrders}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", color: cv2 >= 30 ? "#2ecc71" : cv2 >= 15 ? "#f39c12" : "#e74c3c", fontWeight: 600 }}>{s.interviewsConducted > 0 ? `${cv2}%` : "—"}</td>
                        <td style={{ padding: "8px 12px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", color: cv3 >= 20 ? "#2ecc71" : cv3 >= 10 ? "#f39c12" : "#e74c3c", fontWeight: 700 }}>{s.interviewSetups > 0 ? `${cv3}%` : "—"}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  // ===== 相性マトリクス =====
  const renderMatrix = () => {
    // CA受注の担当者×所属別 件数・粗利
    const activeStaff = staffData.filter(s => s.ordersCA > 0 || s.ordersRA > 0);

    const fmtAmount = (v: number): string => {
      if (v === 0) return "—";
      const rounded = Math.round(v * 10) / 10;
      const parts = rounded.toString().split(".");
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      return parts.join(".");
    };

    return (
      <div>
        {/* CA マトリクス */}
        <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow, marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: "0 0 4px" }}>CA受注 担当者×所属マトリクス</h3>
          <p style={{ fontSize: 11, color: tc.textMuted, margin: "0 0 16px" }}>件数（粗利 万円）</p>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 500, fontSize: 12 }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort(caSortKey, caSortDir, "staff", setCaSortKey, setCaSortDir)} style={{ padding: "8px 10px", textAlign: "left", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: tc.textHeading, cursor: "pointer", userSelect: "none" }}>担当 {sortIcon(caSortKey, caSortDir, "staff")}</th>
                  {affiliations.map(af => (
                    <th key={af} onClick={() => toggleSort(caSortKey, caSortDir, `ca_${af}`, setCaSortKey, setCaSortDir)} style={{ padding: "8px 10px", textAlign: "center", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: "#9b59b6", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>{af} {sortIcon(caSortKey, caSortDir, `ca_${af}`)}</th>
                  ))}
                  <th onClick={() => toggleSort(caSortKey, caSortDir, "total", setCaSortKey, setCaSortDir)} style={{ padding: "8px 10px", textAlign: "center", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: tc.textPrimary, cursor: "pointer", userSelect: "none" }}>合計 {sortIcon(caSortKey, caSortDir, "total")}</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff
                  .filter(s => s.ordersCA > 0)
                  .sort((a, b) => {
                    const getVal = (s: typeof a) => {
                      if (caSortKey === "staff") return s.staff;
                      if (caSortKey === "total") return s.ordersCA;
                      const af = caSortKey.replace("ca_", "");
                      return s.caByAffiliation[af]?.count || 0;
                    };
                    const va = getVal(a);
                    const vb = getVal(b);
                    const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
                    return caSortDir === "asc" ? cmp : -cmp;
                  })
                  .map((s, idx) => {
                    const rowBg = idx % 2 === 1 ? (isDark ? "#1e2533" : "#f8f9fb") : "transparent";
                    const totalProfit = Object.values(s.caByAffiliation).reduce((sum, v) => sum + v.profit, 0);
                    return (
                      <tr key={s.staff} style={{ background: rowBg }}>
                        <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, fontWeight: 600 }}>{s.staff}</td>
                        {affiliations.map(af => {
                          const data = s.caByAffiliation[af];
                          const count = data?.count || 0;
                          const profit = data?.profit || 0;
                          const maxCount = Math.max(...affiliations.map(a => s.caByAffiliation[a]?.count || 0));
                          const isBest = count > 0 && count === maxCount;
                          return (
                            <td key={af} style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", background: isBest ? (isDark ? "rgba(46,204,113,0.15)" : "rgba(46,204,113,0.1)") : undefined }}>
                              {count > 0 ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: tc.textPrimary }}>{count}</span>
                                  <span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                                  <div style={{ fontSize: 10, color: "#9b59b6", fontWeight: 600 }}>{fmtAmount(profit)}</div>
                                </div>
                              ) : <span style={{ color: tc.textDisabled }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", fontWeight: 700 }}>
                          <span style={{ color: tc.textPrimary }}>{s.ordersCA}</span>
                          <span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                          <div style={{ fontSize: 10, color: "#9b59b6", fontWeight: 600 }}>{fmtAmount(Math.round(totalProfit * 10) / 10)}</div>
                        </td>
                      </tr>
                    );
                  })}
                {/* 合計行 */}
                <tr style={{ background: isDark ? "#1a2332" : "#f0f4f8", fontWeight: 700 }}>
                  <td style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}` }}>合計</td>
                  {affiliations.map(af => {
                    const total = activeStaff.reduce((sum, s) => sum + (s.caByAffiliation[af]?.count || 0), 0);
                    const totalP = activeStaff.reduce((sum, s) => sum + (s.caByAffiliation[af]?.profit || 0), 0);
                    return (
                      <td key={af} style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}`, textAlign: "center" }}>
                        <span style={{ color: tc.textPrimary }}>{total}</span><span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                        <div style={{ fontSize: 10, color: "#9b59b6", fontWeight: 600 }}>{fmtAmount(Math.round(totalP * 10) / 10)}</div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}`, textAlign: "center" }}>
                    <span style={{ color: tc.textPrimary }}>{activeStaff.reduce((sum, s) => sum + s.ordersCA, 0)}</span><span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* RA マトリクス */}
        <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: "0 0 4px" }}>RA受注 担当者×所属マトリクス</h3>
          <p style={{ fontSize: 11, color: tc.textMuted, margin: "0 0 16px" }}>件数（粗利 万円）</p>
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 500, fontSize: 12 }}>
              <thead>
                <tr>
                  <th onClick={() => toggleSort(raSortKey, raSortDir, "staff", setRaSortKey, setRaSortDir)} style={{ padding: "8px 10px", textAlign: "left", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: tc.textHeading, cursor: "pointer", userSelect: "none" }}>担当 {sortIcon(raSortKey, raSortDir, "staff")}</th>
                  {affiliations.map(af => (
                    <th key={af} onClick={() => toggleSort(raSortKey, raSortDir, `ra_${af}`, setRaSortKey, setRaSortDir)} style={{ padding: "8px 10px", textAlign: "center", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: "#e74c3c", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>{af} {sortIcon(raSortKey, raSortDir, `ra_${af}`)}</th>
                  ))}
                  <th onClick={() => toggleSort(raSortKey, raSortDir, "total", setRaSortKey, setRaSortDir)} style={{ padding: "8px 10px", textAlign: "center", borderBottom: `2px solid ${tc.border}`, fontWeight: 700, color: tc.textPrimary, cursor: "pointer", userSelect: "none" }}>合計 {sortIcon(raSortKey, raSortDir, "total")}</th>
                </tr>
              </thead>
              <tbody>
                {activeStaff
                  .filter(s => s.ordersRA > 0)
                  .sort((a, b) => {
                    const getVal = (s: typeof a) => {
                      if (raSortKey === "staff") return s.staff;
                      if (raSortKey === "total") return s.ordersRA;
                      const af = raSortKey.replace("ra_", "");
                      return s.raByAffiliation[af]?.count || 0;
                    };
                    const va = getVal(a);
                    const vb = getVal(b);
                    const cmp = typeof va === "string" ? (va as string).localeCompare(vb as string) : (va as number) - (vb as number);
                    return raSortDir === "asc" ? cmp : -cmp;
                  })
                  .map((s, idx) => {
                    const rowBg = idx % 2 === 1 ? (isDark ? "#1e2533" : "#f8f9fb") : "transparent";
                    const totalProfit = Object.values(s.raByAffiliation).reduce((sum, v) => sum + v.profit, 0);
                    return (
                      <tr key={s.staff} style={{ background: rowBg }}>
                        <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, fontWeight: 600 }}>{s.staff}</td>
                        {affiliations.map(af => {
                          const data = s.raByAffiliation[af];
                          const count = data?.count || 0;
                          const profit = data?.profit || 0;
                          const maxCount = Math.max(...affiliations.map(a => s.raByAffiliation[a]?.count || 0));
                          const isBest = count > 0 && count === maxCount;
                          return (
                            <td key={af} style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", background: isBest ? (isDark ? "rgba(231,76,60,0.15)" : "rgba(231,76,60,0.1)") : undefined }}>
                              {count > 0 ? (
                                <div>
                                  <span style={{ fontWeight: 700, color: tc.textPrimary }}>{count}</span>
                                  <span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                                  <div style={{ fontSize: 10, color: "#e74c3c", fontWeight: 600 }}>{fmtAmount(profit)}</div>
                                </div>
                              ) : <span style={{ color: tc.textDisabled }}>—</span>}
                            </td>
                          );
                        })}
                        <td style={{ padding: "8px 10px", borderBottom: `1px solid ${tc.border}`, textAlign: "center", fontWeight: 700 }}>
                          <span style={{ color: tc.textPrimary }}>{s.ordersRA}</span>
                          <span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                          <div style={{ fontSize: 10, color: "#e74c3c", fontWeight: 600 }}>{fmtAmount(Math.round(totalProfit * 10) / 10)}</div>
                        </td>
                      </tr>
                    );
                  })}
                {/* 合計行 */}
                <tr style={{ background: isDark ? "#1a2332" : "#f0f4f8", fontWeight: 700 }}>
                  <td style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}` }}>合計</td>
                  {affiliations.map(af => {
                    const total = activeStaff.reduce((sum, s) => sum + (s.raByAffiliation[af]?.count || 0), 0);
                    const totalP = activeStaff.reduce((sum, s) => sum + (s.raByAffiliation[af]?.profit || 0), 0);
                    return (
                      <td key={af} style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}`, textAlign: "center" }}>
                        <span style={{ color: tc.textPrimary }}>{total}</span><span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                        <div style={{ fontSize: 10, color: "#e74c3c", fontWeight: 600 }}>{fmtAmount(Math.round(totalP * 10) / 10)}</div>
                      </td>
                    );
                  })}
                  <td style={{ padding: "8px 10px", borderTop: `2px solid ${tc.border}`, textAlign: "center" }}>
                    <span style={{ color: tc.textPrimary }}>{activeStaff.reduce((sum, s) => sum + s.ordersRA, 0)}</span><span style={{ fontSize: 10, color: tc.textMuted }}>件</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      {/* 年月選択 */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <button onClick={() => { const [y, m] = monthlyYM.split("-").map(Number); const prev = m === 1 ? `${y - 1}-12` : `${y}-${("0" + (m - 1)).slice(-2)}`; setMonthlyYM(prev); }} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${tc.border}`, borderRadius: 6, background: tc.bgCard, color: tc.textPrimary }}>◀</button>
        <span style={{ fontSize: 18, fontWeight: 700, color: tc.textPrimary }}>{ymYear}年{ymMonth}月</span>
        <button onClick={() => { const [y, m] = monthlyYM.split("-").map(Number); const next = m === 12 ? `${y + 1}-01` : `${y}-${("0" + (m + 1)).slice(-2)}`; setMonthlyYM(next); }} style={{ padding: "6px 12px", fontSize: 13, fontWeight: 600, cursor: "pointer", border: `1px solid ${tc.border}`, borderRadius: 6, background: tc.bgCard, color: tc.textPrimary }}>▶</button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
          {([
            { key: "funnel" as const, label: "コンバージョンファネル" },
            { key: "matrix" as const, label: "担当者×所属マトリクス" },
          ]).map(tab => (
            <button key={tab.key} onClick={() => setAnalysisMode(tab.key)} style={{
              padding: "6px 14px", fontSize: 12, fontWeight: analysisMode === tab.key ? 700 : 400, cursor: "pointer",
              border: `1px solid ${analysisMode === tab.key ? "transparent" : tc.border}`, borderRadius: 6,
              background: analysisMode === tab.key ? (isDark ? "#334155" : "#475569") : "transparent",
              color: analysisMode === tab.key ? "#fff" : tc.textMuted,
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {analysisMode === "funnel" && renderFunnel()}
      {analysisMode === "matrix" && renderMatrix()}
    </div>
  );
}
