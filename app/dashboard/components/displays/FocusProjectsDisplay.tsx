"use client";

import { Badge } from "../ui/Badge";
import { formatYen } from "../../utils/numbers";
import { useTheme } from "../../../theme-provider";
import type { FocusProject } from "../../types";

export function FocusProjectsDisplay({ projects }: { projects: FocusProject[] }) {
  const darkTh: React.CSSProperties = { textAlign: "left", padding: "8px 0", color: "rgba(255,255,255,0.55)", fontWeight: 600 };
  return (
    <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", overflowX: "auto", color: "#fff" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#4cc9f0", marginBottom: 12 }}>注力案件</h3>
      {projects.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>未入力</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 650 }}>
          <thead><tr style={{ borderBottom: "2px solid rgba(255,255,255,0.12)" }}>
            <th style={darkTh}>企業名</th><th style={darkTh}>案件</th><th style={darkTh}>ポジション</th><th style={darkTh}>担当</th><th style={darkTh}>単価</th><th style={darkTh}>契約</th><th style={darkTh}>勤務場所</th>
          </tr></thead>
          <tbody>{projects.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#fff" }}>{p.company || "-"}</td>
              <td style={{ padding: "8px 0", color: "rgba(255,255,255,0.8)" }}>{p.title || "-"}</td>
              <td style={{ padding: "8px 0", color: "#4cc9f0", fontWeight: 600 }}>{p.position || "-"}</td>
              <td style={{ padding: "8px 0", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{p.staff || "-"}</td>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#a8e6cf" }}>{p.price ? formatYen(p.price) : "-"}</td>
              <td style={{ padding: "8px 0" }}><Badge text={p.contract} type={p.contract === "準委任" ? "quasi" : p.contract === "両方OK" ? "both" : "dispatch"} /></td>
              <td style={{ padding: "8px 0", color: "rgba(255,255,255,0.8)" }}>{p.location || "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
