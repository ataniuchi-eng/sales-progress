"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../theme-provider";
import { STAFF_LIST } from "../constants/data";

interface BlacklistEntry {
  id: number;
  name: string;
  affiliation: string;
  age: number | null;
  birth_date: string | null;
  prefecture: string | null;
  reason: string;
  registered_by: string;
  created_at: string;
  updated_at: string;
}

const AFFILIATIONS = ["プロパー", "BP", "フリーランス", "協業"];

const PREFECTURES = [
  "北海道","青森","岩手","宮城","秋田","山形","福島",
  "茨城","栃木","群馬","埼玉","千葉","東京","神奈川",
  "新潟","富山","石川","福井","山梨","長野","岐阜","静岡","愛知",
  "三重","滋賀","京都","大阪","兵庫","奈良","和歌山",
  "鳥取","島根","岡山","広島","山口","徳島","香川","愛媛","高知",
  "福岡","佐賀","長崎","熊本","大分","宮崎","鹿児島","沖縄",
];

// 18歳以上の生年月日上限
const maxBirthDate = (() => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split("T")[0];
})();

const calcAge = (birthDate: string): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const emptyForm = { name: "", affiliation: "", birthDate: "", prefecture: "", reason: "", registered_by: "" };

export function BlacklistView({ isMobile }: { isMobile: boolean }) {
  const { t: tc, theme } = useTheme();
  const isDark = theme === "dark";
  const [list, setList] = useState<BlacklistEntry[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const [searchText, setSearchText] = useState("");

  const allStaff = [...STAFF_LIST].sort((a, b) => a.localeCompare(b, "ja"));

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(""), 2500); };

  const fetchList = useCallback(async () => {
    try {
      const res = await fetch("/api/blacklist");
      if (res.ok) setList(await res.json());
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchList(); }, [fetchList]);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.affiliation.trim() || !form.reason.trim() || !form.registered_by) {
      showToast("氏名・所属・理由・登録者は必須です"); return;
    }
    if (form.reason.length > 150) { showToast("理由は150文字以内で入力してください"); return; }
    setSubmitting(true);
    try {
      const age = form.birthDate ? calcAge(form.birthDate) : null;
      const body = { name: form.name, affiliation: form.affiliation, age, birth_date: form.birthDate || null, prefecture: form.prefecture || null, reason: form.reason, registered_by: form.registered_by };
      if (editingId) {
        const res = await fetch("/api/blacklist", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: editingId, ...body }) });
        if (res.ok) { showToast("更新しました"); setEditingId(null); setForm(emptyForm); fetchList(); }
      } else {
        const res = await fetch("/api/blacklist", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
        if (res.ok) { showToast("登録しました"); setForm(emptyForm); fetchList(); }
      }
    } catch { showToast("エラーが発生しました"); } finally { setSubmitting(false); }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("削除しますか？")) return;
    try {
      const res = await fetch("/api/blacklist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
      if (res.ok) { showToast("削除しました"); fetchList(); if (editingId === id) { setEditingId(null); setForm(emptyForm); } }
    } catch { showToast("削除に失敗しました"); }
  };

  const startEdit = (entry: BlacklistEntry) => {
    setEditingId(entry.id);
    setForm({ name: entry.name, affiliation: entry.affiliation, birthDate: entry.birth_date || "", prefecture: entry.prefecture || "", reason: entry.reason, registered_by: entry.registered_by });
  };

  const cancelEdit = () => { setEditingId(null); setForm(emptyForm); };

  const inputStyle: React.CSSProperties = { padding: "6px 8px", fontSize: 13, borderRadius: 6, border: `1px solid ${tc.border}`, background: tc.bgInput || (isDark ? "#1e293b" : "#fff"), color: tc.text, width: "100%" };
  const selectStyle: React.CSSProperties = { ...inputStyle, appearance: "auto" as any };
  const btnStyle: React.CSSProperties = { padding: "8px 20px", fontSize: 13, fontWeight: 700, borderRadius: 8, border: "none", cursor: "pointer", color: "#fff" };

  const filtered = searchText ? list.filter(e => e.name.includes(searchText) || e.affiliation.includes(searchText) || e.reason.includes(searchText) || e.registered_by.includes(searchText)) : list;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {toast && <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", background: "#333", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 13, fontWeight: 600, zIndex: 9999 }}>{toast}</div>}

      {/* 入力フォーム */}
      <div style={{ background: tc.bgCard, borderRadius: 14, padding: 20, boxShadow: tc.shadow }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: "0 0 16px" }}>
          {editingId ? "ブラックリスト編集" : "ブラックリスト登録"}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>氏名 *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} placeholder="氏名" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>所属 *</label>
            <select value={form.affiliation} onChange={e => setForm(f => ({ ...f, affiliation: e.target.value }))} style={selectStyle}>
              <option value="">選択</option>
              {AFFILIATIONS.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>年齢{form.birthDate ? `（${calcAge(form.birthDate)}歳）` : ""}</label>
            <input type="number" min={18} max={99} value={form.birthDate ? calcAge(form.birthDate) : ""} readOnly style={{ ...inputStyle, background: isDark ? "#0f172a" : "#f0f2f5", cursor: "default" }} placeholder="生年月日から自動計算" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>生年月日</label>
            <input type="date" value={form.birthDate} max={maxBirthDate} onChange={e => setForm(f => ({ ...f, birthDate: e.target.value }))} style={inputStyle} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>居住県</label>
            <select value={form.prefecture} onChange={e => setForm(f => ({ ...f, prefecture: e.target.value }))} style={selectStyle}>
              <option value="">未選択</option>
              {PREFECTURES.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: isMobile ? "1" : "1 / -1" }}>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>理由 * <span style={{ fontWeight: 400 }}>({form.reason.length}/150)</span></label>
            <textarea value={form.reason} onChange={e => { if (e.target.value.length <= 150) setForm(f => ({ ...f, reason: e.target.value })); }} style={{ ...inputStyle, minHeight: 60, resize: "vertical" }} placeholder="150文字以内" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: tc.textMuted, fontWeight: 600 }}>登録者 *</label>
            <select value={form.registered_by} onChange={e => setForm(f => ({ ...f, registered_by: e.target.value }))} style={selectStyle}>
              <option value="">選択</option>
              {allStaff.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button onClick={handleSubmit} disabled={submitting} style={{ ...btnStyle, background: editingId ? "#e67e22" : "#e63946" }}>
            {submitting ? "処理中..." : editingId ? "更新" : "登録"}
          </button>
          {editingId && <button onClick={cancelEdit} style={{ ...btnStyle, background: "#6c757d" }}>キャンセル</button>}
        </div>
      </div>

      {/* リスト */}
      <div style={{ background: tc.bgCard, borderRadius: 14, padding: 20, boxShadow: tc.shadow }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>登録一覧（{filtered.length}件）</h3>
          <input value={searchText} onChange={e => setSearchText(e.target.value)} style={{ ...inputStyle, width: 180 }} placeholder="検索..." />
        </div>
        {loading ? <p style={{ color: tc.textMuted }}>読み込み中...</p> : filtered.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13 }}>データなし</p> : (
          <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" as any }}>
            <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 700, fontSize: 13 }}>
              <thead>
                <tr>
                  {["氏名", "所属", "年齢", "生年月日", "居住県", "理由", "登録者", "登録日", "操作"].map(h => (
                    <th key={h} style={{ padding: "8px 6px", textAlign: "left", borderBottom: `2px solid ${tc.border}`, fontSize: 11, fontWeight: 700, color: tc.textMuted, whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => (
                  <tr key={entry.id} style={{ borderBottom: `1px solid ${tc.border}` }}>
                    <td style={{ padding: "8px 6px", fontWeight: 600, whiteSpace: "nowrap" }}>{entry.name}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{entry.affiliation}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{entry.age != null ? `${entry.age}歳` : "—"}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", fontSize: 11 }}>{entry.birth_date ?? "—"}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{entry.prefecture ?? "—"}</td>
                    <td style={{ padding: "8px 6px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={entry.reason}>{entry.reason.length > 30 ? entry.reason.slice(0, 30) + "…" : entry.reason}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{entry.registered_by}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap", fontSize: 11 }}>{entry.created_at ? new Date(entry.created_at).toLocaleDateString("ja-JP") : "—"}</td>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>
                      <button onClick={() => startEdit(entry)} style={{ fontSize: 11, padding: "3px 8px", marginRight: 4, borderRadius: 4, border: `1px solid ${tc.border}`, background: "transparent", color: "#3498db", cursor: "pointer", fontWeight: 600 }}>編集</button>
                      <button onClick={() => handleDelete(entry.id)} style={{ fontSize: 11, padding: "3px 8px", borderRadius: 4, border: `1px solid ${tc.border}`, background: "transparent", color: "#e63946", cursor: "pointer", fontWeight: 600 }}>削除</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
