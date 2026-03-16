"use client";

import { Badge } from "../ui/Badge";
import { formatYen } from "../../utils/numbers";
import { useTheme } from "../../../theme-provider";
import type { FocusPerson } from "../../types";

export function FocusPeopleDisplay({ people }: { people: FocusPerson[] }) {
  const darkTh: React.CSSProperties = { textAlign: "left", padding: "8px 0", color: "rgba(255,255,255,0.55)", fontWeight: 600 };
  return (
    <div style={{ background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.15)", overflowX: "auto", color: "#fff" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#a8e6cf", marginBottom: 12 }}>注力人材</h3>
      {people.length === 0 ? <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>未入力</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
          <thead><tr style={{ borderBottom: "2px solid rgba(255,255,255,0.12)" }}>
            <th style={darkTh}>氏名</th><th style={darkTh}>所属</th><th style={darkTh}>ポジション</th><th style={darkTh}>担当</th><th style={darkTh}>スキル</th><th style={darkTh}>仕入れ額</th>
          </tr></thead>
          <tbody>{people.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#fff" }}>{p.name || "-"}</td>
              <td style={{ padding: "8px 0" }}><Badge text={p.affiliation} type={p.affiliation === "BP" ? "bp" : p.affiliation === "フリーランス" ? "fl" : "proper"} /></td>
              <td style={{ padding: "8px 0", color: "#4cc9f0", fontWeight: 600 }}>{p.position || "-"}</td>
              <td style={{ padding: "8px 0", color: "rgba(255,255,255,0.8)", fontWeight: 600 }}>{p.staff || "-"}</td>
              <td style={{ padding: "8px 0", color: "#ffd6a5" }}>{p.skill || "-"}</td>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#a8e6cf" }}>{p.cost ? formatYen(p.cost) : "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}
