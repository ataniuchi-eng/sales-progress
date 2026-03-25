"use client";

import { useTheme } from "../../../theme-provider";
import { formatYen } from "../../utils/numbers";
import { DonutChart } from "../ui/DonutChart";
import { Row } from "../ui/Row";

export function SummaryCard({ title, data, rate, isTotal, standby, standbyCost, supportCost, countInfo, grossProfitTotal }: {
  title: string; data: { target: number; progress: number; forecast: number };
  rate: number; isTotal?: boolean; standby?: number; standbyCost?: number; supportCost?: number;
  countInfo?: { progress: number; target: number };
  grossProfitTotal?: number;
}) {
  const { t: tc } = useTheme();
  const bg = isTotal ? "linear-gradient(135deg, #0c4a6e, #0284c7)" : tc.bgCard;
  const color = isTotal ? "#fff" : tc.text;
  const labelColor = isTotal ? "rgba(255,255,255,0.7)" : tc.textMuted;
  // 進捗から待機費用or支援費等を引いた値で達成率を計算
  const deduction = standbyCost || supportCost || 0;
  const adjustedProgress = data.progress - deduction;
  const barFill = isTotal ? "#4cc9f0" : rate >= 100 ? "#2ecc71" : rate >= 70 ? "#f39c12" : "#e63946";
  const trackColor = isTotal ? "rgba(255,255,255,0.15)" : tc.border;
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, color }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${trackColor}` }}>
        <span style={{ fontSize: 16, fontWeight: 700 }}>{title}</span>
        {countInfo && countInfo.target > 0 && (
          <span style={{ fontSize: 13, fontWeight: 700, color: isTotal ? "#4cc9f0" : tc.accentText }}>
            {countInfo.progress}<span style={{ fontSize: 11, fontWeight: 400, color: labelColor }}>/{countInfo.target}</span>
          </span>
        )}
      </div>
      <Row label="目標" value={formatYen(data.target)} labelColor={labelColor} valueColor={isTotal ? "#fff" : tc.textPrimary} />
      {grossProfitTotal !== undefined ? (
        <Row label="粗利計" value={formatYen(grossProfitTotal)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : tc.accentText} />
      ) : (
        <Row label="現在粗利" value={formatYen(data.progress)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : tc.accentText} />
      )}
      {standbyCost !== undefined && <Row label="待機費用" value={formatYen(standbyCost)} labelColor={labelColor} valueColor={isTotal ? "#ffb3b3" : "#e74c3c"} />}
      {supportCost !== undefined && <Row label="支援費等" value={formatYen(supportCost)} labelColor={labelColor} valueColor={isTotal ? "#ffb3b3" : "#e74c3c"} />}
      {(standbyCost !== undefined || supportCost !== undefined) && <Row label="粗利計" value={formatYen(adjustedProgress)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : tc.accentText} />}
      <Row label="見込" value={formatYen(data.forecast)} labelColor={labelColor} valueColor={isTotal ? "#a8e6cf" : "#2ecc71"} />
      {standby !== undefined && <Row label="待機" value={`${standby}名`} labelColor={labelColor} valueColor={isTotal ? "#ffd6a5" : "#f39c12"} />}
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${trackColor}`, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
        <div style={{ fontSize: 11, color: labelColor }}>達成率</div>
        <div style={{ position: "relative" }}>
          <DonutChart rate={rate} size={76} color={barFill} trackColor={trackColor} />
          <span style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%) rotate(0deg)", fontSize: 16, fontWeight: 800, color: barFill }}>{rate}%</span>
        </div>
      </div>
    </div>
  );
}
