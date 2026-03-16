"use client";

import { useTheme } from "../../../theme-provider";
import type { RAData, RACompany } from "../../types";

const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 };

export function RADisplay({ ra }: { ra: RAData }) {
  const { t: tc } = useTheme();
  const acqCompanies = Array.isArray(ra.acquisitionCompanies) ? ra.acquisitionCompanies.filter(c => c.name) : [];
  const joinCompanies = Array.isArray(ra.joinCompanies) ? ra.joinCompanies.filter(c => c.name) : [];
  const hasData = ra.acquisitionTarget || ra.acquisitionProgress || ra.joinTarget || ra.joinProgress || acqCompanies.length || joinCompanies.length;
  return (
    <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, overflowX: "auto" }}>
      {!hasData ? <p style={{ color: tc.textDisabled, fontSize: 14 }}>未入力</p> : (
        <div className="focus-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* 案件獲得 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0077b6", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e8f4fd" }}>案件獲得</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: tc.textSecondary }}>企業数目標</span><span style={{ fontWeight: 700, color: tc.textPrimary }}>{ra.acquisitionTarget}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: tc.textSecondary }}>進捗</span><span style={{ fontWeight: 700, color: "#0077b6" }}>{ra.acquisitionProgress}</span>
            </div>
            {ra.acquisitionTarget > 0 && (() => {
              const acqRate = Math.min(Math.round((ra.acquisitionProgress / ra.acquisitionTarget) * 100), 100);
              const acqColor = ra.acquisitionProgress >= ra.acquisitionTarget ? "#2ecc71" : "#0077b6";
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: tc.textSecondary }}>達成率</span><span style={{ fontWeight: 700, color: acqColor }}>{acqRate}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#f0f2f5", overflow: "hidden" }}>
                    <div style={{ width: `${acqRate}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${acqColor}, ${acqColor}dd)`, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })()}
            {acqCompanies.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
                  <th style={thStyle}>企業名</th><th style={thStyle}>担当</th>
                </tr></thead>
                <tbody>{acqCompanies.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "6px 0", fontWeight: 600, color: tc.textPrimary }}>{c.name}</td>
                    <td style={{ padding: "6px 0", color: tc.textSecondary, fontWeight: 600 }}>{c.staff || "-"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
          {/* 参画決定 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2ecc71", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e8f5e9" }}>参画決定</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: tc.textSecondary }}>企業目標</span><span style={{ fontWeight: 700, color: tc.textPrimary }}>{ra.joinTarget}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: tc.textSecondary }}>進捗</span><span style={{ fontWeight: 700, color: "#2ecc71" }}>{ra.joinProgress}</span>
            </div>
            {ra.joinTarget > 0 && (() => {
              const joinRate = Math.min(Math.round((ra.joinProgress / ra.joinTarget) * 100), 100);
              const joinColor = ra.joinProgress >= ra.joinTarget ? "#2ecc71" : "#f39c12";
              return (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 3 }}>
                    <span style={{ color: tc.textSecondary }}>達成率</span><span style={{ fontWeight: 700, color: joinColor }}>{joinRate}%</span>
                  </div>
                  <div style={{ height: 8, borderRadius: 4, background: "#f0f2f5", overflow: "hidden" }}>
                    <div style={{ width: `${joinRate}%`, height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${joinColor}, ${joinColor}dd)`, transition: "width 0.5s" }} />
                  </div>
                </div>
              );
            })()}
            {joinCompanies.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
                  <th style={thStyle}>企業名</th><th style={thStyle}>担当</th>
                </tr></thead>
                <tbody>{joinCompanies.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "6px 0", fontWeight: 600, color: tc.textPrimary }}>{c.name}</td>
                    <td style={{ padding: "6px 0", color: tc.textSecondary, fontWeight: 600 }}>{c.staff || "-"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
