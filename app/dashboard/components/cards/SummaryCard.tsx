"use client";

import { useTheme } from "../../../theme-provider";
import { formatYen } from "../../utils/numbers";
import { DonutChart } from "../ui/DonutChart";
import { Row } from "../ui/Row";

const calcRate = (progress: number, target: number) => target > 0 ? Math.round((progress / target) * 100) : 0;

export function SummaryCard({ title, data, rate, isTotal, standby }: {
  title: string; data: { target: number; progress: number; forecast: number };
  rate: number; isTotal?: boolean; standby?: number;
}) {
  const { t: tc } = useTheme();
  const bg = isTotal ? "linear-gradient(135deg, #0c4a6e, #0284c7)" : tc.bgCard;
  const color = isTotal ? "#fff" : tc.text;
  const labelColor = isTotal ? "rgba(255,255,255,0.7)" : tc.textMuted;
  const barFill = isTotal ? "#4cc9f0" : rate >= 100 ? "#2ecc71" : rate >= 70 ? "#f39c12" : "#e63946";
  const trackColor = isTotal ? "rgba(255,255,255,0.15)" : tc.border;
  return (
    <div style={{ background: bg, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, color }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${trackColor}` }}>{title}</div>
      <Row label="目標" value={formatYen(data.target)} labelColor={labelColor} valueColor={isTotal ? "#fff" : tc.textPrimary} />
      <Row label="進捗" value={formatYen(data.progress)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : tc.accentText} />
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
