"use client";
// CompanySelect - searchable dropdown for company selection
import { useState, useRef, useEffect, useCallback } from "react";
import { useTheme } from "../../../theme-provider";

interface CompanySelectProps {
  value: string;
  onChange: (value: string) => void;
  companies: string[];
  onAddCompany: (name: string) => void;
  style?: React.CSSProperties;
}

export function CompanySelect({ value, onChange, companies, onAddCompany, style }: CompanySelectProps) {
  const { t: tc } = useTheme();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
        setAdding(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Filter companies by partial match
  const filtered = companies.filter(c =>
    c.toLowerCase().includes(search.toLowerCase())
  );

  const handleSelect = useCallback((name: string) => {
    onChange(name);
    setOpen(false);
    setSearch("");
  }, [onChange]);

  const [addError, setAddError] = useState("");
  const handleAdd = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // 正式名称チェック: 「株式会社」「有限会社」等の法人格を含むか
    const hasCorpSuffix = /株式会社|有限会社|合同会社|合名会社|合資会社|事業組合|一般社団|一般財団/.test(trimmed);
    if (!hasCorpSuffix) {
      setAddError("正式名称（株式会社等を含む）で入力してください");
      return;
    }
    setAddError("");
    onAddCompany(trimmed);
    onChange(trimmed);
    setNewName("");
    setAdding(false);
    setOpen(false);
    setSearch("");
  }, [newName, onAddCompany, onChange]);

  const baseInput: React.CSSProperties = {
    width: "100%",
    padding: "6px 8px",
    border: `1px solid ${tc.border}`,
    borderRadius: 6,
    fontSize: 13,
    background: tc.bgInput || tc.bg,
    color: tc.text,
    outline: "none",
    boxSizing: "border-box",
    ...style,
  };

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      {/* Display selected value / trigger */}
      <div
        onClick={() => { setOpen(!open); setTimeout(() => inputRef.current?.focus(), 50); }}
        style={{
          ...baseInput,
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: 32,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, color: value ? tc.text : tc.textMuted }}>
          {value || "企業を選択"}
        </span>
        <span style={{ fontSize: 10, marginLeft: 4, color: tc.textMuted, flexShrink: 0 }}>▼</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute",
          top: "100%",
          left: 0,
          right: 0,
          zIndex: 9999,
          background: tc.bgCard || tc.bg,
          border: `1px solid ${tc.border}`,
          borderRadius: 8,
          boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
          marginTop: 2,
          maxHeight: 320,
          display: "flex",
          flexDirection: "column",
        }}>
          {/* Search input */}
          <div style={{ padding: "8px 8px 4px" }}>
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="企業名で検索..."
              style={{
                ...baseInput,
                border: `1px solid ${tc.border}`,
                marginBottom: 0,
              }}
            />
          </div>

          {/* Note about official names */}
          <div style={{ padding: "2px 10px 4px", fontSize: 10, color: tc.textMuted }}>
            ※ 略称ではなく企業の正式名称で入力してください
          </div>

          {/* Scrollable list */}
          <div style={{ overflowY: "auto", maxHeight: 200, padding: "0 4px" }}>
            {filtered.length > 0 ? filtered.map((c) => (
              <div
                key={c}
                onClick={() => handleSelect(c)}
                style={{
                  padding: "7px 8px",
                  fontSize: 12,
                  cursor: "pointer",
                  borderRadius: 4,
                  background: c === value ? (tc.bgHover || "#e8f0fe") : "transparent",
                  fontWeight: c === value ? 600 : 400,
                  color: tc.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => { (e.target as HTMLDivElement).style.background = tc.bgHover || "#f0f0f0"; }}
                onMouseLeave={(e) => { (e.target as HTMLDivElement).style.background = c === value ? (tc.bgHover || "#e8f0fe") : "transparent"; }}
              >
                {c}
              </div>
            )) : (
              <div style={{ padding: "10px 8px", fontSize: 12, color: tc.textMuted, textAlign: "center" }}>
                該当する企業が見つかりません
              </div>
            )}
          </div>

          {/* Add new company */}
          <div style={{ borderTop: `1px solid ${tc.border}`, padding: "6px 8px" }}>
            {!adding ? (
              <button
                onClick={() => { setAdding(true); setNewName(search); }}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0077b6",
                  background: "transparent",
                  border: "1px dashed #0077b6",
                  borderRadius: 6,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                }}
              >
                ＋ 新しい企業を追加
              </button>
            ) : (
              <div>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => { setNewName(e.target.value); setAddError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAdd(); if (e.key === "Escape") { setAdding(false); setAddError(""); } }}
                    placeholder="正式名称を入力"
                    autoFocus
                    style={{ ...baseInput, flex: 1, fontSize: 12 }}
                  />
                  <button
                    onClick={handleAdd}
                    disabled={!newName.trim()}
                    style={{
                      padding: "5px 10px",
                      fontSize: 11,
                      fontWeight: 700,
                      background: newName.trim() ? "#0077b6" : "#ccc",
                      color: "#fff",
                      border: "none",
                      borderRadius: 6,
                      cursor: newName.trim() ? "pointer" : "default",
                      whiteSpace: "nowrap",
                    }}
                  >
                    追加
                  </button>
                </div>
                {addError && <div style={{ fontSize: 10, color: "#e74c3c", marginTop: 3, padding: "0 2px" }}>{addError}</div>}
                <div style={{ fontSize: 9, color: tc.textMuted, marginTop: 3, padding: "0 2px", lineHeight: 1.5 }}>
                  ※正式名称以外は入力不可。売上先企業を入力、BP等の仕入れ元企業は入力しないでください。
                </div>
              </div>
            )}
          </div>

          {/* Clear selection */}
          {value && (
            <div style={{ borderTop: `1px solid ${tc.border}`, padding: "4px 8px 6px" }}>
              <button
                onClick={() => handleSelect("")}
                style={{
                  width: "100%",
                  padding: "4px",
                  fontSize: 11,
                  color: tc.textMuted,
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "center",
                }}
              >
                選択を解除
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
