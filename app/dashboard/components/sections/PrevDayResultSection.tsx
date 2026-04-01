"use client";

import { StaffActivity } from "../../types/index";
import { ActivityRankCard } from "../cards/ActivityRankCard";
import { AmountRankCard } from "../cards/AmountRankCard";

interface PrevDayResultSectionProps {
  dStaffActivities: StaffActivity[];
  prevPrevStaffActivities: StaffActivity[];
  isMobile: boolean;
  textColor?: string;
}

export function PrevDayResultSection({
  dStaffActivities,
  prevPrevStaffActivities,
  isMobile,
  textColor = "#1a1a2e",
}: PrevDayResultSectionProps) {
  return (
    <>
      {/* 見出し */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "3px solid #e67e22" }}>
        <div style={{ width: 6, height: 24, borderRadius: 3, background: "#e67e22" }} />
        <h3 style={{ fontSize: 16, fontWeight: 700, color: textColor, margin: 0 }}>前営業日結果</h3>
      </div>

      {/* 件数エリア - ダークブルー */}
      <div style={{ background: "linear-gradient(135deg, #0c2340, #1a3a5c)", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", color: "#fff", marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#4cc9f0", marginBottom: 14 }}>件数</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }} className="prev-result-grid">
          <ActivityRankCard title="RA受注数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="ordersRA" color="#ff6b6b" darkMode />
          <ActivityRankCard title="CA受注数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="ordersCA" color="#c084fc" darkMode />
          <ActivityRankCard title="面談設定数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="interviewSetups" color="#4cc9f0" darkMode />
          <ActivityRankCard title="面談実施数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="interviewsConducted" color="#fbbf24" darkMode />
          <ActivityRankCard title="RA開拓アポ獲得" data={dStaffActivities} prevData={prevPrevStaffActivities} field="appointmentAcquisitions" color="#34d399" darkMode />
        </div>
      </div>

      {/* 金額エリア（受注粗利 + 単価UP横並び） - ダークパープル */}
      <div style={{ background: "linear-gradient(135deg, #2d1b2e, #1a1a2e)", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", color: "#fff", marginBottom: isMobile ? 16 : 24 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f9a8d4", marginBottom: 14 }}>金額（万円）</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }} className="prev-result-grid">
          <AmountRankCard title="RA受注粗利" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="ra" color="#ff6b6b" darkMode />
          <AmountRankCard title="CA受注粗利" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="ca" color="#c084fc" darkMode />
          <AmountRankCard title="RA単価UP" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="raPU" color="#ff6b6b" darkMode />
          <AmountRankCard title="CA単価UP" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="caPU" color="#c084fc" darkMode />
        </div>
      </div>
    </>
  );
}
