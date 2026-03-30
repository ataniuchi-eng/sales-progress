"use client";

import { useState } from "react";
import { useTheme } from "../../../theme-provider";
import { formatYen } from "../../utils/numbers";
import { DonutChart } from "../ui/DonutChart";
import { Row } from "../ui/Row";

function fmtMan(v: number): string {
  if (v === 0) return "0";
  const parts = v.toString().split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
}

export function SummaryCard({ title, data, rate, isTotal, standby, standbyCost, supportCost, countInfo, grossProfitTotal, companyProfits, totalDeduction, carryover, monthOrder, monthOrderNew, monthOrderSlide, monthOrderPU, hcInfo }: {
  title: string; data: { target: number; progress: number; forecast: number };
  rate: number; isTotal?: boolean; standby?: number; standbyCost?: number; supportCost?: number;
  countInfo?: { progress: number; target: number };
  grossProfitTotal?: number;
  companyProfits?: { company: string; profit: number }[];
  totalDeduction?: number;
  carryover?: number;
  monthOrder?: number;
  monthOrderNew?: number;
  monthOrderSlide?: number;
  monthOrderPU?: number;
  hcInfo?: { total: number; hcNew: number; hcSlide: number };
}) {
  const { t: tc } = useTheme();
  const [showAllCompanies, setShowAllCompanies] = useState(false);
  const bg = isTotal ? "linear-gradient(135deg, #0c4a6e, #0284c7)" : tc.bgCard;
  const color = isTotal ? "#fff" : tc.text;
  const labelColor = isTotal ? "rgba(255,255,255,0.7)" : tc.textMuted;
  const deduction = standbyCost || supportCost || 0;
  const adjustedProgress = data.progress - deduction;
  const barFill = isTotal ? "#4cc9f0" : rate >= 100 ? "#2ecc71" : rate >= 70 ? "#f39c12" : "#e63946";
  const trackColor = isTotal ? "rgba(255,255,255,0.15)" : tc.border;
  const medals = ["🥇", "🥈", "🥉"];
  const companies = companyProfits || [];
  const displayCompanies = showAllCompanies ? companies : companies.slice(0, 3);

  return (
    <div style={{ background: bg, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, color, minWidth: 0 }}>
      <div style={{ marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${trackColor}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
          {countInfo && countInfo.target > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700, color: isTotal ? "#4cc9f0" : tc.accentText }}>
              {countInfo.progress}<span style={{ fontSize: 11, fontWeight: 400, color: labelColor }}>/{countInfo.target}</span>
            </span>
          )}
        </div>
        {hcInfo && (
          <div style={{ fontSize: 10, color: labelColor, marginTop: 3, fontWeight: 500 }}>
            稼働HC：{hcInfo.total}（新：{hcInfo.hcNew}・ス：{hcInfo.hcSlide}）
          </div>
        )}
      </div>
      <Row label="目標" value={formatYen(data.target)} labelColor={labelColor} valueColor={isTotal ? "#fff" : tc.textPrimary} />
      {isTotal ? (
        <>
          <Row label="現在粗利" value={formatYen(data.progress)} labelColor={labelColor} valueColor="#4cc9f0" />
          {carryover !== undefined && <Row label="- 月初繰越" value={formatYen(carryover)} labelColor={labelColor} valueColor="rgba(255,255,255,0.55)" small />}
          {monthOrder !== undefined && <Row label="- 今月受注" value={formatYen(monthOrder)} labelColor={labelColor} valueColor="rgba(255,255,255,0.55)" small />}
          {monthOrderNew !== undefined && <Row label="　新規" value={formatYen(monthOrderNew)} labelColor={labelColor} valueColor="rgba(255,255,255,0.45)" small />}
          {monthOrderSlide !== undefined && <Row label="　スライド" value={formatYen(monthOrderSlide)} labelColor={labelColor} valueColor="rgba(255,255,255,0.45)" small />}
          {monthOrderPU !== undefined && <Row label="　単UP" value={formatYen(monthOrderPU)} labelColor={labelColor} valueColor="rgba(255,255,255,0.45)" small />}
          <Row label="待機・支援費" value={formatYen(totalDeduction || 0)} labelColor={labelColor} valueColor="#ffb3b3" />
          <Row label="粗利計" value={formatYen(grossProfitTotal || 0)} labelColor={labelColor} valueColor="#4cc9f0" />
          <Row label="見込" value={formatYen(data.forecast)} labelColor={labelColor} valueColor="#a8e6cf" />
          <div style={{ marginBottom: 6, height: 13 }} />
        </>
      ) : (
        <>
          <Row label="現在粗利" value={formatYen(data.progress)} labelColor={labelColor} valueColor={tc.accentText} />
          {carryover !== undefined && <Row label="- 月初繰越" value={formatYen(carryover)} labelColor={labelColor} valueColor={tc.textMuted} small />}
          {monthOrder !== undefined && <Row label="- 今月受注" value={formatYen(monthOrder)} labelColor={labelColor} valueColor={tc.textMuted} small />}
          {monthOrderNew !== undefined && <Row label="　新規" value={formatYen(monthOrderNew)} labelColor={labelColor} valueColor={tc.textMuted} small />}
          {monthOrderSlide !== undefined && <Row label="　スライド" value={formatYen(monthOrderSlide)} labelColor={labelColor} valueColor={tc.textMuted} small />}
          {monthOrderPU !== undefined && <Row label="　単UP" value={formatYen(monthOrderPU)} labelColor={labelColor} valueColor={tc.textMuted} small />}
          {standbyCost !== undefined && <Row label="待機費用" value={formatYen(standbyCost)} labelColor={labelColor} valueColor="#e74c3c" />}
          {supportCost !== undefined && <Row label="支援費等" value={formatYen(supportCost)} labelColor={labelColor} valueColor="#e74c3c" />}
          {(standbyCost !== undefined || supportCost !== undefined) && <Row label="粗利計" value={formatYen(adjustedProgress)} labelColor={labelColor} valueColor={tc.accentText} />}
          <Row label="見込" value={formatYen(data.forecast)} labelColor={labelColor} valueColor="#2ecc71" />
          {standby !== undefined ? (
            <Row label="待機" value={`${standby}名`} labelColor={labelColor} valueColor="#f39c12" />
          ) : (
            <div style={{ marginBottom: 6, height: 13 }} />
          )}
        </>
      )}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${trackColor}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 11, color: labelColor }}>達成率</div>
        <div style={{ position: "relative" }}>
          <DonutChart rate={rate} size={76} color={barFill} trackColor={trackColor} />
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(0deg)", fontSize: 16, fontWeight: 800, color: barFill }}>{rate}%</span>
        </div>
      </div>
      {!isTotal && companies.length > 0 && (
        <div style={{ marginTop: 10, paddingTop: 8, borderTop: `1px solid ${trackColor}` }}>
          <div style={{ fontSize: 10, color: labelColor, marginBottom: 6, fontWeight: 600 }}>今月決定粗利BEST{Math.min(3, companies.length)}</div>
          {displayCompanies.map((c, i) => (
            <div key={c.company} style={{ display: "flex", alignItems: "center", gap: 6, padding: "3px 0", fontSize: 11 }}>
              {i < 3 ? <span style={{ fontSize: 13, flexShrink: 0 }}>{medals[i]}</span> : <span style={{ fontSize: 10, fontWeight: 700, width: 18, textAlign: "center", flexShrink: 0, color: labelColor }}>{i + 1}</span>}
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontSize: 11 }}>{c.company}</span>
              <span style={{ flexShrink: 0, fontWeight: 700, fontSize: 11, color: barFill }}>{fmtMan(c.profit)}<span style={{ fontSize: 9, fontWeight: 400 }}>万円</span></span>
            </div>
          ))}
          {companies.length > 3 && (
            <button onClick={() => setShowAllCompanies(!showAllCompanies)} style={{ display: "block", width: "100%", marginTop: 6, padding: "4px 0", fontSize: 10, fontWeight: 600, color: barFill, background: "transparent", border: `1px solid ${trackColor}`, borderRadius: 4, cursor: "pointer" }}>
              {showAllCompanies ? "TOP3のみ表示" : `全${companies.length}件を表示`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
