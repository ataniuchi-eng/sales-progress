"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";

// ===== 型定義 =====
interface CategoryData {
  target: number;
  progress: number;
  forecast: number;
  standby?: number;
}

interface FocusPerson {
  name: string;
  affiliation: string;
  cost: number;
}

interface FocusProject {
  company: string;
  title: string;
  price: number;
  contract: string;
}

interface DayData {
  proper: CategoryData;
  bp: CategoryData;
  fl: CategoryData;
  focusPeople: FocusPerson[];
  focusProjects: FocusProject[];
}

type AllData = Record<string, DayData>;

// ===== ユーティリティ =====
function dateKey(d: Date): string {
  const y = d.getFullYear();
  const m = ("0" + (d.getMonth() + 1)).slice(-2);
  const day = ("0" + d.getDate()).slice(-2);
  return `${y}-${m}-${day}`;
}

function todayKey(): string {
  return dateKey(new Date());
}

function parseDate(key: string): Date {
  const p = key.split("-");
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

function formatDateJP(key: string): string {
  const d = parseDate(key);
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow[d.getDay()]}）`;
}

function formatYen(num: number): string {
  return "¥" + num.toLocaleString("ja-JP");
}

function calcRate(progress: number, target: number): number {
  if (target === 0) return 0;
  return Math.round((progress / target) * 100);
}

function parseNum(str: string): number {
  return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
}

function formatNumStr(num: number): string {
  return num ? num.toLocaleString("ja-JP") : "";
}

function getTitle(): string {
  const now = new Date();
  let month = now.getMonth() + 2;
  if (month > 12) month = 1;
  return `${month}月稼働`;
}

// ===== 空データ =====
function emptyData(): DayData {
  return {
    proper: { target: 0, progress: 0, forecast: 0, standby: 0 },
    bp: { target: 0, progress: 0, forecast: 0 },
    fl: { target: 0, progress: 0, forecast: 0 },
    focusPeople: [],
    focusProjects: [],
  };
}

function getLatestDataForDate(allData: AllData, targetKey: string) {
  if (allData[targetKey]) return { data: allData[targetKey], sourceKey: targetKey, isExact: true };
  const keys = Object.keys(allData).sort().reverse();
  for (const k of keys) {
    if (k <= targetKey) return { data: allData[k], sourceKey: k, isExact: false };
  }
  return null;
}

// ===== メインコンポーネント =====
export default function DashboardPage() {
  const router = useRouter();
  const [allData, setAllData] = useState<AllData>({});
  const [selectedDate, setSelectedDate] = useState(todayKey());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [inputOpen, setInputOpen] = useState(false);
  const [saveDate, setSaveDate] = useState(todayKey());
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 入力フィールド
  const [inp, setInp] = useState({
    properTarget: "", properProgress: "", properForecast: "", properStandby: "",
    bpTarget: "", bpProgress: "", bpForecast: "",
    flTarget: "", flProgress: "", flForecast: "",
  });
  const [focusPeople, setFocusPeople] = useState<FocusPerson[]>([]);
  const [focusProjects, setFocusProjects] = useState<FocusProject[]>([]);

  // Toast
  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // データロード
  useEffect(() => {
    fetch("/api/data")
      .then((r) => {
        if (r.status === 401) { router.push("/login"); return null; }
        return r.json();
      })
      .then((data) => {
        if (data) setAllData(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  // 表示用データ算出
  const result = getLatestDataForDate(allData, selectedDate);
  const displayData = result ? result.data : emptyData();
  const proper = displayData.proper || { target: 0, progress: 0, forecast: 0, standby: 0 };
  const bp = displayData.bp || { target: 0, progress: 0, forecast: 0 };
  const fl = displayData.fl || { target: 0, progress: 0, forecast: 0 };
  const total = {
    target: proper.target + bp.target + fl.target,
    progress: proper.progress + bp.progress + fl.progress,
    forecast: proper.forecast + bp.forecast + fl.forecast,
  };
  const dPeople = Array.isArray(displayData.focusPeople) ? displayData.focusPeople : [];
  const dProjects = Array.isArray(displayData.focusProjects) ? displayData.focusProjects : [];

  const dataSourceInfo = !result
    ? "データなし"
    : result.isExact
    ? "この日のデータを表示中"
    : `${formatDateJP(result.sourceKey)} のデータを反映中`;

  // 入力画面を開く時にデータを読み込む
  const openInput = () => {
    setInputOpen(true);
    setSaveDate(selectedDate);
    if (allData[selectedDate]) {
      const d = allData[selectedDate];
      setInp({
        properTarget: formatNumStr(d.proper?.target || 0),
        properProgress: formatNumStr(d.proper?.progress || 0),
        properForecast: formatNumStr(d.proper?.forecast || 0),
        properStandby: formatNumStr(d.proper?.standby || 0),
        bpTarget: formatNumStr(d.bp?.target || 0),
        bpProgress: formatNumStr(d.bp?.progress || 0),
        bpForecast: formatNumStr(d.bp?.forecast || 0),
        flTarget: formatNumStr(d.fl?.target || 0),
        flProgress: formatNumStr(d.fl?.progress || 0),
        flForecast: formatNumStr(d.fl?.forecast || 0),
      });
      setFocusPeople(d.focusPeople?.length ? [...d.focusPeople] : [{ name: "", affiliation: "プロパー", cost: 0 }]);
      setFocusProjects(d.focusProjects?.length ? [...d.focusProjects] : [{ company: "", title: "", price: 0, contract: "派遣" }]);
    } else {
      setInp({
        properTarget: "", properProgress: "", properForecast: "", properStandby: "",
        bpTarget: "", bpProgress: "", bpForecast: "",
        flTarget: "", flProgress: "", flForecast: "",
      });
      setFocusPeople([{ name: "", affiliation: "プロパー", cost: 0 }]);
      setFocusProjects([{ company: "", title: "", price: 0, contract: "派遣" }]);
    }
  };

  // 保存
  const saveCurrentData = async () => {
    if (!saveDate) { showToast("日付を選択してください"); return; }
    setSaving(true);
    const data: DayData = {
      proper: {
        target: parseNum(inp.properTarget),
        progress: parseNum(inp.properProgress),
        forecast: parseNum(inp.properForecast),
        standby: parseNum(inp.properStandby),
      },
      bp: {
        target: parseNum(inp.bpTarget),
        progress: parseNum(inp.bpProgress),
        forecast: parseNum(inp.bpForecast),
      },
      fl: {
        target: parseNum(inp.flTarget),
        progress: parseNum(inp.flProgress),
        forecast: parseNum(inp.flForecast),
      },
      focusPeople: focusPeople.filter((p) => p.name || p.cost),
      focusProjects: focusProjects.filter((p) => p.company || p.title || p.price),
    };

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: saveDate, data }),
      });
      if (!res.ok) throw new Error();
      setAllData((prev) => ({ ...prev, [saveDate]: data }));
      showToast(`${formatDateJP(saveDate)} に保存しました`);
    } catch {
      showToast("保存に失敗しました");
    }
    setSaving(false);
  };

  // エクスポート
  const exportData = () => {
    if (Object.keys(allData).length === 0) { showToast("データがありません"); return; }
    const json = JSON.stringify(allData, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-dashboard-data_${todayKey()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("データをエクスポートしました");
  };

  // インポート
  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const imported = JSON.parse(text);
      if (typeof imported !== "object" || Array.isArray(imported)) throw new Error();
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bulkData: imported }),
      });
      if (!res.ok) throw new Error();
      const { count } = await res.json();
      setAllData((prev) => ({ ...prev, ...imported }));
      showToast(`${count}件のデータをインポートしました`);
    } catch {
      showToast("JSONファイルの読み込みに失敗しました");
    }
    e.target.value = "";
  };

  // ログアウト
  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  // 数値入力フォーマット
  const handleNumInput = (field: string, value: string) => {
    const raw = value.replace(/[^0-9]/g, "");
    const formatted = raw ? parseInt(raw, 10).toLocaleString("ja-JP") : "";
    setInp((prev) => ({ ...prev, [field]: formatted }));
  };

  // カレンダー
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const today = todayKey();

  const changeMonth = (delta: number) => {
    let m = calMonth + delta;
    let y = calYear;
    if (m < 0) { m = 11; y--; }
    if (m > 11) { m = 0; y++; }
    setCalMonth(m);
    setCalYear(y);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", fontFamily: "'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif" }}>
        <p style={{ fontSize: 18, color: "#666" }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif", background: "#f0f2f5", color: "#333", minHeight: "100vh", padding: 24 }}>
      {/* ヘッダー */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", maxWidth: 1400, margin: "0 auto 24px" }}>
        <h1 style={{ fontSize: 32, color: "#1a1a2e", margin: 0 }}>{getTitle()}</h1>
        <button onClick={handleLogout} style={{ padding: "8px 20px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, color: "#666" }}>
          ログアウト
        </button>
      </div>

      <div style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
        {/* サイドバー: カレンダー */}
        <div style={{ width: 300, flexShrink: 0 }}>
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: "sticky", top: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{calYear}年{calMonth + 1}月</h3>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => changeMonth(-1)} style={calBtnStyle}>&#9664;</button>
                <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setSelectedDate(todayKey()); }} style={{ ...calBtnStyle, width: "auto", padding: "0 10px", fontSize: 12 }}>今月</button>
                <button onClick={() => changeMonth(1)} style={calBtnStyle}>&#9654;</button>
              </div>
            </div>

            {/* 曜日 */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 4 }}>
              {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                <span key={d} style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#e63946" : i === 6 ? "#0077b6" : "#999", padding: "4px 0" }}>{d}</span>
              ))}
            </div>

            {/* 日付グリッド */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const d = i + 1;
                const dt = new Date(calYear, calMonth, d);
                const key = dateKey(dt);
                const dow = dt.getDay();
                const isToday = key === today;
                const isSelected = key === selectedDate;
                const hasData = !!allData[key];
                return (
                  <div
                    key={d}
                    onClick={() => setSelectedDate(key)}
                    style={{
                      aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 14, borderRadius: 8, cursor: "pointer", position: "relative",
                      border: isSelected ? "2px solid #0077b6" : "2px solid transparent",
                      background: isToday ? "#1a1a2e" : "transparent",
                      color: isToday ? "#fff" : dow === 0 ? "#e63946" : dow === 6 ? "#0077b6" : "#333",
                      fontWeight: isToday || isSelected ? 700 : 400,
                      transition: "all 0.2s",
                    }}
                  >
                    {d}
                    {hasData && (
                      <span style={{
                        position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: "50%",
                        background: isToday ? "#4cc9f0" : "#0077b6",
                      }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* 選択日ラベル */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee", textAlign: "center" }}>
              <strong style={{ color: "#1a1a2e", fontSize: 16 }}>{formatDateJP(selectedDate)}</strong>
              <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 4 }}>{dataSourceInfo}</span>
            </div>

            {/* アクション */}
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee", display: "flex", gap: 8 }}>
              <button onClick={exportData} style={actionBtnStyle}>エクスポート</button>
              <label style={actionBtnStyle}>
                インポート
                <input type="file" accept=".json" onChange={importData} style={{ display: "none" }} />
              </label>
            </div>
          </div>
        </div>

        {/* メインコンテンツ */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* カード4枚 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }}>
            <SummaryCard title="全体" data={total} rate={calcRate(total.progress, total.target)} isTotal />
            <SummaryCard title="プロパー" data={proper} rate={calcRate(proper.progress, proper.target)} standby={proper.standby} />
            <SummaryCard title="BP" data={bp} rate={calcRate(bp.progress, bp.target)} />
            <SummaryCard title="フリーランス" data={fl} rate={calcRate(fl.progress, fl.target)} />
          </div>

          {/* 注力セクション */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <FocusPeopleDisplay people={dPeople} />
            <FocusProjectsDisplay projects={dProjects} />
          </div>

          {/* 入力トグル */}
          <button onClick={() => inputOpen ? setInputOpen(false) : openInput()} style={{
            display: "block", width: "100%", padding: "14px", fontSize: 15, fontWeight: 700,
            background: inputOpen ? "#1a1a2e" : "#fff", color: inputOpen ? "#fff" : "#1a1a2e",
            border: inputOpen ? "none" : "2px solid #1a1a2e", borderRadius: 12, cursor: "pointer",
            transition: "all 0.3s", marginBottom: inputOpen ? 24 : 0,
          }}>
            {inputOpen ? "入力画面を閉じる" : "入力画面を開く"}
          </button>

          {/* 入力セクション */}
          {inputOpen && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 32, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>数値入力</h2>

              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
                <label style={{ fontSize: 14, color: "#666" }}>保存日付：</label>
                <input type="date" value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} />
                <button onClick={saveCurrentData} disabled={saving} style={{
                  padding: "10px 24px", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                  border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? "保存中..." : "この日付で保存"}
                </button>
              </div>

              {/* 数値入力3列 */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
                <InputGroup title="プロパー" fields={[
                  { label: "目標", value: inp.properTarget, key: "properTarget" },
                  { label: "進捗", value: inp.properProgress, key: "properProgress" },
                  { label: "見込", value: inp.properForecast, key: "properForecast" },
                  { label: "待機（人数）", value: inp.properStandby, key: "properStandby" },
                ]} onChange={handleNumInput} />
                <InputGroup title="BP" fields={[
                  { label: "目標", value: inp.bpTarget, key: "bpTarget" },
                  { label: "進捗", value: inp.bpProgress, key: "bpProgress" },
                  { label: "見込", value: inp.bpForecast, key: "bpForecast" },
                ]} onChange={handleNumInput} />
                <InputGroup title="フリーランス" fields={[
                  { label: "目標", value: inp.flTarget, key: "flTarget" },
                  { label: "進捗", value: inp.flProgress, key: "flProgress" },
                  { label: "見込", value: inp.flForecast, key: "flForecast" },
                ]} onChange={handleNumInput} />
              </div>

              {/* 注力入力 */}
              <div style={{ marginTop: 24, paddingTop: 20, borderTop: "2px solid #e0e0e0" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>注力入力</h3>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>注力人材</h4>
                {focusPeople.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>氏名</span>
                      <input type="text" value={p.name} onChange={(e) => {
                        const arr = [...focusPeople]; arr[i] = { ...arr[i], name: e.target.value }; setFocusPeople(arr);
                      }} placeholder="氏名" style={focusInputStyle} />
                    </div>
                    <div style={{ width: 130 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>所属</span>
                      <select value={p.affiliation} onChange={(e) => {
                        const arr = [...focusPeople]; arr[i] = { ...arr[i], affiliation: e.target.value }; setFocusPeople(arr);
                      }} style={focusSelectStyle}>
                        <option>プロパー</option><option>BP</option><option>フリーランス</option>
                      </select>
                    </div>
                    <div style={{ width: 120 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>仕入れ額</span>
                      <input type="text" inputMode="numeric" value={p.cost ? p.cost.toLocaleString("ja-JP") : ""} onChange={(e) => {
                        const arr = [...focusPeople]; arr[i] = { ...arr[i], cost: parseNum(e.target.value) }; setFocusPeople(arr);
                      }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} />
                    </div>
                    <button onClick={() => setFocusPeople(focusPeople.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                  </div>
                ))}
                <button onClick={() => setFocusPeople([...focusPeople, { name: "", affiliation: "プロパー", cost: 0 }])} style={addBtnStyle}>＋ 人材を追加</button>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, marginTop: 24 }}>注力案件</h4>
                {focusProjects.map((p, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8 }}>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>企業名</span>
                      <input type="text" value={p.company} onChange={(e) => {
                        const arr = [...focusProjects]; arr[i] = { ...arr[i], company: e.target.value }; setFocusProjects(arr);
                      }} placeholder="企業名" style={focusInputStyle} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>案件タイトル</span>
                      <input type="text" value={p.title} onChange={(e) => {
                        const arr = [...focusProjects]; arr[i] = { ...arr[i], title: e.target.value }; setFocusProjects(arr);
                      }} placeholder="案件タイトル" style={focusInputStyle} />
                    </div>
                    <div style={{ width: 120 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>単価</span>
                      <input type="text" inputMode="numeric" value={p.price ? p.price.toLocaleString("ja-JP") : ""} onChange={(e) => {
                        const arr = [...focusProjects]; arr[i] = { ...arr[i], price: parseNum(e.target.value) }; setFocusProjects(arr);
                      }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} />
                    </div>
                    <div style={{ width: 130 }}>
                      <span style={{ fontSize: 10, color: "#999" }}>契約形態</span>
                      <select value={p.contract} onChange={(e) => {
                        const arr = [...focusProjects]; arr[i] = { ...arr[i], contract: e.target.value }; setFocusProjects(arr);
                      }} style={focusSelectStyle}>
                        <option>派遣</option><option>準委任</option><option>両方OK</option>
                      </select>
                    </div>
                    <button onClick={() => setFocusProjects(focusProjects.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                  </div>
                ))}
                <button onClick={() => setFocusProjects([...focusProjects, { company: "", title: "", price: 0, contract: "派遣" }])} style={addBtnStyle}>＋ 案件を追加</button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", bottom: 24, right: 24, padding: "12px 24px", background: "#1a1a2e",
          color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600,
          boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 1000,
        }}>
          {toast}
        </div>
      )}
    </div>
  );
}

// ===== サブコンポーネント =====
function SummaryCard({ title, data, rate, isTotal, standby }: {
  title: string; data: { target: number; progress: number; forecast: number };
  rate: number; isTotal?: boolean; standby?: number;
}) {
  const bg = isTotal ? "linear-gradient(135deg, #1a1a2e, #16213e)" : "#fff";
  const color = isTotal ? "#fff" : "#333";
  const labelColor = isTotal ? "rgba(255,255,255,0.7)" : "#999";
  const barBg = isTotal ? "rgba(255,255,255,0.2)" : "#f0f2f5";
  const barFill = isTotal ? "#4cc9f0" : rate >= 100 ? "#2ecc71" : rate >= 70 ? "#f39c12" : "#e63946";

  return (
    <div style={{ background: bg, borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", color }}>
      <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${isTotal ? "rgba(255,255,255,0.15)" : "#f0f2f5"}` }}>{title}</div>
      <Row label="目標" value={formatYen(data.target)} labelColor={labelColor} valueColor={isTotal ? "#fff" : "#1a1a2e"} />
      <Row label="進捗" value={formatYen(data.progress)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : "#0077b6"} />
      <Row label="見込" value={formatYen(data.forecast)} labelColor={labelColor} valueColor={isTotal ? "#a8e6cf" : "#2ecc71"} />
      {standby !== undefined && <Row label="待機" value={`${standby}名`} labelColor={labelColor} valueColor={isTotal ? "#ffd6a5" : "#f39c12"} />}
      <div style={{ marginTop: 16, paddingTop: 12, borderTop: `1px solid ${isTotal ? "rgba(255,255,255,0.15)" : "#f0f2f5"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 6 }}>
          <span style={{ color: labelColor }}>達成率</span>
          <span style={{ fontWeight: 700, color: barFill }}>{rate}%</span>
        </div>
        <div style={{ height: 8, borderRadius: 4, background: barBg, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", borderRadius: 4, background: barFill, transition: "width 0.5s" }} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 14 }}>
      <span style={{ color: labelColor }}>{label}</span>
      <span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}

function FocusPeopleDisplay({ people }: { people: FocusPerson[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>注力人材</h3>
      {people.length === 0 ? (
        <p style={{ color: "#bbb", fontSize: 14 }}>未入力</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f2f5" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 }}>氏名</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 }}>所属</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "#999", fontWeight: 600 }}>仕入れ額</th>
            </tr>
          </thead>
          <tbody>
            {people.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                <td style={{ padding: "10px 0", fontWeight: 600, color: "#1a1a2e" }}>{p.name || "-"}</td>
                <td style={{ padding: "10px 0" }}>
                  <Badge text={p.affiliation} type={p.affiliation === "BP" ? "bp" : p.affiliation === "フリーランス" ? "fl" : "proper"} />
                </td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#1a1a2e" }}>{p.cost ? formatYen(p.cost) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function FocusProjectsDisplay({ projects }: { projects: FocusProject[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>注力案件</h3>
      {projects.length === 0 ? (
        <p style={{ color: "#bbb", fontSize: 14 }}>未入力</p>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #f0f2f5" }}>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 }}>企業名</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 }}>案件</th>
              <th style={{ textAlign: "right", padding: "8px 0", color: "#999", fontWeight: 600 }}>単価</th>
              <th style={{ textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 }}>契約</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                <td style={{ padding: "10px 0", fontWeight: 600, color: "#1a1a2e" }}>{p.company || "-"}</td>
                <td style={{ padding: "10px 0", color: "#555" }}>{p.title || "-"}</td>
                <td style={{ padding: "10px 0", textAlign: "right", fontWeight: 600, color: "#1a1a2e" }}>{p.price ? formatYen(p.price) : "-"}</td>
                <td style={{ padding: "10px 0" }}>
                  <Badge text={p.contract} type={p.contract === "準委任" ? "quasi" : p.contract === "両方OK" ? "both" : "dispatch"} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function Badge({ text, type }: { text: string; type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    proper: { bg: "#e8f4fd", color: "#0077b6" },
    bp: { bg: "#fff3e0", color: "#f57c00" },
    fl: { bg: "#e8f5e9", color: "#388e3c" },
    dispatch: { bg: "#e8f4fd", color: "#0077b6" },
    quasi: { bg: "#fce4ec", color: "#c62828" },
    both: { bg: "#f3e5f5", color: "#7b1fa2" },
  };
  const c = colors[type] || colors.proper;
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>
      {text}
    </span>
  );
}

function InputGroup({ title, fields, onChange }: {
  title: string;
  fields: { label: string; value: string; key: string }[];
  onChange: (key: string, value: string) => void;
}) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #e0e0e0" }}>{title}</h3>
      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>{f.label}</label>
          <input
            type="text"
            inputMode="numeric"
            value={f.value}
            onChange={(e) => onChange(f.key, e.target.value)}
            placeholder="0"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }}
          />
        </div>
      ))}
    </div>
  );
}

// ===== 共通スタイル =====
const calBtnStyle: React.CSSProperties = {
  width: 32, height: 32, border: "1px solid #ddd", borderRadius: 8,
  background: "#fff", cursor: "pointer", fontSize: 16, display: "flex",
  alignItems: "center", justifyContent: "center",
};

const actionBtnStyle: React.CSSProperties = {
  flex: 1, padding: 8, fontSize: 12, fontWeight: 600, border: "1px solid #ddd",
  borderRadius: 8, background: "#fff", cursor: "pointer", color: "#333",
  textAlign: "center", display: "inline-block",
};

const focusInputStyle: React.CSSProperties = {
  width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6,
  fontSize: 13, outline: "none", boxSizing: "border-box",
};

const focusSelectStyle: React.CSSProperties = {
  width: "100%", padding: "7px 8px", border: "1px solid #ddd", borderRadius: 6,
  fontSize: 13, outline: "none", background: "#fff", cursor: "pointer",
};

const removeBtnStyle: React.CSSProperties = {
  width: 28, height: 28, border: "none", background: "#fee", color: "#e63946",
  borderRadius: 6, cursor: "pointer", fontSize: 16, fontWeight: 700,
  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
};

const addBtnStyle: React.CSSProperties = {
  padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0077b6",
  background: "#e8f4fd", border: "1px dashed #0077b6", borderRadius: 8,
  cursor: "pointer", width: "100%", marginTop: 8,
};
