"use client";

import { useState, useEffect, useCallback } from "react";
import { useTheme } from "../../theme-provider";
import { STAFF_LIST } from "../constants/data";

type UserRole = "A" | "B" | "C" | "D";

const ROLE_LABELS: Record<UserRole, string> = {
  A: "A（管理者相当）",
  B: "B（予算入力可）",
  C: "C（予算入力不可）",
  D: "D（閲覧専用）",
};

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  A: "全担当の全操作が可能",
  B: "自担当のみ編集可、予算は全担当入力可",
  C: "自担当のみ編集可、予算入力は不可",
  D: "閲覧のみ、全体連絡の入力のみ可",
};

const ROLE_COLORS: Record<UserRole, string> = {
  A: "#e74c3c",
  B: "#f39c12",
  C: "#3498db",
  D: "#95a5a6",
};

interface UserEntry {
  id: number;
  email: string;
  staffName: string;
  role: UserRole;
  subStaff: string | null;
  password?: string; // 作成直後のみ表示
  createdAt: string;
}

export function UserManagementView({ isMobile }: { isMobile: boolean }) {
  const { t: tc } = useTheme();
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [customStaff, setCustomStaff] = useState<string[]>([]);
  const [email, setEmail] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [selectedRole, setSelectedRole] = useState<UserRole>("C");
  const [selectedSubStaff, setSelectedSubStaff] = useState("");
  const [newStaffName, setNewStaffName] = useState("");
  const [showNewStaff, setShowNewStaff] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // 全担当者リスト（既定 + カスタム）
  const allStaff = [...STAFF_LIST, ...customStaff].sort((a, b) => a.localeCompare(b, "ja"));

  // ランダムパスワード生成
  const generatePassword = useCallback(() => {
    const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let pwd = "";
    for (let i = 0; i < 10; i++) {
      pwd += chars[Math.floor(Math.random() * chars.length)];
    }
    return pwd;
  }, []);

  // ユーザー一覧取得
  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(prev => {
          const pwMap = new Map(prev.filter(u => u.password).map(u => [u.id, u.password]));
          return data.map((u: UserEntry) => ({ ...u, role: u.role || "C", subStaff: u.subStaff || null, password: pwMap.get(u.id) || undefined }));
        });
      }
    } catch {}
  }, []);

  // カスタム担当者取得
  const fetchStaff = useCallback(async () => {
    try {
      const res = await fetch("/api/staff");
      if (res.ok) {
        const data = await res.json();
        setCustomStaff(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchStaff();
  }, [fetchUsers, fetchStaff]);

  // ユーザー追加
  const handleAddUser = async () => {
    if (!email.trim()) { setError("メールアドレスを入力してください"); return; }
    if (!selectedStaff) { setError("担当を選択してください"); return; }
    setError("");
    setSuccess("");
    setLoading(true);

    const password = generatePassword();

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), staffName: selectedStaff, password, role: selectedRole, subStaff: selectedSubStaff || null }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "ユーザー作成に失敗しました");
      } else {
        setSuccess(`ユーザーを追加しました: ${data.email}`);
        setUsers(prev => [{ ...data, password: data.password }, ...prev]);
        setEmail("");
        setSelectedStaff("");
        setSelectedRole("C");
        setSelectedSubStaff("");
      }
    } catch {
      setError("ユーザー作成に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // 担当者追加
  const handleAddStaff = async () => {
    if (!newStaffName.trim()) return;
    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newStaffName.trim() }),
      });
      if (res.ok) {
        const name = newStaffName.trim();
        setCustomStaff(prev => [...prev, name].sort((a, b) => a.localeCompare(b, "ja")));
        setSelectedStaff(name);
        setNewStaffName("");
        setShowNewStaff(false);
      }
    } catch {}
  };

  // 権限変更
  const handleRoleChange = async (userId: number, newRole: UserRole) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      }
    } catch {}
  };

  // サブ担当変更
  const handleSubStaffChange = async (userId: number, newSubStaff: string) => {
    try {
      const res = await fetch("/api/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, subStaff: newSubStaff || null }),
      });
      if (res.ok) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, subStaff: newSubStaff || null } : u));
      }
    } catch {}
  };

  // ユーザー削除
  const handleDeleteUser = async (id: number) => {
    if (!confirm("このユーザーを削除しますか？")) return;
    try {
      const res = await fetch("/api/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        setUsers(prev => prev.filter(u => u.id !== id));
      }
    } catch {}
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px",
    borderRadius: 8,
    border: `1px solid ${tc.inputBorder}`,
    background: tc.bgInput,
    color: tc.text,
    fontSize: 14,
    outline: "none",
    width: "100%",
  };

  const buttonStyle: React.CSSProperties = {
    padding: "10px 24px",
    borderRadius: 8,
    border: "none",
    background: tc.accent,
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
    cursor: "pointer",
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", padding: isMobile ? "0 12px" : 0 }}>
      {/* 入力フォーム */}
      <div style={{
        background: tc.bgCard,
        borderRadius: 14,
        padding: 24,
        boxShadow: tc.shadow,
        marginBottom: 24,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: tc.textHeading, marginTop: 0, marginBottom: 20 }}>
          新規ユーザー追加
        </h2>

        {error && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: tc.errorBg, color: tc.errorText, border: `1px solid ${tc.errorBorder}`, marginBottom: 16, fontSize: 13 }}>
            {error}
          </div>
        )}
        {success && (
          <div style={{ padding: "10px 14px", borderRadius: 8, background: tc.successBg, color: tc.successText, marginBottom: 16, fontSize: 13 }}>
            {success}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", gap: 12, alignItems: isMobile ? "stretch" : "flex-end" }}>
          {/* メールアドレス */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: tc.textSecondary, marginBottom: 4, display: "block" }}>
              メールアドレス（ログインID）
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={inputStyle}
            />
          </div>

          {/* 担当選択 */}
          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: tc.textSecondary, marginBottom: 4, display: "block" }}>
              担当
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <select
                value={selectedStaff}
                onChange={(e) => setSelectedStaff(e.target.value)}
                style={{ ...inputStyle, flex: 1, cursor: "pointer" }}
              >
                <option value="">担当を選択...</option>
                {allStaff.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <button
                onClick={() => setShowNewStaff(!showNewStaff)}
                style={{
                  ...buttonStyle,
                  background: showNewStaff ? tc.textSecondary : tc.accentText,
                  padding: "10px 14px",
                  fontSize: 18,
                  lineHeight: 1,
                }}
                title="新規担当追加"
              >
                {showNewStaff ? "×" : "+"}
              </button>
            </div>
          </div>

          {/* 権限選択 */}
          <div style={{ flex: 0.8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: tc.textSecondary, marginBottom: 4, display: "block" }}>
              権限
            </label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value as UserRole)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              {(["A", "B", "C"] as UserRole[]).map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {/* サブ担当選択 */}
          <div style={{ flex: 0.8 }}>
            <label style={{ fontSize: 12, fontWeight: 600, color: tc.textSecondary, marginBottom: 4, display: "block" }}>
              サブ担当
            </label>
            <select
              value={selectedSubStaff}
              onChange={(e) => setSelectedSubStaff(e.target.value)}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">なし</option>
              {allStaff.filter(s => s !== selectedStaff).map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* 追加ボタン */}
          <button
            onClick={handleAddUser}
            disabled={loading}
            style={{
              ...buttonStyle,
              opacity: loading ? 0.6 : 1,
              minWidth: 120,
              alignSelf: isMobile ? "stretch" : "flex-end",
            }}
          >
            {loading ? "追加中..." : "ユーザー追加"}
          </button>
        </div>

        {/* 新規担当入力 */}
        {showNewStaff && (
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center" }}>
            <input
              type="text"
              value={newStaffName}
              onChange={(e) => setNewStaffName(e.target.value)}
              placeholder="新しい担当者名を入力..."
              style={{ ...inputStyle, flex: 1, maxWidth: 300 }}
              onKeyDown={(e) => { if (e.key === "Enter") handleAddStaff(); }}
            />
            <button
              onClick={handleAddStaff}
              style={{ ...buttonStyle, background: tc.successText, padding: "10px 18px" }}
            >
              担当を追加
            </button>
          </div>
        )}

        {/* 権限説明 */}
        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: tc.bgSection, fontSize: 12, color: tc.textSecondary, lineHeight: 1.8 }}>
          <b>権限の説明:</b><br />
          <span style={{ color: ROLE_COLORS.A, fontWeight: 700 }}>A</span> … {ROLE_DESCRIPTIONS.A}<br />
          <span style={{ color: ROLE_COLORS.B, fontWeight: 700 }}>B</span> … {ROLE_DESCRIPTIONS.B}<br />
          <span style={{ color: ROLE_COLORS.C, fontWeight: 700 }}>C</span> … {ROLE_DESCRIPTIONS.C}<br />
          <span style={{ color: "#27ae60", fontWeight: 700 }}>サブ担当</span> … 自分以外の担当を1人選択可。その人のデータも入力可能になります
        </div>
      </div>

      {/* ユーザー一覧 */}
      <div style={{
        background: tc.bgCard,
        borderRadius: 14,
        padding: 24,
        boxShadow: tc.shadow,
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: tc.textHeading, marginTop: 0, marginBottom: 20 }}>
          登録ユーザー一覧
          <span style={{ fontSize: 13, fontWeight: 400, color: tc.textSecondary, marginLeft: 12 }}>
            {users.length}件
          </span>
        </h2>

        {users.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, color: tc.textMuted, fontSize: 14 }}>
            登録されたユーザーはまだありません
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${tc.border}` }}>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>メールアドレス</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>担当</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>権限</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>サブ担当</th>
                  <th style={{ textAlign: "left", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>パスワード</th>
                  <th style={{ textAlign: "center", padding: "10px 12px", color: tc.textSecondary, fontWeight: 600, whiteSpace: "nowrap" }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} style={{ borderBottom: `1px solid ${tc.borderLight}` }}>
                    <td style={{ padding: "12px", color: tc.text }}>{user.email}</td>
                    <td style={{ padding: "12px", color: tc.text }}>{user.staffName}</td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <select
                        value={user.role}
                        onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `2px solid ${ROLE_COLORS[user.role]}`,
                          background: tc.bgInput,
                          color: ROLE_COLORS[user.role],
                          fontSize: 13,
                          fontWeight: 700,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        {(["A", "B", "C"] as UserRole[]).map(r => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <select
                        value={user.subStaff || ""}
                        onChange={(e) => handleSubStaffChange(user.id, e.target.value)}
                        style={{
                          padding: "4px 8px",
                          borderRadius: 6,
                          border: `2px solid ${user.subStaff ? "#27ae60" : tc.borderLight}`,
                          background: tc.bgInput,
                          color: user.subStaff ? "#27ae60" : tc.textMuted,
                          fontSize: 13,
                          fontWeight: user.subStaff ? 700 : 400,
                          cursor: "pointer",
                          outline: "none",
                        }}
                      >
                        <option value="">なし</option>
                        {allStaff.filter(s => s !== user.staffName).map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "12px", color: tc.text, fontFamily: "monospace" }}>
                      {user.password ? (
                        <span style={{
                          background: tc.accentLight,
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontSize: 13,
                          fontWeight: 600,
                          color: tc.accentText,
                        }}>
                          {user.password}
                        </span>
                      ) : (
                        <span style={{ color: tc.textMuted, fontStyle: "italic" }}>（作成時のみ表示）</span>
                      )}
                    </td>
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        style={{
                          padding: "6px 14px",
                          borderRadius: 6,
                          border: `1px solid ${tc.errorBorder}`,
                          background: tc.errorBg,
                          color: tc.errorText,
                          fontSize: 12,
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        削除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 8, background: tc.bgSection, fontSize: 12, color: tc.textSecondary, lineHeight: 1.7 }}>
          <b>注意:</b> パスワードはユーザー作成直後のみ表示されます。ページをリロードすると非表示になりますので、必ずメモしてください。
        </div>
      </div>
    </div>
  );
}
