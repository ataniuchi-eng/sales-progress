"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useTheme } from "../../theme-provider";
import { AllData, StaffActivity, DayData } from "../types";
import { STAFF_LIST, ACTIVITY_FIELDS, ACTIVITY_AMOUNT_FIELDS, JAPAN_HOLIDAYS } from "../constants/data";
import { parseNum, parseAmount, formatAmount, formatNumStr, calcRate, emptyData } from "../utils/numbers";
import { dateKey, parseDate, formatDateJP, isBusinessDay } from "../utils/dates";

export function MonthlyActivityView({ allData, setAllData, monthlyYM, setMonthlyYM, isMobile }: { allData: AllData; setAllData: React.Dispatch<React.SetStateAction<AllData>>; monthlyYM: string; setMonthlyYM: (v: string) => void; isMobile: boolean }) {
  const { theme, t: tc } = useTheme();
  const [monthlyMode, setMonthlyMode] = useState<"count" | "amount" | "other">("amount");
  const [sortState, setSortState] = useState<Record<string, "asc" | "desc" | "none">>({});
  const [budgets, setBudgets] = useState<Record<string, Record<string, number>>>({});
  const [carryovers, setCarryovers] = useState<Record<string, Record<string, number>>>({});
  const [countTargets, setCountTargets] = useState<Record<string, Record<string, number>>>({});
  const [editingCell, setEditingCell] = useState<{ staff: string; field: string; type: "budget" | "carryover" | "countTarget" | "countCarryover" | "dailyTarget"; dayKey?: string } | null>(null);
  const [caCountTotalOnly, setCaCountTotalOnly] = useState(false);
  const [caAmountTotalOnly, setCaAmountTotalOnly] = useState(false);
  const [countCarryovers, setCountCarryovers] = useState<Record<string, Record<string, number>>>({});
  const [editingCellValue, setEditingCellValue] = useState("");
  // その他
  const [miscItems, setMiscItems] = useState<{ staff: string; content: string; deadline: string; status: string; createdAt: string }[]>([]);
  const [miscInput, setMiscInput] = useState<{ staff: string; content: string; deadline: string; status: string }>({ staff: "", content: "", deadline: "", status: "" });
  const [miscSortKey, setMiscSortKey] = useState<"staff" | "status">("staff");
  const [miscSortDir, setMiscSortDir] = useState<"asc" | "desc">("asc");
  const [ymYear, ymMonth] = monthlyYM.split("-").map(Number);
  const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  // 予算・前月繰越データをロード
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) return;
        const data = await res.json();
        const budgetData: Record<string, Record<string, number>> = {};
        const carryoverData: Record<string, Record<string, number>> = {};
        const countTargetData: Record<string, Record<string, number>> = {};
        const countCarryoverData: Record<string, Record<string, number>> = {};
        for (const key of Object.keys(data)) {
          if (key.startsWith("budget-")) {
            budgetData[key] = data[key];
          } else if (key.startsWith("countCarryover-")) {
            countCarryoverData[key] = data[key];
          } else if (key.startsWith("carryover-")) {
            carryoverData[key] = data[key];
          } else if (key.startsWith("countTarget-") || key.startsWith("dailyTarget-")) {
            countTargetData[key] = data[key];
          }
        }
        setBudgets(budgetData);
        setCarryovers(carryoverData);
        setCountTargets(countTargetData);
        setCountCarryovers(countCarryoverData);
      } catch {}
    };
    loadData();
  }, []);

  // その他データのロード
  useEffect(() => {
    const loadMisc = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) return;
        const data = await res.json();
        const miscKey = `misc-${monthlyYM}`;
        if (data[miscKey] && Array.isArray(data[miscKey].items)) {
          setMiscItems(data[miscKey].items.map((item: any) => ({ ...item, deadline: item.deadline || "" })));
        } else {
          setMiscItems([]);
        }
      } catch {}
    };
    loadMisc();
  }, [monthlyYM]);

  // その他データを保存
  const saveMiscItems = async (items: { staff: string; content: string; deadline: string; status: string; createdAt: string }[]) => {
    const miscKey = `misc-${monthlyYM}`;
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: miscKey, data: { items } }) });
    } catch {}
  };

  // その他アイテム追加
  const addMiscItem = () => {
    if (!miscInput.staff || !miscInput.content || !miscInput.status) return;
    const now = new Date().toISOString();
    const updated = [...miscItems, { ...miscInput, createdAt: now }];
    setMiscItems(updated);
    saveMiscItems(updated);
    setMiscInput({ staff: "", content: "", deadline: "", status: "" });
  };

  // その他アイテム更新（内容・進捗のみ、日時は変えない）
  const updateMiscItem = (index: number, field: "content" | "deadline" | "status", value: string) => {
    const updated = [...miscItems];
    updated[index] = { ...updated[index], [field]: value };
    setMiscItems(updated);
    saveMiscItems(updated);
  };

  // その他アイテム削除
  const removeMiscItem = (index: number) => {
    const updated = miscItems.filter((_, i) => i !== index);
    setMiscItems(updated);
    saveMiscItems(updated);
  };

  // その他ソート切替
  const toggleMiscSort = (key: "staff" | "status") => {
    if (miscSortKey === key) {
      setMiscSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setMiscSortKey(key);
      setMiscSortDir("asc");
    }
  };

  // 予算を保存
  const saveBudget = async (field: string, staff: string, value: number) => {
    const budgetKey = `budget-${field}-${monthlyYM}`;
    const current = budgets[budgetKey] || {};
    const updated = { ...current, [staff]: value };
    setBudgets(prev => ({ ...prev, [budgetKey]: updated }));
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: budgetKey, data: updated }),
      });
    } catch {}
  };

  // 前月繰越を保存
  const saveCarryover = async (field: string, staff: string, value: number) => {
    const carryoverKey = `carryover-${field}-${monthlyYM}`;
    const current = carryovers[carryoverKey] || {};
    const updated = { ...current, [staff]: value };
    setCarryovers(prev => ({ ...prev, [carryoverKey]: updated }));
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: carryoverKey, data: updated }),
      });
    } catch {}
  };

  // 予算取得
  const getStaffBudget = (staff: string, field: string): number => {
    const budgetKey = `budget-${field}-${monthlyYM}`;
    return budgets[budgetKey]?.[staff] || 0;
  };

  // 前月繰越取得（手入力値）
  const getStaffCarryover = (staff: string, field: string): number => {
    const carryoverKey = `carryover-${field}-${monthlyYM}`;
    return carryovers[carryoverKey]?.[staff] || 0;
  };

  // 件数繰越取得
  const getCountCarryover = (staff: string, field: string): number => {
    const key = `countCarryover-${field}-${monthlyYM}`;
    return countCarryovers[key]?.[staff] || 0;
  };

  // 件数繰越保存
  const saveCountCarryover = async (field: string, staff: string, value: number) => {
    const key = `countCarryover-${field}-${monthlyYM}`;
    const current = countCarryovers[key] || {};
    const updated = { ...current, [staff]: value };
    setCountCarryovers(prev => ({ ...prev, [key]: updated }));
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: key, data: updated }) });
    } catch {}
  };

  // 件数・月目標を保存
  const saveCountTarget = async (field: string, staff: string, value: number) => {
    const key = `countTarget-${field}-${monthlyYM}`;
    const current = countTargets[key] || {};
    const updated = { ...current, [staff]: value };
    setCountTargets(prev => ({ ...prev, [key]: updated }));
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: key, data: updated }) });
    } catch {}
  };

  // 件数・日目標を保存（担当×日ごと）
  const saveDailyTarget = async (field: string, staff: string, dayKey: string, value: number) => {
    const key = `dailyTarget-${field}-${monthlyYM}`;
    const current = countTargets[key] || {};
    const staffKey = `${staff}_${dayKey}`;
    const updated = { ...current, [staffKey]: value };
    setCountTargets(prev => ({ ...prev, [key]: updated }));
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: key, data: updated }) });
    } catch {}
  };

  // 件数・月目標取得
  const getCountTarget = (staff: string, field: string): number => {
    const key = `countTarget-${field}-${monthlyYM}`;
    return countTargets[key]?.[staff] || 0;
  };

  // 件数・日目標取得
  const getDailyTarget = (staff: string, field: string, dayKey: string): number => {
    const key = `dailyTarget-${field}-${monthlyYM}`;
    return countTargets[key]?.[`${staff}_${dayKey}`] || 0;
  };

  // 達成率の色
  const getAchievementColor = (rate: number): string => {
    if (rate <= 50) return "#e74c3c";      // 赤
    if (rate <= 80) return "#f39c12";      // 黄色
    if (rate <= 90) return "#27ae60";      // 緑
    return "#2980b9";                       // 青
  };

  // 達成率の背景色
  const getAchievementBg = (rate: number): string => {
    if (rate <= 50) return "#fdecea";
    if (rate <= 80) return "#fef9e7";
    if (rate <= 90) return "#eafaf1";
    return "#ebf5fb";
  };

  // 年月セレクトの選択肢を生成（2026-03 〜 2028-03）
  const ymOptions: string[] = [];
  for (let y = 2026; y <= 2028; y++) {
    const startM = y === 2026 ? 3 : 1;
    const endM = y === 2028 ? 3 : 12;
    for (let m = startM; m <= endM; m++) {
      ymOptions.push(`${y}-${("0" + m).slice(-2)}`);
    }
  }

  // 日付情報を生成
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dt = new Date(ymYear, ymMonth - 1, d);
    const key = `${ymYear}-${("0" + ymMonth).slice(-2)}-${("0" + d).slice(-2)}`;
    const dow = dt.getDay();
    const holiday = JAPAN_HOLIDAYS[key];
    const isRed = dow === 0 || dow === 6 || !!holiday;
    return { d, key, dow, holiday, isRed, dowLabel: DOW[dow] };
  });

  // 各担当×各日×各指標のデータを集計
  const getStaffDayValue = (staff: string, dayKey: string, field: keyof StaffActivity | string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    // Handle legacy amountCA/amountRA by summing entries
    if (field === "amountCA") {
      const entries = (entry as any).caEntries || [];
      return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || ((entry as any).amountCA || 0);
    }
    if (field === "amountRA") {
      const entries = (entry as any).raEntries || [];
      return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || ((entry as any).amountRA || 0);
    }
    return ((entry as any)[field] as number) || 0;
  };

  const getStaffMonthTotal = (staff: string, field: keyof StaffActivity | string): number => {
    return days.reduce((sum, day) => sum + getStaffDayValue(staff, day.key, field), 0);
  };

  const getDayTotal = (dayKey: string, field: keyof StaffActivity | string): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffDayValue(staff, dayKey, field), 0);
  };

  const getMonthGrandTotal = (field: keyof StaffActivity | string): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffMonthTotal(staff, field), 0);
  };

  // CA/RA entries から所属別の金額を集計
  const getStaffDayAmountByAffiliation = (staff: string, dayKey: string, entryType: "ca" | "ra", affiliation: string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = entryType === "ca" ? ((entry as any).caEntries || []) : ((entry as any).raEntries || []);
    return entries
      .filter((e: any) => e.affiliation === affiliation)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  };

  // CA/RA entries の金額合計
  const getStaffDayAmountTotal = (staff: string, dayKey: string, entryType: "ca" | "ra"): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = entryType === "ca" ? ((entry as any).caEntries || []) : ((entry as any).raEntries || []);
    return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  };

  // 月間合計（所属別）
  const getStaffMonthAmountByAffiliation = (staff: string, entryType: "ca" | "ra", affiliation: string): number => {
    return days.reduce((sum, day) => sum + getStaffDayAmountByAffiliation(staff, day.key, entryType, affiliation), 0);
  };

  // 月間合計（全体）
  const getStaffMonthAmountTotal = (staff: string, entryType: "ca" | "ra"): number => {
    return days.reduce((sum, day) => sum + getStaffDayAmountTotal(staff, day.key, entryType), 0);
  };

  // CA entries から所属別の件数を集計（日別）
  const getStaffDayCACountByAffiliation = (staff: string, dayKey: string, affiliation: string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = (entry as any).caEntries || [];
    return entries.filter((e: any) => e.affiliation === affiliation).length;
  };

  // CA entries の所属別月間件数合計
  const getStaffMonthCACountByAffiliation = (staff: string, affiliation: string): number => {
    return days.reduce((sum, day) => sum + getStaffDayCACountByAffiliation(staff, day.key, affiliation), 0);
  };

  // 3桁カンマ区切り（小数点以下あり対応）
  const fmtAmount = (v: number): string => {
    if (v === 0) return "—";
    const parts = v.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  // 月間の企業別集計（RA受注のrevenue/amountを企業ごとに集計）
  const getMonthlyCompanyAggregates = () => {
    const companyMap: Record<string, { revenue: number; profit: number }> = {};
    days.forEach(day => {
      const dayData = allData[day.key];
      if (!dayData || !Array.isArray(dayData.staffActivities)) return;
      dayData.staffActivities.forEach((s: any) => {
        const entries = s.raEntries || [];
        entries.forEach((e: any) => {
          if (e.company) {
            if (!companyMap[e.company]) companyMap[e.company] = { revenue: 0, profit: 0 };
            companyMap[e.company].revenue += (e.revenue || 0);
            companyMap[e.company].profit += (e.amount || 0);
          }
        });
      });
    });
    const all = Object.entries(companyMap).map(([company, data]) => ({
      company, revenue: Math.round(data.revenue * 10) / 10, profit: Math.round(data.profit * 10) / 10,
    }));
    const byRevenue = [...all].filter(c => c.revenue > 0).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
    const byProfit = [...all].filter(c => c.profit > 0).sort((a, b) => b.profit - a.profit).slice(0, 5);
    return { byRevenue, byProfit };
  };

  // 繰越件数ヘッダーラベル（X/1繰越件数）
  const countCarryoverLabel = (() => {
    const [, m] = monthlyYM.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    return `${nextMonth}/1稼働件数`;
  })();

  // 繰越粗利ヘッダーラベル（X/1繰越粗利）
  const carryoverLabel = (() => {
    const [, m] = monthlyYM.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    return `${nextMonth}/1繰越粗利`;
  })();

  // 月計ヘッダーラベル（金額タブ用：X月営業粗利）
  const monthlyAmountLabel = (() => {
    const [, m] = monthlyYM.split("-").map(Number);
    return `${m}月営業粗利`;
  })();

  const isDark = theme === "dark";
  const cellStyle: React.CSSProperties = { padding: "4px 6px", textAlign: "center", fontSize: 12, borderRight: "1px solid " + tc.border, borderBottom: "1px solid " + tc.border, whiteSpace: "nowrap", color: tc.text };
  const headerCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: tc.bgSection, color: tc.text, position: "sticky", top: 0, zIndex: 2 };
  const staffCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, textAlign: "left", position: "sticky", left: 0, background: tc.bgCard, color: tc.text, zIndex: 1, minWidth: 70 };
  // Dark-safe accent backgrounds
  const hdrYellow = isDark ? "#3d3200" : "#fff3cd";
  const hdrGreen = isDark ? "#1a3a2a" : "#d4edda";
  const hdrBlue = isDark ? "#1a2e4a" : "#e8f4fd";
  const hdrBlueAlt = isDark ? "#1e3a5f" : "#dbeafe";
  const hdrGray = isDark ? "#2d3748" : "#e2e3e5";
  const rowEven = tc.bgCard;
  const rowOdd = isDark ? "#1a2332" : "#f8f9fb";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* 年月セレクト + 件数/金額 切替 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={monthlyYM} onChange={(e) => setMonthlyYM(e.target.value)} style={{ padding: "8px 16px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, fontWeight: 600, background: tc.bgCard, color: tc.text, cursor: "pointer" }}>
          {ymOptions.map(ym => {
            const [y, m] = ym.split("-");
            return <option key={ym} value={ym}>{y}年{parseInt(m)}月</option>;
          })}
        </select>
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid " + tc.inputBorder }}>
          {[{ key: "amount" as const, label: "金額" }, { key: "count" as const, label: "件数" }, { key: "other" as const, label: "その他" }].map(tab => (
            <button key={tab.key} onClick={() => setMonthlyMode(tab.key)} style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
              background: monthlyMode === tab.key ? tc.accent : tc.bgCard, color: monthlyMode === tab.key ? "#fff" : tc.textSecondary,
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ベスト5 */}
      {monthlyMode === "count" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
          {ACTIVITY_FIELDS.map(af => {
            const ranked = STAFF_LIST
              .map(staff => ({ staff, total: getStaffMonthTotal(staff, af.key) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.label}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: af.color }}>{getMonthGrandTotal(af.key)}</span>
                </div>
                {ranked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  ranked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: af.color }}>{r.total}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 当月受注企業 売上・粗利（金額タブ） */}
      {monthlyMode === "amount" && (() => {
        const { byRevenue, byProfit } = getMonthlyCompanyAggregates();
        const medals = ["🥇", "🥈", "🥉"];
        const totalRevenue = Math.round(byRevenue.reduce((sum, c) => sum + c.revenue, 0) * 10) / 10;
        const totalProfit = Math.round(byProfit.reduce((sum, c) => sum + c.profit, 0) * 10) / 10;
        const renderCard = (title: string, ranked: { company: string; revenue: number; profit: number }[], total: number, color: string, valueKey: "revenue" | "profit") => (
          <div style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow, borderTop: `3px solid ${color}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{title}</h3>
              <span style={{ fontSize: 18, fontWeight: 700, color }}>{total > 0 ? fmtAmount(total) : "0"}万円</span>
            </div>
            {ranked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
              ranked.map((r, i) => (
                <div key={r.company} style={{ padding: "8px 0", borderBottom: `1px solid ${tc.borderLight || "#f0f2f5"}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, minWidth: 0 }}>
                      {i < 3 ? <span style={{ fontSize: 16, flexShrink: 0 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center", flexShrink: 0 }}>{i + 1}</span>}
                      <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{r.company}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color, flexShrink: 0, marginLeft: 8 }}>{fmtAmount(r[valueKey])}万円</span>
                  </div>
                </div>
              ))
            )}
          </div>
        );
        return (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
            {renderCard("当月受注企業売上", byRevenue, totalRevenue, "#e74c3c", "revenue")}
            {renderCard("当月受注企業粗利", byProfit, totalProfit, "#2ecc71", "profit")}
          </div>
        );
      })()}

      {monthlyMode === "amount" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
          {ACTIVITY_AMOUNT_FIELDS.map(af => {
            const medals = ["🥇", "🥈", "🥉"];
            const isCAField = af.key === "amountCA";
            const caSubs = ["プロパー", "BP", "フリーランス", "協業"];
            const getBudgetForField = (staff: string) => isCAField
              ? caSubs.reduce((sum, a) => sum + getStaffBudget(staff, `amountCA_${a}`), 0)
              : getStaffBudget(staff, af.key);
            const getCarryForField = (staff: string) => isCAField
              ? caSubs.reduce((sum, a) => sum + getStaffCarryover(staff, `amountCA_${a}`), 0)
              : getStaffCarryover(staff, af.key);
            const getMonthForField = (staff: string) => isCAField
              ? Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10
              : Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
            // 達成率ランキング
            const rateRanked = STAFF_LIST
              .map(staff => {
                const budget = getBudgetForField(staff);
                const carry = getCarryForField(staff);
                const month = getMonthForField(staff);
                const progress = carry + month;
                const rate = budget > 0 ? Math.round((progress / budget) * 1000) / 10 : 0;
                return { staff, rate, budget };
              })
              .filter(s => s.budget > 0)
              .sort((a, b) => b.rate - a.rate)
              .slice(0, 5);
            const allBudget = STAFF_LIST.reduce((sum, s) => sum + getBudgetForField(s), 0);
            const allProgress = STAFF_LIST.reduce((sum, s) => sum + getCarryForField(s) + getMonthForField(s), 0);
            const allRate = allBudget > 0 ? Math.round((allProgress / allBudget) * 1000) / 10 : 0;
            // 金額ランキング
            const amountRanked = STAFF_LIST
              .map(staff => ({ staff, total: getMonthForField(staff) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);
            const grandTotal = isCAField
              ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10
              : Math.round(getMonthGrandTotal(af.key) * 10) / 10;
            return (<>
              {/* 達成率カード */}
              <div key={af.key + "_rate"} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.key === "amountRA" ? "RA達成率" : "CA達成率"}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: allBudget > 0 ? getAchievementColor(allRate) : "#ccc" }}>{allBudget > 0 ? `${allRate.toFixed(1)}%` : "—"}</span>
                </div>
                {rateRanked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  rateRanked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: getAchievementColor(r.rate) }}>{r.rate.toFixed(1)}%</span>
                    </div>
                  ))
                )}
              </div>
              {/* 金額カード */}
              <div key={af.key + "_amount"} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.rankLabel}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: af.color }}>{grandTotal > 0 ? fmtAmount(grandTotal) : "0"}万円</span>
                </div>
                {amountRanked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  amountRanked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: af.color }}>{r.total > 0 ? fmtAmount(r.total) : "0"}万円</span>
                    </div>
                  ))
                )}
              </div>
            </>);
          })}
        </div>
      )}

      {/* 各指標ごとにテーブル（件数）— 面談設定数を先頭に */}
      {monthlyMode === "count" && [...ACTIVITY_FIELDS].sort((a, b) => a.targetType === "daily" ? -1 : b.targetType === "daily" ? 1 : 0).map(af => {
        const isDaily = af.targetType === "daily";
        const sortKeyMonth = af.key + "_cMonth";
        const sortKeyTarget = af.key + "_cTarget";
        const sortKeyRate = af.key + "_cRate";
        const allCountSortKeys = [sortKeyMonth, sortKeyTarget, sortKeyRate];
        const currentSortMonth = sortState[sortKeyMonth] || "none";
        const currentSortTarget = sortState[sortKeyTarget] || "none";
        const currentSortRate = sortState[sortKeyRate] || "none";
        const makeToggleC = (key: string, current: string) => () => {
          const reset: Record<string, "none"> = {};
          allCountSortKeys.forEach(k => { reset[k] = "none"; });
          setSortState(prev => ({ ...prev, ...reset, [key]: current === "none" ? "desc" : current === "desc" ? "asc" : "none" }));
        };
        const toggleSortMonth = makeToggleC(sortKeyMonth, currentSortMonth);
        const toggleSortTarget = makeToggleC(sortKeyTarget, currentSortTarget);
        const toggleSortRate = makeToggleC(sortKeyRate, currentSortRate);
        const sortIconC = (s: string) => s === "asc" ? "▲" : s === "desc" ? "▼" : "⇅";

        // ソート
        let sortedStaff = [...STAFF_LIST];
        if (currentSortMonth !== "none") {
          sortedStaff.sort((a, b) => {
            const av = getStaffMonthTotal(a, af.key), bv = getStaffMonthTotal(b, af.key);
            return currentSortMonth === "asc" ? av - bv : bv - av;
          });
        } else if (currentSortTarget !== "none") {
          sortedStaff.sort((a, b) => {
            const av = getCountTarget(a, af.key), bv = getCountTarget(b, af.key);
            return currentSortTarget === "asc" ? av - bv : bv - av;
          });
        } else if (currentSortRate !== "none" && !isDaily) {
          sortedStaff.sort((a, b) => {
            const isCA = af.key === "ordersCA";
            const caSubs = ["プロパー", "BP", "フリーランス", "協業"];
            const aT = isCA ? caSubs.reduce((s, sub) => s + getCountTarget(a, `ordersCA_${sub}`), 0) : getCountTarget(a, af.key);
            const bT = isCA ? caSubs.reduce((s, sub) => s + getCountTarget(b, `ordersCA_${sub}`), 0) : getCountTarget(b, af.key);
            const aCarry = isCA ? caSubs.reduce((s, sub) => s + getCountCarryover(a, `ordersCA_${sub}`), 0) : 0;
            const bCarry = isCA ? caSubs.reduce((s, sub) => s + getCountCarryover(b, `ordersCA_${sub}`), 0) : 0;
            const aR = aT > 0 ? ((getStaffMonthTotal(a, af.key) + aCarry) / aT) * 100 : 0;
            const bR = bT > 0 ? ((getStaffMonthTotal(b, af.key) + bCarry) / bT) * 100 : 0;
            return currentSortRate === "asc" ? aR - bR : bR - aR;
          });
        }

        const isCACount = af.key === "ordersCA";
        const caCountSubs = ["プロパー", "BP", "フリーランス", "協業"];

        return (
        <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow, marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: af.color, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: af.color, display: "inline-block" }} />
            {af.label}
            <span style={{ fontSize: 13, color: tc.textMuted, fontWeight: 400, marginLeft: 8 }}>月合計: {getMonthGrandTotal(af.key)}</span>
          </h3>
          {isCACount && (
            <label style={{ fontSize: 12, fontWeight: 500, color: tc.textSecondary, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={caCountTotalOnly} onChange={(e) => setCaCountTotalOnly(e.target.checked)} style={{ cursor: "pointer" }} />
              計のみ表示
            </label>
          )}
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, minWidth: 70 }}>担当</th>
                {isCACount && !caCountTotalOnly && <th style={{ ...headerCellStyle, minWidth: 70 }}>所属</th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortTarget}>
                  {isDaily ? "日目標" : "目標"} {sortIconC(currentSortTarget)}
                </th>
                {isCACount && !isDaily && <th style={{ ...headerCellStyle, background: isDark ? "#1a3a4a" : "#d1ecf1", minWidth: 50 }}>進捗</th>}
                {!isDaily && (
                  <th style={{ ...headerCellStyle, background: hdrGreen, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortRate}>
                    達成率 {sortIconC(currentSortRate)}
                  </th>
                )}
                {isCACount && !isDaily && <th style={{ ...headerCellStyle, background: isDark ? "#2d1a3a" : "#e8d5f5", minWidth: 60 }}>{countCarryoverLabel}</th>}
                <th style={{ ...headerCellStyle, background: hdrBlue, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortMonth}>
                  月計 {sortIconC(currentSortMonth)}
                </th>
                {days.map(day => (
                  <th key={day.d} style={{ ...headerCellStyle, color: day.isRed ? "#e63946" : tc.text, minWidth: 36 }} title={day.holiday || ""}>
                    {day.d}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, fontSize: 10, padding: "2px 6px" }}></th>
                {isCACount && !caCountTotalOnly && <th style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px" }}></th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, fontSize: 10, padding: "2px 6px" }}>{isDaily ? "/日" : "件"}</th>
                {isCACount && !isDaily && <th style={{ ...headerCellStyle, background: isDark ? "#1a3a4a" : "#d1ecf1", fontSize: 10, padding: "2px 6px" }}>件</th>}
                {!isDaily && <th style={{ ...headerCellStyle, background: hdrGreen, fontSize: 10, padding: "2px 6px" }}>%</th>}
                {isCACount && !isDaily && <th style={{ ...headerCellStyle, background: isDark ? "#2d1a3a" : "#e8d5f5", fontSize: 10, padding: "2px 6px" }}>件</th>}
                <th style={{ ...headerCellStyle, background: hdrBlue, fontSize: 10, padding: "2px 6px" }}></th>
                {days.map(day => (
                  <th key={`dow-${day.d}`} style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px", color: day.isRed ? "#e63946" : tc.textMuted }}>
                    {day.holiday ? "祝" : day.dowLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staff, idx) => {
                const monthTotal = getStaffMonthTotal(staff, af.key);
                const target = getCountTarget(staff, af.key);
                const rowBg = idx % 2 === 1 ? rowOdd : rowEven;
                const isEditingTarget = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "countTarget";
                // 月目標の達成率
                const monthRate = (!isDaily && target > 0) ? Math.round((monthTotal / target) * 1000) / 10 : 0;

                if (isCACount) {
                  const subRowCount = caCountTotalOnly ? 1 : 5;
                  const borderBottom = caCountTotalOnly ? undefined : "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  const totalTargetAll = caCountSubs.reduce((sum, sub) => sum + getCountTarget(staff, `ordersCA_${sub}`), 0);
                  const totalRateAll = totalTargetAll > 0 ? Math.round((monthTotal / totalTargetAll) * 1000) / 10 : 0;

                  if (caCountTotalOnly) {
                    const totalCarryoverAll = caCountSubs.reduce((sum, sub) => sum + getCountCarryover(staff, `ordersCA_${sub}`), 0);
                    const totalProgressAll = totalCarryoverAll + monthTotal;
                    const totalRateAllNew = totalTargetAll > 0 ? Math.round((totalProgressAll / totalTargetAll) * 1000) / 10 : 0;
                    return (
                      <tr key={staff} style={{ background: rowBg }}>
                        <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0") }}>
                          <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalTargetAll > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                            {totalTargetAll > 0 ? totalTargetAll : "\u2014"}
                          </span>
                        </td>
                        {!isDaily && <td style={{ ...cellStyle, fontWeight: 700, color: totalProgressAll > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a3a4a" : "#1e4050") : (idx % 2 === 1 ? "#d1ecf1" : "#d8f0f5"), textAlign: "right" }}>{totalProgressAll > 0 ? totalProgressAll : "\u2014"}</td>}
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalTargetAll > 0 ? getAchievementColor(totalRateAllNew) : "#ccc", background: totalTargetAll > 0 ? getAchievementBg(totalRateAllNew) : undefined, textAlign: "right" }}>
                          {totalTargetAll > 0 ? `${totalRateAllNew.toFixed(1)}%` : "\u2014"}
                        </td>
                        {!isDaily && <td style={{ ...cellStyle, fontWeight: 700, color: totalCarryoverAll > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#2d1a3a" : "#331e42") : (idx % 2 === 1 ? "#e8d5f5" : "#f0e0fa"), textAlign: "right" }}>{totalCarryoverAll > 0 ? totalCarryoverAll : "\u2014"}</td>}
                        <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{monthTotal}</td>
                        {days.map(day => {
                          const val = getStaffDayValue(staff, day.key, af.key);
                          return (
                            <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                              {val || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <Fragment key={staff}>
                      {caCountSubs.map((sub, subIdx) => {
                        const subTarget = getCountTarget(staff, `ordersCA_${sub}`);
                        const subMonthTotal = getStaffMonthCACountByAffiliation(staff, sub);
                        const subCarryover = getCountCarryover(staff, `ordersCA_${sub}`);
                        const subProgress = subCarryover + subMonthTotal;
                        const subRate = subTarget > 0 ? Math.round((subProgress / subTarget) * 1000) / 10 : 0;
                        const isEditingSub = editingCell?.staff === staff && editingCell?.field === `ordersCA_${sub}` && editingCell?.type === "countTarget";
                        const isEditingCarryover = editingCell?.staff === staff && editingCell?.field === `ordersCA_${sub}` && editingCell?.type === "countCarryover";
                        return (
                          <tr key={`${staff}-${sub}`} style={{ background: rowBg }}>
                            {subIdx === 0 && (
                              <td rowSpan={subRowCount} style={{ ...staffCellStyle, background: rowBg, borderBottom, verticalAlign: "middle" }}>{staff}</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                              {sub}
                            </td>
                            {/* 目標（編集可能） */}
                            <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 50, padding: 0, borderBottom: dashBorder }}
                              onClick={() => { if (!isEditingSub) { setEditingCell({ staff, field: `ordersCA_${sub}`, type: "countTarget" }); setEditingCellValue(subTarget ? String(subTarget) : ""); } }}>
                              {isEditingSub ? (
                                <input type="text" inputMode="numeric" autoFocus value={editingCellValue}
                                  onChange={(e) => { const v = e.target.value; if (/^\d{0,5}$/.test(v) || v === "") setEditingCellValue(v); }}
                                  onBlur={() => { saveCountTarget(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { saveCountTarget(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                  style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }} />
                              ) : (
                                <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: subTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                  {subTarget > 0 ? subTarget : "—"}
                                </span>
                              )}
                            </td>
                            {/* 進捗 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subProgress > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a3a4a" : "#1e4050") : (idx % 2 === 1 ? "#d1ecf1" : "#d8f0f5"), borderBottom: dashBorder, textAlign: "right" }}>
                              {subProgress > 0 ? subProgress : "\u2014"}
                            </td>
                            {/* 達成率 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subTarget > 0 ? getAchievementColor(subRate) : "#ccc", background: subTarget > 0 ? getAchievementBg(subRate) : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            {/* 繰越件数（編集可能） */}
                            <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d1a3a" : "#331e42") : (idx % 2 === 1 ? "#e8d5f5" : "#f0e0fa"), cursor: "pointer", minWidth: 50, padding: 0, borderBottom: dashBorder }}
                              onClick={() => { if (!isEditingCarryover) { setEditingCell({ staff, field: `ordersCA_${sub}`, type: "countCarryover" }); setEditingCellValue(subCarryover ? String(subCarryover) : ""); } }}>
                              {isEditingCarryover ? (
                                <input type="text" inputMode="numeric" autoFocus value={editingCellValue}
                                  onChange={(e) => { const v = e.target.value; if (/^\d{0,5}$/.test(v) || v === "") setEditingCellValue(v); }}
                                  onBlur={() => { saveCountCarryover(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { saveCountCarryover(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                  style={{ width: "100%", border: "2px solid #7c3aed", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#f8f0ff", boxSizing: "border-box" }} />
                              ) : (
                                <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: subCarryover > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled }}>
                                  {subCarryover > 0 ? subCarryover : "\u2014"}
                                </span>
                              )}
                            </td>
                            {/* 月計 */}
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonthTotal > 0 ? subColor : tc.textDisabled, fontSize: 11, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom: dashBorder, textAlign: "right" }}>
                              {subMonthTotal > 0 ? subMonthTotal : "-"}
                            </td>
                            {/* 日付セル */}
                            {days.map(day => {
                              const val = getStaffDayCACountByAffiliation(staff, day.key, sub);
                              return (
                                <td key={day.d} style={{ ...cellStyle, color: val > 0 ? subColor : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 600 : 400, fontSize: 11, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                  {val || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const totalTarget = caCountSubs.reduce((sum, sub) => sum + getCountTarget(staff, `ordersCA_${sub}`), 0);
                        const totalCarryover = caCountSubs.reduce((sum, sub) => sum + getCountCarryover(staff, `ordersCA_${sub}`), 0);
                        const totalProgress = totalCarryover + monthTotal;
                        const totalRate = totalTarget > 0 ? Math.round((totalProgress / totalTarget) * 1000) / 10 : 0;
                        return (
                          <tr key={`${staff}-total`} style={{ background: rowBg, borderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom }}>計</td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), borderBottom }}>
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                {totalTarget > 0 ? totalTarget : "—"}
                              </span>
                            </td>
                            {/* 進捗 */}
                            <td style={{ ...cellStyle, fontWeight: 700, color: totalProgress > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a3a4a" : "#1e4050") : (idx % 2 === 1 ? "#d1ecf1" : "#d8f0f5"), borderBottom, textAlign: "right" }}>{totalProgress > 0 ? totalProgress : "\u2014"}</td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: totalTarget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalTarget > 0 ? getAchievementBg(totalRate) : undefined, borderBottom, textAlign: "right" }}>
                              {totalTarget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                            </td>
                            {/* 稼働件数 */}
                            <td style={{ ...cellStyle, fontWeight: 700, color: totalCarryover > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#2d1a3a" : "#331e42") : (idx % 2 === 1 ? "#e8d5f5" : "#f0e0fa"), borderBottom, textAlign: "right" }}>{totalCarryover > 0 ? totalCarryover : "\u2014"}</td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom, textAlign: "right" }}>{monthTotal}</td>
                            {days.map(day => {
                              const val = getStaffDayValue(staff, day.key, af.key);
                              return (
                                <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom, textAlign: "right" }}>
                                  {val || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </Fragment>
                  );
                }

                return (
                  <tr key={staff} style={{ background: rowBg }}>
                    <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                    {/* 目標（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 50, padding: 0 }}
                      onClick={() => { if (!isEditingTarget) { setEditingCell({ staff, field: af.key, type: "countTarget" }); setEditingCellValue(target ? String(target) : ""); } }}>
                      {isEditingTarget ? (
                        <input type="text" inputMode="numeric" autoFocus value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,5}$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { saveCountTarget(af.key, staff, parseInt(editingCellValue) || 0); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { saveCountTarget(af.key, staff, parseInt(editingCellValue) || 0); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: target > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {target > 0 ? target : "—"}
                        </span>
                      )}
                    </td>
                    {/* 達成率（月目標のみ） */}
                    {!isDaily && (
                      <td style={{ ...cellStyle, fontWeight: 700, color: target > 0 ? getAchievementColor(monthRate) : "#ccc", background: target > 0 ? getAchievementBg(monthRate) : undefined, textAlign: "right" }}>
                        {target > 0 ? `${monthRate.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {/* 月計 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{monthTotal}</td>
                    {/* 日付セル */}
                    {days.map(day => {
                      const val = getStaffDayValue(staff, day.key, af.key);
                      if (isDaily) {
                        // 日目標：件数のみ表示、日目標があれば達成率色を適用
                        const dayTarget = getDailyTarget(staff, af.key, day.key) || target;
                        const dayRate = dayTarget > 0 && val > 0 ? Math.round((val / dayTarget) * 1000) / 10 : 0;
                        const hasDayTarget = dayTarget > 0;
                        const cellBg = day.isRed ? "#fef8f8" : (hasDayTarget && val > 0 ? getAchievementBg(dayRate) : undefined);
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: val > 0 ? (hasDayTarget ? getAchievementColor(dayRate) : af.color) : "#ddd", fontWeight: val > 0 ? 700 : 400, background: cellBg, textAlign: "right" }}>
                            {val || "-"}
                          </td>
                        );
                      } else {
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : "#ddd", fontWeight: val > 0 ? 700 : 400, background: day.isRed ? "#fef8f8" : undefined, textAlign: "right" }}>
                            {val || "-"}
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
              {/* 合計行 */}
              {(() => {
                if (isCACount) {
                  const totalBorderBottom = "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  const gTarget = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountTarget(s, `ordersCA_${sub}`), 0), 0);
                  const gMonth = getMonthGrandTotal(af.key);
                  const gCarryover = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountCarryover(s, `ordersCA_${sub}`), 0), 0);
                  const gProgress = gCarryover + gMonth;
                  const gRate = gTarget > 0 ? Math.round((gProgress / gTarget) * 1000) / 10 : 0;

                  if (caCountTotalOnly) {
                    return (
                      <tr style={{ background: tc.bgSection }}>
                        <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: gTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, textAlign: "right" }}>{gTarget > 0 ? gTarget : "\u2014"}</td>
                        {!isDaily && <td style={{ ...cellStyle, fontWeight: 700, color: gProgress > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? "#1a3a4a" : "#d1ecf1", textAlign: "right" }}>{gProgress > 0 ? gProgress : "\u2014"}</td>}
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>{gTarget > 0 ? <span style={{ color: getAchievementColor(gRate) }}>{gRate.toFixed(1)}%</span> : "\u2014"}</td>
                        {!isDaily && <td style={{ ...cellStyle, fontWeight: 700, color: gCarryover > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled, background: isDark ? "#2d1a3a" : "#e8d5f5", textAlign: "right" }}>{gCarryover > 0 ? gCarryover : "\u2014"}</td>}
                        <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{gMonth}</td>
                        {days.map(day => {
                          const dayTotal = getDayTotal(day.key, af.key);
                          return (
                            <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                              {dayTotal || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <>
                      {caCountSubs.map((sub, subIdx) => {
                        const subTarget = STAFF_LIST.reduce((sum, s) => sum + getCountTarget(s, `ordersCA_${sub}`), 0);
                        const subMonth = STAFF_LIST.reduce((sum, s) => sum + getStaffMonthCACountByAffiliation(s, sub), 0);
                        const subCarryoverGrand = STAFF_LIST.reduce((sum, s) => sum + getCountCarryover(s, `ordersCA_${sub}`), 0);
                        const subProgressGrand = subCarryoverGrand + subMonth;
                        const subRate = subTarget > 0 ? Math.round((subProgressGrand / subTarget) * 1000) / 10 : 0;
                        return (
                          <tr key={`grand-${sub}`} style={{ background: tc.bgSection }}>
                            {subIdx === 0 && (
                              <td rowSpan={5} style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection, verticalAlign: "middle", borderBottom: totalBorderBottom }}>合計</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>{sub}</td>
                            {/* 目標 */}
                            <td style={{ ...cellStyle, fontWeight: 600, color: subTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? subTarget : "—"}
                            </td>
                            {/* 進捗 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subProgressGrand > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? "#1a3a4a" : "#d1ecf1", borderBottom: dashBorder, textAlign: "right" }}>
                              {subProgressGrand > 0 ? subProgressGrand : "\u2014"}
                            </td>
                            {/* 達成率 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subTarget > 0 ? getAchievementColor(subRate) : "#ccc", background: subTarget > 0 ? getAchievementBg(subRate) : hdrGreen, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            {/* 稼働件数 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subCarryoverGrand > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled, background: isDark ? "#2d1a3a" : "#e8d5f5", borderBottom: dashBorder, textAlign: "right" }}>
                              {subCarryoverGrand > 0 ? subCarryoverGrand : "\u2014"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonth > 0 ? subColor : tc.textDisabled, background: hdrBlue, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {subMonth > 0 ? subMonth : "-"}
                            </td>
                            {days.map(day => {
                              const dayVal = STAFF_LIST.reduce((sum, s) => sum + getStaffDayCACountByAffiliation(s, day.key, sub), 0);
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: dayVal > 0 ? subColor : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: dashBorder, textAlign: "right" }}>
                                  {dayVal || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const grandTarget = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountTarget(s, `ordersCA_${sub}`), 0), 0);
                        const grandMonth = getMonthGrandTotal(af.key);
                        const grandCarryover = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountCarryover(s, `ordersCA_${sub}`), 0), 0);
                        const grandProgress = grandCarryover + grandMonth;
                        const grandRate = grandTarget > 0 ? Math.round((grandProgress / grandTarget) * 1000) / 10 : 0;
                        return (
                          <tr style={{ background: tc.bgSection, borderBottom: totalBorderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: totalBorderBottom }}>計</td>
                            {/* 目標 */}
                            <td style={{ ...cellStyle, fontWeight: 700, color: grandTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandTarget > 0 ? grandTarget : "—"}
                            </td>
                            {/* 進捗 */}
                            <td style={{ ...cellStyle, fontWeight: 700, color: grandProgress > 0 ? (isDark ? "#17a2b8" : "#0c5460") : tc.textDisabled, background: isDark ? "#1a3a4a" : "#d1ecf1", borderBottom: totalBorderBottom, textAlign: "right" }}>{grandProgress > 0 ? grandProgress : "\u2014"}</td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandTarget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                            </td>
                            {/* 稼働件数 */}
                            <td style={{ ...cellStyle, fontWeight: 700, color: grandCarryover > 0 ? (isDark ? "#b794f4" : "#6f42c1") : tc.textDisabled, background: isDark ? "#2d1a3a" : "#e8d5f5", borderBottom: totalBorderBottom, textAlign: "right" }}>{grandCarryover > 0 ? grandCarryover : "\u2014"}</td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, borderBottom: totalBorderBottom, textAlign: "right" }}>{grandMonth}</td>
                            {days.map(day => {
                              const dayTotal = getDayTotal(day.key, af.key);
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: totalBorderBottom, textAlign: "right" }}>
                                  {dayTotal || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </>
                  );
                } else {
                  // RA等: 従来通り1行
                  const totalTarget = STAFF_LIST.reduce((sum, s) => sum + getCountTarget(s, af.key), 0);
                  const totalMonth = getMonthGrandTotal(af.key);
                  const totalRate = totalTarget > 0 ? Math.round((totalMonth / totalTarget) * 1000) / 10 : 0;
                  return (
                    <tr style={{ background: tc.bgSection }}>
                      <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, textAlign: "right" }}>
                        {totalTarget > 0 ? totalTarget : "—"}
                      </td>
                      {!isDaily && (
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                          {totalTarget > 0 ? <span style={{ color: getAchievementColor(totalRate) }}>{totalRate.toFixed(1)}%</span> : "—"}
                        </td>
                      )}
                      <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{totalMonth}</td>
                      {days.map(day => {
                        const dayTotal = getDayTotal(day.key, af.key);
                        return (
                          <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                            {dayTotal || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
        );
      })}

      {/* 金額テーブル（新仕様：担当→予算→進捗→達成率→前月繰越→月計→日付） */}
      {monthlyMode === "amount" && ACTIVITY_AMOUNT_FIELDS.map(af => {
        const sortKeyBudget = af.key + "_budget";
        const sortKeyProgress = af.key + "_progress";
        const sortKeyRate = af.key + "_rate";
        const sortKeyCarryover = af.key + "_carryover";
        const sortKeyMonth = af.key + "_month";
        const allAmountSortKeys = [sortKeyBudget, sortKeyProgress, sortKeyRate, sortKeyCarryover, sortKeyMonth];
        const currentSortBudget = sortState[sortKeyBudget] || "none";
        const currentSortProgress = sortState[sortKeyProgress] || "none";
        const currentSortRate = sortState[sortKeyRate] || "none";
        const currentSortCarryover = sortState[sortKeyCarryover] || "none";
        const currentSortMonth = sortState[sortKeyMonth] || "none";
        const makeToggle = (key: string, current: string) => () => {
          const reset: Record<string, "none"> = {};
          allAmountSortKeys.forEach(k => { reset[k] = "none"; });
          setSortState(prev => ({ ...prev, ...reset, [key]: current === "none" ? "desc" : current === "desc" ? "asc" : "none" }));
        };
        const toggleSortBudget = makeToggle(sortKeyBudget, currentSortBudget);
        const toggleSortProgress = makeToggle(sortKeyProgress, currentSortProgress);
        const toggleSortRate = makeToggle(sortKeyRate, currentSortRate);
        const toggleSortCarryover = makeToggle(sortKeyCarryover, currentSortCarryover);
        const toggleSortMonth = makeToggle(sortKeyMonth, currentSortMonth);
        const sortIcon = (s: string) => s === "asc" ? "▲" : s === "desc" ? "▼" : "⇅";

        // ソート対象を決定
        let sortedStaff = [...STAFF_LIST];
        const isCATable = af.key === "amountCA";
        const caAffiliations = ["プロパー", "BP", "フリーランス", "協業"];
        const getTableBudget = (staff: string) => isCATable
          ? caAffiliations.reduce((sum, a) => sum + getStaffBudget(staff, `amountCA_${a}`), 0)
          : getStaffBudget(staff, af.key);
        const getTableCarry = (staff: string) => isCATable
          ? caAffiliations.reduce((sum, a) => sum + getStaffCarryover(staff, `amountCA_${a}`), 0)
          : getStaffCarryover(staff, af.key);
        const getTableMonth = (staff: string) => isCATable
          ? Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10
          : Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
        const getProgress = (staff: string) => {
          const c = getTableCarry(staff);
          const m = getTableMonth(staff);
          return Math.round((c + m) * 10) / 10;
        };
        const getRate = (staff: string) => {
          const b = getTableBudget(staff);
          return b > 0 ? (getProgress(staff) / b) * 100 : 0;
        };
        if (currentSortBudget !== "none") {
          sortedStaff.sort((a, b) => currentSortBudget === "asc" ? getTableBudget(a) - getTableBudget(b) : getTableBudget(b) - getTableBudget(a));
        } else if (currentSortProgress !== "none") {
          sortedStaff.sort((a, b) => currentSortProgress === "asc" ? getProgress(a) - getProgress(b) : getProgress(b) - getProgress(a));
        } else if (currentSortRate !== "none") {
          sortedStaff.sort((a, b) => currentSortRate === "asc" ? getRate(a) - getRate(b) : getRate(b) - getRate(a));
        } else if (currentSortCarryover !== "none") {
          sortedStaff.sort((a, b) => currentSortCarryover === "asc" ? getTableCarry(a) - getTableCarry(b) : getTableCarry(b) - getTableCarry(a));
        } else if (currentSortMonth !== "none") {
          sortedStaff.sort((a, b) => currentSortMonth === "asc" ? getTableMonth(a) - getTableMonth(b) : getTableMonth(b) - getTableMonth(a));
        }

        return (
        <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow, marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: af.color, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: af.color, display: "inline-block" }} />
            {af.tableLabel}
            {(() => {
              const totalCarry = isCATable
                ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getTableCarry(s), 0) * 10) / 10
                : Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, af.key), 0) * 10) / 10;
              const totalMonth = isCATable
                ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10
                : Math.round(getMonthGrandTotal(af.key) * 10) / 10;
              const totalProgress = Math.round((totalCarry + totalMonth) * 10) / 10;
              return (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#93c5fd" : "#1e40af", marginLeft: 8 }}>進捗: {totalProgress > 0 ? fmtAmount(totalProgress) : "0"}万円</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: af.color }}>今月新規: {totalMonth > 0 ? fmtAmount(totalMonth) : "0"}万円</span>
                </>
              );
            })()}
          </h3>
          {isCATable && (
            <label style={{ fontSize: 12, fontWeight: 500, color: tc.textSecondary, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={caAmountTotalOnly} onChange={(e) => setCaAmountTotalOnly(e.target.checked)} style={{ cursor: "pointer" }} />
              計のみ表示
            </label>
          )}
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, minWidth: 70 }}>担当</th>
                {isCATable && !caAmountTotalOnly && <th style={{ ...headerCellStyle, minWidth: 70 }}>所属</th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortBudget}>
                  予算 {sortIcon(currentSortBudget)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrBlueAlt, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortProgress}>
                  進捗 {sortIcon(currentSortProgress)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrGreen, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortRate}>
                  達成率 {sortIcon(currentSortRate)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrGray, minWidth: 90, cursor: "pointer", userSelect: "none" }} onClick={toggleSortCarryover}>
                  {carryoverLabel} {sortIcon(currentSortCarryover)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrBlue, minWidth: 80, cursor: "pointer", userSelect: "none" }} onClick={toggleSortMonth}>
                  {monthlyAmountLabel} {sortIcon(currentSortMonth)}
                </th>
                {days.map(day => (
                  <th key={day.d} style={{ ...headerCellStyle, color: day.isRed ? "#e63946" : tc.text, minWidth: 46 }} title={day.holiday || ""}>
                    {day.d}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, fontSize: 10, padding: "2px 6px" }}></th>
                {isCATable && !caAmountTotalOnly && <th style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px" }}></th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrBlueAlt, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrGreen, fontSize: 10, padding: "2px 6px" }}>%</th>
                <th style={{ ...headerCellStyle, background: hdrGray, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrBlue, fontSize: 10, padding: "2px 6px" }}>万円</th>
                {days.map(day => (
                  <th key={`dow-${day.d}`} style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px", color: day.isRed ? "#e63946" : tc.textMuted }}>
                    {day.holiday ? "祝" : day.dowLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staff, idx) => {
                const monthTotal = Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
                const budget = getStaffBudget(staff, af.key);
                const carryover = getStaffCarryover(staff, af.key);
                const progress = Math.round((carryover + monthTotal) * 10) / 10;
                const achievementRate = budget > 0 ? Math.round((progress / budget) * 1000) / 10 : 0;
                const rowBg = idx % 2 === 1 ? rowOdd : rowEven;
                const isEditingBudget = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "budget";
                const isEditingCarryover = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "carryover";
                const caSubTypes = isCATable ? [
                  { label: "プロパー", affiliation: "プロパー" },
                  { label: "BP", affiliation: "BP" },
                  { label: "フリーランス", affiliation: "フリーランス" },
                  { label: "協業", affiliation: "協業" },
                ] : [];
                const subRowCount = isCATable ? 5 : 1;
                const borderBottom = isCATable ? "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0") : undefined;
                return isCATable ? (
                  caAmountTotalOnly ? (
                    (() => {
                      const totalBudget = Math.round((getStaffBudget(staff, "amountCA_プロパー") + getStaffBudget(staff, "amountCA_BP") + getStaffBudget(staff, "amountCA_フリーランス") + getStaffBudget(staff, "amountCA_協業")) * 10) / 10;
                      const totalCarryover = Math.round((getStaffCarryover(staff, "amountCA_プロパー") + getStaffCarryover(staff, "amountCA_BP") + getStaffCarryover(staff, "amountCA_フリーランス") + getStaffCarryover(staff, "amountCA_協業")) * 10) / 10;
                      const totalMonth = Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10;
                      const totalProgress = Math.round((totalCarryover + totalMonth) * 10) / 10;
                      const totalRate = totalBudget > 0 ? Math.round((totalProgress / totalBudget) * 1000) / 10 : 0;
                      return (
                        <tr key={staff} style={{ background: rowBg }}>
                          <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                          <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), textAlign: "right" }}>
                            <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                              {fmtAmount(totalBudget)}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), textAlign: "right" }}>
                            {fmtAmount(totalProgress)}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalBudget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalBudget > 0 ? getAchievementBg(totalRate) : undefined, textAlign: "right" }}>
                            {totalBudget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), textAlign: "right" }}>
                            <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalCarryover > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(totalCarryover)}</span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalMonth > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{fmtAmount(totalMonth)}</td>
                          {days.map(day => {
                            const val = getStaffDayAmountTotal(staff, day.key, "ca");
                            const rounded = Math.round(val * 10) / 10;
                            return (
                              <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                                {rounded > 0 ? fmtAmount(rounded) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })()
                  ) : (
                  <Fragment key={staff}>
                    {/* プロパー/BP/フリーランス sub-rows */}
                    {caSubTypes.map((sub, subIdx) => {
                      const subMonthTotal = Math.round(getStaffMonthAmountByAffiliation(staff, "ca", sub.affiliation) * 10) / 10;
                      const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                      const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                      return (
                        <tr key={`${staff}-${sub.label}`} style={{ background: rowBg }}>
                          {subIdx === 0 && (
                            <td rowSpan={subRowCount} style={{ ...staffCellStyle, background: rowBg, borderBottom, verticalAlign: "middle" }}>{staff}</td>
                          )}
                          <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                            {sub.label}
                          </td>
                          <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 70, padding: 0, borderBottom: dashBorder, textAlign: "right" }}
                            onClick={() => { if (!isEditingBudget) { setEditingCell({ staff, field: `amountCA_${sub.affiliation}`, type: "budget" }); setEditingCellValue(getStaffBudget(staff, `amountCA_${sub.affiliation}`) ? String(getStaffBudget(staff, `amountCA_${sub.affiliation}`)) : ""); } }}>
                            {editingCell?.staff === staff && editingCell?.field === `amountCA_${sub.affiliation}` && editingCell?.type === "budget" ? (
                              <input type="text" inputMode="decimal" autoFocus value={editingCellValue}
                                onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                                onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveBudget(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveBudget(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }} />
                            ) : (
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: getStaffBudget(staff, `amountCA_${sub.affiliation}`) > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                {fmtAmount(getStaffBudget(staff, `amountCA_${sub.affiliation}`))}
                              </span>
                            )}
                          </td>
                          {(() => {
                            const subBudget = getStaffBudget(staff, `amountCA_${sub.affiliation}`);
                            const subCarryover = getStaffCarryover(staff, `amountCA_${sub.affiliation}`);
                            const subProgress = Math.round((subCarryover + subMonthTotal) * 10) / 10;
                            const subRate = subBudget > 0 ? Math.round((subProgress / subBudget) * 1000) / 10 : 0;
                            return (
                              <>
                                <td style={{ ...cellStyle, fontWeight: 600, color: subProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), borderBottom: dashBorder, fontSize: 11, textAlign: "right" }}>
                                  {fmtAmount(subProgress)}
                                </td>
                                <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subBudget > 0 ? getAchievementColor(subRate) : "#ccc", background: subBudget > 0 ? getAchievementBg(subRate) : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                  {subBudget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                                </td>
                              </>
                            );
                          })()}
                          <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), cursor: "pointer", minWidth: 70, padding: 0, borderBottom: dashBorder, textAlign: "right" }}
                            onClick={() => { if (!isEditingCarryover) { setEditingCell({ staff, field: `amountCA_${sub.affiliation}`, type: "carryover" }); setEditingCellValue(getStaffCarryover(staff, `amountCA_${sub.affiliation}`) ? String(getStaffCarryover(staff, `amountCA_${sub.affiliation}`)) : ""); } }}>
                            {editingCell?.staff === staff && editingCell?.field === `amountCA_${sub.affiliation}` && editingCell?.type === "carryover" ? (
                              <input type="text" inputMode="decimal" autoFocus value={editingCellValue}
                                onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                                onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveCarryover(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveCarryover(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                style={{ width: "100%", border: "2px solid #6c757d", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#f8f9fa", boxSizing: "border-box" }} />
                            ) : (
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: getStaffCarryover(staff, `amountCA_${sub.affiliation}`) > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(getStaffCarryover(staff, `amountCA_${sub.affiliation}`))}</span>
                            )}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 600, color: subMonthTotal > 0 ? subColor : tc.textDisabled, fontSize: 11, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom: dashBorder, textAlign: "right" }}>
                            {fmtAmount(subMonthTotal)}
                          </td>
                          {days.map(day => {
                            const val = getStaffDayAmountByAffiliation(staff, day.key, "ca", sub.affiliation);
                            const rounded = Math.round(val * 10) / 10;
                            return (
                              <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? subColor : tc.textDisabled, fontWeight: rounded > 0 ? 600 : 400, fontSize: 11, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                {rounded > 0 ? fmtAmount(rounded) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* 計 sub-row */}
                    {(() => {
                      const totalBudget = Math.round((getStaffBudget(staff, "amountCA_プロパー") + getStaffBudget(staff, "amountCA_BP") + getStaffBudget(staff, "amountCA_フリーランス") + getStaffBudget(staff, "amountCA_協業")) * 10) / 10;
                      const totalCarryover = Math.round((getStaffCarryover(staff, "amountCA_プロパー") + getStaffCarryover(staff, "amountCA_BP") + getStaffCarryover(staff, "amountCA_フリーランス") + getStaffCarryover(staff, "amountCA_協業")) * 10) / 10;
                      const totalMonth = Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10;
                      const totalProgress = Math.round((totalCarryover + totalMonth) * 10) / 10;
                      const totalRate = totalBudget > 0 ? Math.round((totalProgress / totalBudget) * 1000) / 10 : 0;
                      return (
                    <tr key={`${staff}-total`} style={{ background: rowBg, borderBottom }}>
                      <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom }}>
                        計
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), borderBottom, textAlign: "right" }}>
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {fmtAmount(totalBudget)}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), borderBottom, textAlign: "right" }}>
                        {fmtAmount(totalProgress)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalBudget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalBudget > 0 ? getAchievementBg(totalRate) : undefined, borderBottom, textAlign: "right" }}>
                        {totalBudget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), borderBottom, textAlign: "right" }}>
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalCarryover > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(totalCarryover)}</span>
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalMonth > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom, textAlign: "right" }}>{fmtAmount(totalMonth)}</td>
                      {days.map(day => {
                        const val = getStaffDayAmountTotal(staff, day.key, "ca");
                        const rounded = Math.round(val * 10) / 10;
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom, textAlign: "right" }}>
                            {rounded > 0 ? fmtAmount(rounded) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                      );
                    })()}
                  </Fragment>
                  )
                ) : (
                  <tr key={staff} style={{ background: rowBg }}>
                    <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                    {/* 予算（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 70, padding: 0 }}
                      onClick={() => { if (!isEditingBudget) { setEditingCell({ staff, field: af.key, type: "budget" }); setEditingCellValue(budget ? String(budget) : ""); } }}>
                      {isEditingBudget ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveBudget(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveBudget(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: budget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {fmtAmount(budget)}
                        </span>
                      )}
                    </td>
                    {/* 進捗（前月繰越 + 月計） */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: progress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), textAlign: "right" }}>
                      {fmtAmount(progress)}
                    </td>
                    {/* 達成率 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: budget > 0 ? getAchievementColor(achievementRate) : "#ccc", background: budget > 0 ? getAchievementBg(achievementRate) : undefined, textAlign: "right" }}>
                      {budget > 0 ? `${achievementRate.toFixed(1)}%` : "—"}
                    </td>
                    {/* 前月繰越（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), cursor: "pointer", minWidth: 70, padding: 0, textAlign: "right" }}
                      onClick={() => { if (!isEditingCarryover) { setEditingCell({ staff, field: af.key, type: "carryover" }); setEditingCellValue(carryover ? String(carryover) : ""); } }}>
                      {isEditingCarryover ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveCarryover(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveCarryover(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #6c757d", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#f8f9fa", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: carryover > 0 ? tc.textSecondary : tc.textDisabled }}>
                          {fmtAmount(carryover)}
                        </span>
                      )}
                    </td>
                    {/* 月計 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{fmtAmount(monthTotal)}</td>
                    {days.map(day => {
                      const val = getStaffDayValue(staff, day.key, af.key);
                      const rounded = Math.round(val * 10) / 10;
                      return (
                        <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                          {rounded > 0 ? fmtAmount(rounded) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* 合計行 */}
              {(() => {
                const caSubs = ["プロパー", "BP", "フリーランス", "協業"];
                if (isCATable) {
                  // CA: 4行（プロパー/BP/フリーランス/計）
                  const totalBorderBottom = "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  if (caAmountTotalOnly) {
                    const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffBudget(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                    const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffCarryover(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                    const grandMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10;
                    const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                    const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                    return (
                      <tr style={{ background: tc.bgSection }}>
                        <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, textAlign: "right" }}>
                          {fmtAmount(grandBudget)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, textAlign: "right" }}>
                          {fmtAmount(grandProgress)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                          {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, textAlign: "right" }}>
                          {fmtAmount(grandCarry)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                        {days.map(day => {
                          const dayTotal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountTotal(s, day.key, "ca"), 0) * 10) / 10;
                          return (
                            <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                              {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  return (
                    <>
                      {caSubs.map((sub, subIdx) => {
                        const subBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffBudget(s, `amountCA_${sub}`), 0) * 10) / 10;
                        const subCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, `amountCA_${sub}`), 0) * 10) / 10;
                        const subMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountByAffiliation(s, "ca", sub), 0) * 10) / 10;
                        const subProgress = Math.round((subCarry + subMonth) * 10) / 10;
                        const subRate = subBudget > 0 ? Math.round((subProgress / subBudget) * 1000) / 10 : 0;
                        return (
                          <tr key={`grand-${sub}`} style={{ background: tc.bgSection }}>
                            {subIdx === 0 && (
                              <td rowSpan={5} style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection, verticalAlign: "middle", borderBottom: totalBorderBottom }}>合計</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                              {sub}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subBudget)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: hdrBlueAlt, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subProgress)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subBudget > 0 ? getAchievementColor(subRate) : "#ccc", background: subBudget > 0 ? getAchievementBg(subRate) : hdrGreen, borderBottom: dashBorder, textAlign: "right" }}>
                              {subBudget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subCarry > 0 ? tc.textSecondary : tc.textDisabled, background: hdrGray, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subCarry)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonth > 0 ? subColor : tc.textDisabled, background: hdrBlue, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subMonth)}
                            </td>
                            {days.map(day => {
                              const dayVal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountByAffiliation(s, day.key, "ca", sub), 0) * 10) / 10;
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: dayVal > 0 ? subColor : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: dashBorder, textAlign: "right" }}>
                                  {dayVal > 0 ? fmtAmount(dayVal) : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffBudget(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                        const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffCarryover(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                        const grandMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10;
                        const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                        const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                        return (
                          <tr style={{ background: tc.bgSection, borderBottom: totalBorderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: totalBorderBottom }}>
                              計
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandBudget)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandProgress)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandCarry)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, borderBottom: totalBorderBottom, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                            {days.map(day => {
                              const dayTotal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountTotal(s, day.key, "ca"), 0) * 10) / 10;
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: totalBorderBottom, textAlign: "right" }}>
                                  {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </>
                  );
                } else {
                  // RA: 1行（従来通り）
                  const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffBudget(s, af.key), 0) * 10) / 10;
                  const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, af.key), 0) * 10) / 10;
                  const grandMonth = Math.round(getMonthGrandTotal(af.key) * 10) / 10;
                  const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                  const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                  return (
                    <tr style={{ background: tc.bgSection }}>
                      <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, textAlign: "right" }}>
                        {fmtAmount(grandBudget)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, textAlign: "right" }}>
                        {fmtAmount(grandProgress)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                        {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, textAlign: "right" }}>
                        {fmtAmount(grandCarry)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                      {days.map(day => {
                        const dayTotal = Math.round(getDayTotal(day.key, af.key) * 10) / 10;
                        return (
                          <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                            {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
        );
      })}

      {/* その他タブ */}
      {monthlyMode === "other" && (() => {
        const statusOptions = [
          { key: "rain", icon: "🌧️", label: "雨" },
          { key: "cloudy", icon: "⛅", label: "曇" },
          { key: "sunny", icon: "☀️", label: "晴" },
          { key: "done", icon: "達成", label: "達成" },
        ];
        const statusDisplay: Record<string, { icon: string; color: string; order: number }> = {
          rain: { icon: "🌧️", color: "#e74c3c", order: 0 },
          cloudy: { icon: "⛅", color: "#f39c12", order: 1 },
          sunny: { icon: "☀️", color: "#27ae60", order: 2 },
          done: { icon: "達成", color: "#2980b9", order: 3 },
        };
        const miscSortIcon = (key: string) => miscSortKey === key ? (miscSortDir === "asc" ? "▲" : "▼") : "⇅";
        const sortedMisc = [...miscItems]
          .map((item, origIdx) => ({ ...item, origIdx }))
          .sort((a, b) => {
            let cmp = 0;
            if (miscSortKey === "staff") {
              cmp = a.staff.localeCompare(b.staff, "ja");
              if (cmp === 0) cmp = (b.createdAt || "").localeCompare(a.createdAt || "");
            } else {
              cmp = (statusDisplay[a.status]?.order ?? 9) - (statusDisplay[b.status]?.order ?? 9);
              if (cmp === 0) cmp = a.staff.localeCompare(b.staff, "ja");
            }
            return miscSortDir === "desc" ? -cmp : cmp;
          });
        const formatDT = (iso: string) => {
          if (!iso) return "—";
          const d = new Date(iso);
          return `${d.getMonth() + 1}/${d.getDate()} ${("0" + d.getHours()).slice(-2)}:${("0" + d.getMinutes()).slice(-2)}`;
        };
        return (
        <div style={{ maxWidth: 900 }}>
          {/* 入力欄（上） */}
          <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: tc.accentText, display: "inline-block" }} />
              新規追加
            </h3>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>担当</label>
                <select value={miscInput.staff} onChange={(e) => setMiscInput(prev => ({ ...prev, staff: e.target.value }))}
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text, minWidth: 100 }}>
                  <option value="">選択</option>
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>内容（20文字まで）</label>
                <input type="text" value={miscInput.content} maxLength={20}
                  onChange={(e) => setMiscInput(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="内容を入力..."
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>締切</label>
                <input type="date" value={miscInput.deadline}
                  onChange={(e) => setMiscInput(prev => ({ ...prev, deadline: e.target.value }))}
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>進捗</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {statusOptions.map(opt => (
                    <button key={opt.key} onClick={() => setMiscInput(prev => ({ ...prev, status: opt.key }))}
                      style={{
                        padding: opt.key === "done" ? "6px 10px" : "6px 8px", border: miscInput.status === opt.key ? "2px solid " + tc.accentText : "1px solid " + tc.inputBorder,
                        borderRadius: 8, background: miscInput.status === opt.key ? tc.accentLight : tc.bgCard, cursor: "pointer",
                        fontSize: opt.key === "done" ? 12 : 18, fontWeight: opt.key === "done" ? 700 : 400,
                        color: opt.key === "done" ? "#2980b9" : undefined, lineHeight: 1,
                      }} title={opt.label}>
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addMiscItem}
                disabled={!miscInput.staff || !miscInput.content || !miscInput.status}
                style={{
                  padding: "8px 24px", background: (!miscInput.staff || !miscInput.content || !miscInput.status) ? "#ccc" : "#1a1a2e",
                  color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: (!miscInput.staff || !miscInput.content || !miscInput.status) ? "default" : "pointer", whiteSpace: "nowrap",
                }}>
                追加
              </button>
            </div>
          </div>

          {/* 一覧（下） */}
          <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textHeading, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#6c757d", display: "inline-block" }} />
              登録一覧
              <span style={{ fontSize: 13, color: tc.textMuted, fontWeight: 400, marginLeft: 8 }}>{miscItems.length}件</span>
            </h3>
            {miscItems.length === 0 ? (
              <p style={{ color: tc.textMuted, fontSize: 13, margin: 0 }}>データなし</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 80, cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleMiscSort("staff")}>
                      担当 {miscSortIcon("staff")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading }}>内容</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 130 }}>締切</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleMiscSort("status")}>
                      進捗 {miscSortIcon("status")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 90 }}>登録日時</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMisc.map((item, idx) => {
                    const st = statusDisplay[item.status] || { icon: "—", color: "#999", order: 9 };
                    const miscRowBg = idx % 2 === 1 ? (isDark ? "#1e2533" : "#f8f9fb") : tc.bgCard;
                    return (
                      <tr key={item.origIdx} style={{ background: miscRowBg }}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid " + tc.border, fontWeight: 600, color: isDark ? "#f1f5f9" : tc.text }}>{item.staff}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border }}>
                          <input type="text" value={item.content} maxLength={20}
                            onChange={(e) => updateMiscItem(item.origIdx, "content", e.target.value)}
                            style={{ width: "100%", border: "1px solid " + tc.border, borderRadius: 6, padding: "6px 10px", fontSize: 13, background: tc.bgSection, color: tc.text, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <input type="date" value={item.deadline || ""}
                            onChange={(e) => updateMiscItem(item.origIdx, "deadline", e.target.value)}
                            style={{ border: "1px solid " + tc.border, borderRadius: 6, padding: "6px 8px", fontSize: 12, background: tc.bgSection, color: tc.text, width: "100%", boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                            {statusOptions.map(opt => (
                              <button key={opt.key} onClick={() => updateMiscItem(item.origIdx, "status", opt.key)}
                                style={{
                                  padding: opt.key === "done" ? "3px 6px" : "3px 4px",
                                  border: item.status === opt.key ? "2px solid #0077b6" : "1px solid " + tc.border,
                                  borderRadius: 6, background: item.status === opt.key ? (isDark ? "#1e3a5f" : "#e8f4fd") : "transparent", cursor: "pointer",
                                  fontSize: opt.key === "done" ? 10 : 14, fontWeight: opt.key === "done" ? 700 : 400,
                                  color: opt.key === "done" ? (isDark ? "#60a5fa" : "#2980b9") : undefined, lineHeight: 1, opacity: item.status === opt.key ? 1 : 0.5,
                                }} title={opt.label}>
                                {opt.icon}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center", fontSize: 11, color: tc.textMuted }}>
                          {formatDT(item.createdAt)}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <button onClick={() => removeMiscItem(item.origIdx)} style={{ border: "none", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1 }} title="削除">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

