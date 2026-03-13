"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ===== 担当者リスト =====
const STAFF_LIST = [
  "麻生", "羽鳥", "五十嵐", "島津", "山田", "黄", "上杉", "杉俣",
  "栗山", "松浦", "佐久間", "関", "今村", "平川", "池田", "竹内", "柿島",
];

// ===== ポジションリスト =====
const POSITION_LIST = ["AE", "Infra", "DD", "PMO", "PL", "PM", "Consultant"];

// ===== 日本の祝日（2026-2028） =====
const JAPAN_HOLIDAYS: Record<string, string> = {
  "2026-01-01": "元日", "2026-01-12": "成人の日", "2026-02-11": "建国記念の日", "2026-02-23": "天皇誕生日",
  "2026-03-20": "春分の日", "2026-04-29": "昭和の日", "2026-05-03": "憲法記念日", "2026-05-04": "みどりの日",
  "2026-05-05": "こどもの日", "2026-05-06": "振替休日", "2026-07-20": "海の日", "2026-08-11": "山の日",
  "2026-09-21": "敬老の日", "2026-09-22": "国民の休日", "2026-09-23": "秋分の日",
  "2026-10-12": "スポーツの日", "2026-11-03": "文化の日", "2026-11-23": "勤労感謝の日",
  "2027-01-01": "元日", "2027-01-11": "成人の日", "2027-02-11": "建国記念の日", "2027-02-23": "天皇誕生日",
  "2027-03-21": "春分の日", "2027-04-29": "昭和の日", "2027-05-03": "憲法記念日", "2027-05-04": "みどりの日",
  "2027-05-05": "こどもの日", "2027-07-19": "海の日", "2027-08-11": "山の日",
  "2027-09-20": "敬老の日", "2027-09-23": "秋分の日",
  "2027-10-11": "スポーツの日", "2027-11-03": "文化の日", "2027-11-23": "勤労感謝の日",
  "2028-01-01": "元日", "2028-01-10": "成人の日", "2028-02-11": "建国記念の日", "2028-02-23": "天皇誕生日",
  "2028-03-20": "春分の日", "2028-04-29": "昭和の日", "2028-05-03": "憲法記念日", "2028-05-04": "みどりの日",
  "2028-05-05": "こどもの日", "2028-07-17": "海の日", "2028-08-11": "山の日",
  "2028-09-18": "敬老の日", "2028-09-22": "秋分の日",
  "2028-10-09": "スポーツの日", "2028-11-03": "文化の日", "2028-11-23": "勤労感謝の日",
};

// ===== 営業活動のフィールド定義 =====
const ACTIVITY_FIELDS: { key: keyof StaffActivity; label: string; color: string }[] = [
  { key: "ordersRA", label: "RA受注数", color: "#e74c3c" },
  { key: "ordersCA", label: "CA受注数", color: "#9b59b6" },
  { key: "interviewSetups", label: "面談設定数", color: "#0077b6" },
  { key: "interviewsConducted", label: "面談実施数", color: "#e67e22" },
  { key: "appointmentAcquisitions", label: "案件アポ獲得企業数", color: "#2ecc71" },
];

// ===== 勤務場所リスト =====
const LOCATION_LIST = ["出社", "WFH", "ハイブリッド"];

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
  staff: string;
  position: string;
  skill: string;
}

interface FocusProject {
  company: string;
  title: string;
  price: number;
  contract: string;
  staff: string;
  position: string;
  location: string;
}

interface RACompany {
  name: string;
  staff: string;
}

interface RAData {
  acquisitionTarget: number;
  acquisitionProgress: number;
  acquisitionCompanies: RACompany[];
  joinTarget: number;
  joinProgress: number;
  joinCompanies: RACompany[];
}

interface StaffActivity {
  staff: string;
  interviewSetups: number;
  interviewsConducted: number;
  appointmentAcquisitions: number;
  ordersRA: number;
  ordersCA: number;
}

interface DayData {
  proper: CategoryData;
  bp: CategoryData;
  fl: CategoryData;
  focusPeople: FocusPerson[];
  focusProjects: FocusProject[];
  announcements: string[];
  ra: RAData;
  staffActivities: StaffActivity[];
}

type AllData = Record<string, DayData>;

// ===== ユーティリティ =====
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
}
function todayKey(): string { return dateKey(new Date()); }
function parseDate(key: string): Date {
  const p = key.split("-");
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}
function formatDateJP(key: string): string {
  const d = parseDate(key);
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow[d.getDay()]}）`;
}
function formatYen(num: number): string { return "¥" + num.toLocaleString("ja-JP"); }
function calcRate(progress: number, target: number): number {
  return target === 0 ? 0 : Math.round((progress / target) * 100);
}
function parseNum(str: string): number { return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0; }
function formatNumStr(num: number): string { return num ? num.toLocaleString("ja-JP") : ""; }
function getTitle(): string {
  let month = new Date().getMonth() + 2;
  if (month > 12) month = 1;
  return `${month}月稼働`;
}
// 営業日判定（土日祝以外）
function isBusinessDay(key: string): boolean {
  const d = parseDate(key);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  if (JAPAN_HOLIDAYS[key]) return false;
  return true;
}
// 翌営業日を取得
function getNextBusinessDay(fromKey: string): string {
  const d = parseDate(fromKey);
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() + 1);
    const k = dateKey(d);
    if (isBusinessDay(k)) return k;
  }
  return dateKey(d);
}
// 前営業日を取得
function getPrevBusinessDay(fromKey: string): string {
  const d = parseDate(fromKey);
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() - 1);
    const k = dateKey(d);
    if (isBusinessDay(k)) return k;
  }
  return dateKey(d);
}
function emptyData(): DayData {
  return {
    proper: { target: 0, progress: 0, forecast: 0, standby: 0 },
    bp: { target: 0, progress: 0, forecast: 0 },
    fl: { target: 0, progress: 0, forecast: 0 },
    focusPeople: [], focusProjects: [], announcements: [],
    ra: { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] },
    staffActivities: [],
  };
}
function getLatestDataForDate(allData: AllData, targetKey: string) {
  if (allData[targetKey]) return { data: allData[targetKey], sourceKey: targetKey, isExact: true };
  const keys = Object.keys(allData).sort().reverse();
  for (const k of keys) { if (k <= targetKey) return { data: allData[k], sourceKey: k, isExact: false }; }
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
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [saveDate, setSaveDate] = useState(selectedDate);
  const [toast, setToast] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "monthly">("main");
  const [monthlyYM, setMonthlyYM] = useState(`${new Date().getFullYear()}-${("0" + (new Date().getMonth() + 1)).slice(-2)}`);

  const [inp, setInp] = useState({
    properTarget: "", properProgress: "", properForecast: "", properStandby: "",
    bpTarget: "", bpProgress: "", bpForecast: "",
    flTarget: "", flProgress: "", flForecast: "",
  });
  const [focusPeople, setFocusPeople] = useState<FocusPerson[]>([]);
  const [focusProjects, setFocusProjects] = useState<FocusProject[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [raInp, setRaInp] = useState({ acquisitionTarget: "", acquisitionProgress: "", joinTarget: "", joinProgress: "" });
  const [raAcqCompanies, setRaAcqCompanies] = useState<RACompany[]>([]);
  const [raJoinCompanies, setRaJoinCompanies] = useState<RACompany[]>([]);
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>([]);

  // レスポンシブ検知
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // モバイルではカレンダー非表示がデフォルト
  useEffect(() => { if (isMobile) setCalendarOpen(false); }, [isMobile]);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  }, []);

  // データが実質空かどうか判定（金額系がすべて0、人材・案件が空）
  const isDataEmpty = useCallback((d: DayData): boolean => {
    const p = d.proper || { target: 0, progress: 0, forecast: 0 };
    const b = d.bp || { target: 0, progress: 0, forecast: 0 };
    const f = d.fl || { target: 0, progress: 0, forecast: 0 };
    const numbersEmpty = p.target === 0 && p.progress === 0 && p.forecast === 0
      && b.target === 0 && b.progress === 0 && b.forecast === 0
      && f.target === 0 && f.progress === 0 && f.forecast === 0;
    const peopleEmpty = !d.focusPeople || d.focusPeople.length === 0;
    const projectsEmpty = !d.focusProjects || d.focusProjects.length === 0;
    return numbersEmpty && peopleEmpty && projectsEmpty;
  }, []);

  // 前営業日データを自動継承してDBに保存する関数（マージ方式）
  const inheritDataForDate = useCallback(async (targetKey: string, currentAllData: AllData) => {
    // 前営業日のデータを取得（土日祝を飛ばす）
    const prevBizDay = getPrevBusinessDay(targetKey);
    let prevData: DayData | null = null;
    // 前営業日から遡って最新の実データを探す
    const keys = Object.keys(currentAllData).sort().reverse();
    for (const k of keys) {
      if (k <= prevBizDay && isBusinessDay(k) && !isDataEmpty(currentAllData[k])) {
        prevData = currentAllData[k];
        break;
      }
    }
    if (!prevData) return; // 前営業日データがない場合はスキップ

    const existing = currentAllData[targetKey];
    // 既にデータがあり、金額等が入力済みなら継承不要
    if (existing && !isDataEmpty(existing)) return;

    // マージ：前日データをベースに、当日の既存データ（RA等）を上書き
    const merged: DayData = JSON.parse(JSON.stringify(prevData));
    // 担当別活動は日次入力のため一切継承しない（当日分は保存時にのみ書き込まれる）
    merged.staffActivities = existing?.staffActivities?.length ? existing.staffActivities : [];
    if (existing) {
      // 当日に既に入っているデータを優先マージ
      if (existing.announcements?.length) merged.announcements = existing.announcements;
      if (existing.ra) {
        const r = existing.ra;
        if (r.acquisitionTarget || r.acquisitionProgress || r.acquisitionCompanies?.length || r.joinTarget || r.joinProgress || r.joinCompanies?.length) {
          merged.ra = existing.ra;
        }
      }
    }
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: targetKey, data: merged }) });
      if (res.ok) {
        setAllData((prev) => ({ ...prev, [targetKey]: merged }));
      }
    } catch { /* 失敗してもサイレント */ }
  }, [isDataEmpty]);

  // データロード
  useEffect(() => {
    fetch("/api/data")
      .then((r) => { if (r.status === 401) { router.push("/login"); return null; } return r.json(); })
      .then((data) => {
        if (data) {
          setAllData(data);
          // ロード完了後、今日のデータがなければ前日から自動継承
          const today = todayKey();
          if (!data[today]) {
            inheritDataForDate(today, data);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router, inheritDataForDate]);

  // 日付選択時に前日データを自動継承
  useEffect(() => {
    if (loading || !selectedDate || Object.keys(allData).length === 0) return;
    inheritDataForDate(selectedDate, allData);
  }, [selectedDate, loading]); // eslint-disable-line react-hooks/exhaustive-deps

  // 表示用データ
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
  const dAnnouncements = Array.isArray(displayData.announcements) ? displayData.announcements.filter(a => a) : [];
  const dRA = displayData.ra || { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] };
  // 担当別活動は選択日の前営業日のデータのみ表示（土日祝スキップ）
  const prevBizDayKey = getPrevBusinessDay(selectedDate);
  const prevDayStaffActivities = (() => {
    const d = allData[prevBizDayKey];
    if (d && Array.isArray(d.staffActivities)) {
      return d.staffActivities.filter(s => s.staff);
    }
    return [];
  })();
  const dStaffActivities = prevDayStaffActivities;
  const dataSourceInfo = !result ? "データなし" : result.isExact ? "この日のデータを表示中" : `${formatDateJP(result.sourceKey)} のデータを反映中`;

  // 入力画面を開く
  const openInput = () => {
    setInputOpen(true);
    setSaveDate(selectedDate);
    if (allData[selectedDate]) {
      const d = allData[selectedDate];
      setInp({
        properTarget: formatNumStr(d.proper?.target || 0), properProgress: formatNumStr(d.proper?.progress || 0),
        properForecast: formatNumStr(d.proper?.forecast || 0), properStandby: formatNumStr(d.proper?.standby || 0),
        bpTarget: formatNumStr(d.bp?.target || 0), bpProgress: formatNumStr(d.bp?.progress || 0), bpForecast: formatNumStr(d.bp?.forecast || 0),
        flTarget: formatNumStr(d.fl?.target || 0), flProgress: formatNumStr(d.fl?.progress || 0), flForecast: formatNumStr(d.fl?.forecast || 0),
      });
      setFocusPeople(d.focusPeople?.length ? d.focusPeople.map(p => ({ ...p, staff: p.staff || "", position: p.position || "", skill: p.skill || "" })) : [{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
      setFocusProjects(d.focusProjects?.length ? d.focusProjects.map(p => ({ ...p, staff: p.staff || "", position: p.position || "", location: p.location || "" })) : [{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
      setAnnouncements(d.announcements?.length ? [...d.announcements] : [""]);
      const ra = d.ra || { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] };
      setRaInp({ acquisitionTarget: formatNumStr(ra.acquisitionTarget), acquisitionProgress: formatNumStr(ra.acquisitionProgress), joinTarget: formatNumStr(ra.joinTarget), joinProgress: formatNumStr(ra.joinProgress) });
      setRaAcqCompanies(ra.acquisitionCompanies?.length ? ra.acquisitionCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
      setRaJoinCompanies(ra.joinCompanies?.length ? ra.joinCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
      // 担当別活動は日次入力のため常に空で開始（前日データを引き継がない）
      setStaffActivities([{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0 }]);
    } else {
      // データがない場合は前日までの最新データをフォールバックで表示
      const fallback = getLatestDataForDate(allData, selectedDate);
      if (fallback && !fallback.isExact) {
        const d = fallback.data;
        setInp({
          properTarget: formatNumStr(d.proper?.target || 0), properProgress: formatNumStr(d.proper?.progress || 0),
          properForecast: formatNumStr(d.proper?.forecast || 0), properStandby: formatNumStr(d.proper?.standby || 0),
          bpTarget: formatNumStr(d.bp?.target || 0), bpProgress: formatNumStr(d.bp?.progress || 0), bpForecast: formatNumStr(d.bp?.forecast || 0),
          flTarget: formatNumStr(d.fl?.target || 0), flProgress: formatNumStr(d.fl?.progress || 0), flForecast: formatNumStr(d.fl?.forecast || 0),
        });
        setFocusPeople(d.focusPeople?.length ? d.focusPeople.map(p => ({ ...p, staff: p.staff || "", position: p.position || "", skill: p.skill || "" })) : [{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
        setFocusProjects(d.focusProjects?.length ? d.focusProjects.map(p => ({ ...p, staff: p.staff || "", position: p.position || "", location: p.location || "" })) : [{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
        setAnnouncements(d.announcements?.length ? [...d.announcements] : [""]);
        const ra = d.ra || { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] };
        setRaInp({ acquisitionTarget: formatNumStr(ra.acquisitionTarget), acquisitionProgress: formatNumStr(ra.acquisitionProgress), joinTarget: formatNumStr(ra.joinTarget), joinProgress: formatNumStr(ra.joinProgress) });
        setRaAcqCompanies(ra.acquisitionCompanies?.length ? ra.acquisitionCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
        setRaJoinCompanies(ra.joinCompanies?.length ? ra.joinCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
        // 担当別活動は日次入力のため常に空で開始
        setStaffActivities([{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0 }]);
      } else {
        setInp({ properTarget: "", properProgress: "", properForecast: "", properStandby: "", bpTarget: "", bpProgress: "", bpForecast: "", flTarget: "", flProgress: "", flForecast: "" });
        setFocusPeople([{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
        setFocusProjects([{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
        setAnnouncements([""]);
        setRaInp({ acquisitionTarget: "", acquisitionProgress: "", joinTarget: "", joinProgress: "" });
        setRaAcqCompanies([{ name: "", staff: "" }]);
        setRaJoinCompanies([{ name: "", staff: "" }]);
        setStaffActivities([{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0 }]);
      }
    }
  };

  // 保存
  const saveCurrentData = async () => {
    if (!saveDate) { showToast("日付を選択してください"); return; }
    setSaving(true);
    const data: DayData = {
      proper: { target: parseNum(inp.properTarget), progress: parseNum(inp.properProgress), forecast: parseNum(inp.properForecast), standby: parseNum(inp.properStandby) },
      bp: { target: parseNum(inp.bpTarget), progress: parseNum(inp.bpProgress), forecast: parseNum(inp.bpForecast) },
      fl: { target: parseNum(inp.flTarget), progress: parseNum(inp.flProgress), forecast: parseNum(inp.flForecast) },
      focusPeople: focusPeople.filter((p) => p.name || p.cost),
      focusProjects: focusProjects.filter((p) => p.company || p.title || p.price),
      announcements: announcements.filter((a) => a.trim()),
      staffActivities: staffActivities.filter(s => s.staff && (s.interviewSetups || s.interviewsConducted || s.appointmentAcquisitions || s.ordersRA || s.ordersCA)),
      ra: {
        acquisitionTarget: parseNum(raInp.acquisitionTarget), acquisitionProgress: parseNum(raInp.acquisitionProgress),
        acquisitionCompanies: raAcqCompanies.filter(c => c.name),
        joinTarget: parseNum(raInp.joinTarget), joinProgress: parseNum(raInp.joinProgress),
        joinCompanies: raJoinCompanies.filter(c => c.name),
      },
    };
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: saveDate, data }) });
      if (!res.ok) throw new Error();
      setAllData((prev) => ({ ...prev, [saveDate]: data }));
      showToast(`${formatDateJP(saveDate)} に保存しました`);
    } catch { showToast("保存に失敗しました"); }
    setSaving(false);
  };

  const handleLogout = async () => { await fetch("/api/auth/logout", { method: "POST" }); router.push("/login"); };
  const handleNumInput = (field: string, value: string) => {
    const raw = value.replace(/[^0-9]/g, "");
    setInp((prev) => ({ ...prev, [field]: raw ? parseInt(raw, 10).toLocaleString("ja-JP") : "" }));
  };
  const handleRaNumInput = (field: string, value: string) => {
    const raw = value.replace(/[^0-9]/g, "");
    setRaInp((prev) => ({ ...prev, [field]: raw ? parseInt(raw, 10).toLocaleString("ja-JP") : "" }));
  };

  // カレンダー
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const firstDay = new Date(calYear, calMonth, 1).getDay();
  const today = todayKey();
  const changeMonth = (delta: number) => {
    let m = calMonth + delta, y = calYear;
    if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; }
    setCalMonth(m); setCalYear(y);
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f0f2f5", fontFamily: "var(--font)" }}>
        <p style={{ fontSize: 18, color: "#666" }}>読み込み中...</p>
      </div>
    );
  }

  return (
    <>
      <style>{`
        :root { --font: 'Segoe UI', 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif; }
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        @media (max-width: 767px) {
          .layout-flex { flex-direction: column !important; }
          .sidebar { width: 100% !important; }
          .card-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .focus-grid { grid-template-columns: 1fr !important; }
          .input-3col { grid-template-columns: 1fr !important; }
          .focus-row-flex { flex-wrap: wrap !important; }
          .focus-row-flex > div { min-width: 0 !important; }
          .focus-row-flex .fw-money, .focus-row-flex .fw-select { width: 100% !important; }
        }
        @media (max-width: 480px) {
          .card-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
      <div style={{ fontFamily: "var(--font)", background: "#f0f2f5", color: "#333", minHeight: "100vh", padding: isMobile ? 12 : 24 }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", maxWidth: 1400, margin: "0 auto 16px", position: "relative" }}>
          <button onClick={() => setCalendarOpen(!calendarOpen)} title={calendarOpen ? "サイドバーを閉じる" : "サイドバーを開く"} style={{
            width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 8, flexShrink: 0,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {calendarOpen ? (
                <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="14" y1="9" x2="19" y2="9" /><line x1="14" y1="15" x2="19" y2="15" /></>
              ) : (
                <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="14,10 17,12 14,14" /></>
              )}
            </svg>
          </button>
          <h1 style={{ fontSize: isMobile ? 22 : 32, color: "#1a1a2e", margin: 0, flex: 1, textAlign: "center" }}>{getTitle()}</h1>
          <button onClick={handleLogout} style={{ padding: "8px 16px", background: "#fff", border: "1px solid #ddd", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#666", flexShrink: 0 }}>
            ログアウト
          </button>
        </div>

        {/* タブ切り替え */}
        <div style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto 16px", borderBottom: "2px solid #e0e0e0" }}>
          {[{ key: "main" as const, label: "メイン" }, { key: "monthly" as const, label: "月別営業活動成績" }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", borderBottom: activeTab === tab.key ? "3px solid #0077b6" : "3px solid transparent",
              background: "transparent", color: activeTab === tab.key ? "#0077b6" : "#999", marginBottom: -2,
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "monthly" && (
          <MonthlyActivityView allData={allData} monthlyYM={monthlyYM} setMonthlyYM={setMonthlyYM} isMobile={isMobile} />
        )}

        {activeTab === "main" && <div className="layout-flex" style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
          {/* サイドバー: カレンダー */}
          {calendarOpen && (
            <div className="sidebar" style={{ width: 300, flexShrink: 0 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", position: isMobile ? "static" : "sticky", top: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{calYear}年{calMonth + 1}月</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => changeMonth(-1)} style={calBtnStyle}>&#9664;</button>
                    <button onClick={() => { setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setSelectedDate(todayKey()); setSaveDate(todayKey()); }} style={{ ...calBtnStyle, width: "auto", padding: "0 10px", fontSize: 12 }}>今月</button>
                    <button onClick={() => changeMonth(1)} style={calBtnStyle}>&#9654;</button>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", marginBottom: 4 }}>
                  {["日", "月", "火", "水", "木", "金", "土"].map((d, i) => (
                    <span key={d} style={{ fontSize: 12, fontWeight: 700, color: i === 0 ? "#e63946" : i === 6 ? "#0077b6" : "#999", padding: "4px 0" }}>{d}</span>
                  ))}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
                  {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const d = i + 1, dt = new Date(calYear, calMonth, d), key = dateKey(dt), dow = dt.getDay();
                    const isToday = key === today, isSelected = key === selectedDate, hasData = !!allData[key];
                    const isBizDay = isBusinessDay(key);
                    const maxClickable = getNextBusinessDay(today);
                    const isDisabled = !isBizDay || key > maxClickable;
                    return (
                      <div key={d} onClick={() => { if (!isDisabled) { setSelectedDate(key); setSaveDate(key); } }} style={{
                        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, borderRadius: 8, cursor: isDisabled ? "default" : "pointer", position: "relative",
                        border: isSelected ? "2px solid #0077b6" : "2px solid transparent",
                        background: isToday ? "#1a1a2e" : isDisabled ? "#f5f5f5" : "transparent",
                        color: isToday ? "#fff" : isDisabled ? "#ccc" : dow === 0 ? "#e63946" : dow === 6 ? "#0077b6" : JAPAN_HOLIDAYS[key] ? "#e63946" : "#333",
                        fontWeight: isToday || isSelected ? 700 : 400,
                        opacity: isDisabled && !isToday ? 0.5 : 1,
                      }}>
                        {d}
                        {hasData && <span style={{ position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: "50%", background: isToday ? "#4cc9f0" : "#0077b6" }} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid #eee", textAlign: "center" }}>
                  <strong style={{ color: "#1a1a2e", fontSize: 16 }}>{formatDateJP(selectedDate)}</strong>
                  <span style={{ display: "block", fontSize: 12, color: "#999", marginTop: 4 }}>{dataSourceInfo}</span>
                </div>
              </div>

              {/* 全体連絡欄 */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginTop: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0077b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  全体連絡
                </h3>
                {dAnnouncements.length === 0 ? (
                  <p style={{ color: "#bbb", fontSize: 13, margin: 0 }}>連絡事項なし</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, listStyle: "disc" }}>
                    {dAnnouncements.map((a, i) => (
                      <li key={i} style={{ fontSize: 13, color: "#333", marginBottom: 6, lineHeight: 1.5 }}>{a}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}

          {/* メインコンテンツ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* カード4枚 */}
            <div className="card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 16 : 24 }}>
              <SummaryCard title="全体" data={total} rate={calcRate(total.progress, total.target)} isTotal />
              <SummaryCard title="プロパー" data={proper} rate={calcRate(proper.progress, proper.target)} standby={proper.standby} />
              <SummaryCard title="BP" data={bp} rate={calcRate(bp.progress, bp.target)} />
              <SummaryCard title="フリーランス" data={fl} rate={calcRate(fl.progress, fl.target)} />
            </div>

            {/* 担当別活動（2段目：5カード）※前日のデータを表示 */}
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>前日営業活動成績</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: isMobile ? 16 : 24 }} className="focus-grid">
              <ActivityRankCard title="RA受注数" data={dStaffActivities} field="ordersRA" color="#e74c3c" />
              <ActivityRankCard title="CA受注数" data={dStaffActivities} field="ordersCA" color="#9b59b6" />
              <ActivityRankCard title="面談設定数" data={dStaffActivities} field="interviewSetups" color="#0077b6" />
              <ActivityRankCard title="面談実施数" data={dStaffActivities} field="interviewsConducted" color="#e67e22" />
              <ActivityRankCard title="案件アポ獲得企業数" data={dStaffActivities} field="appointmentAcquisitions" color="#2ecc71" />
            </div>

            {/* 注力セクション */}
            <div className="focus-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: isMobile ? 16 : 24 }}>
              <FocusPeopleDisplay people={dPeople} />
              <FocusProjectsDisplay projects={dProjects} />
            </div>

            {/* RA開拓セクション（3段目） */}
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <RADisplay ra={dRA} />
            </div>

            {/* 入力トグル */}
            <button onClick={() => inputOpen ? setInputOpen(false) : openInput()} style={{
              display: "block", width: "100%", padding: 14, fontSize: 15, fontWeight: 700,
              background: inputOpen ? "#1a1a2e" : "#fff", color: inputOpen ? "#fff" : "#1a1a2e",
              border: inputOpen ? "none" : "2px solid #1a1a2e", borderRadius: 12, cursor: "pointer",
              marginBottom: inputOpen ? 24 : 0,
            }}>
              {inputOpen ? "入力画面を閉じる" : "入力画面を開く"}
            </button>

            {/* 入力セクション */}
            {inputOpen && (
              <div style={{ background: "#fff", borderRadius: 14, padding: isMobile ? 16 : 32, boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: "#1a1a2e", marginBottom: 20 }}>数値入力</h2>

                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <label style={{ fontSize: 14, color: "#666" }}>保存日付：</label>
                  <input type="date" value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 14 }} />
                  <button onClick={saveCurrentData} disabled={saving} style={{
                    padding: "10px 24px", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>

                <div className="input-3col" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
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

                {/* 担当別活動入力 */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "2px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>担当別活動</h3>
                  {staffActivities.map((s, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="担当" className="fw-select" w={120}><select value={s.staff} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], staff: e.target.value }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(n => <option key={n}>{n}</option>)}</select></FieldWrap>
                      <FieldWrap label="面談設定数" w={100}><input type="text" inputMode="numeric" value={s.interviewSetups || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], interviewSetups: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="面談実施数" w={100}><input type="text" inputMode="numeric" value={s.interviewsConducted || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], interviewsConducted: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="案件アポ獲得企業数" w={130}><input type="text" inputMode="numeric" value={s.appointmentAcquisitions || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], appointmentAcquisitions: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="RA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersRA || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], ordersRA: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="CA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersCA || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], ordersCA: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <button onClick={() => setStaffActivities(staffActivities.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setStaffActivities([...staffActivities, { staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0 }])} style={addBtnStyle}>＋ 担当を追加</button>
                </div>

                {/* 注力入力 */}
                <div style={{ marginTop: 24, paddingTop: 20, borderTop: "2px solid #e0e0e0" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#1a1a2e" }}>注力入力</h3>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>注力人材</h4>
                  {focusPeople.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="氏名" grow><input type="text" value={p.name} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], name: e.target.value }; setFocusPeople(a); }} placeholder="氏名" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="所属" className="fw-select" w={110}><select value={p.affiliation} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], affiliation: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option>プロパー</option><option>BP</option><option>フリーランス</option></select></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], position: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}><select value={p.staff} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], staff: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="スキル" w={120}><input type="text" value={p.skill} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], skill: e.target.value.slice(0, 10) }; setFocusPeople(a); }} placeholder="スキル" maxLength={10} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="仕入れ額" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.cost ? p.cost.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], cost: parseNum(e.target.value) }; setFocusPeople(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <button onClick={() => setFocusPeople(focusPeople.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusPeople([...focusPeople, { name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }])} style={addBtnStyle}>＋ 人材を追加</button>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, marginTop: 24 }}>注力案件</h4>
                  {focusProjects.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="企業名" grow><input type="text" value={p.company} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], company: e.target.value }; setFocusProjects(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="案件タイトル" grow><input type="text" value={p.title} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], title: e.target.value }; setFocusProjects(a); }} placeholder="案件タイトル" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], position: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}><select value={p.staff} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], staff: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="単価" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.price ? p.price.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], price: parseNum(e.target.value) }; setFocusProjects(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="契約形態" className="fw-select" w={110}><select value={p.contract} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], contract: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option>派遣</option><option>準委任</option><option>両方OK</option></select></FieldWrap>
                      <FieldWrap label="勤務場所" className="fw-select" w={120}><select value={p.location} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], location: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{LOCATION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <button onClick={() => setFocusProjects(focusProjects.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusProjects([...focusProjects, { company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }])} style={addBtnStyle}>＋ 案件を追加</button>

                  {/* RA開拓入力 */}
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, marginTop: 24, paddingTop: 20, borderTop: "2px solid #e0e0e0", color: "#1a1a2e" }}>RA開拓</h3>

                  <div className="input-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>案件獲得</h4>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>企業数目標</label>
                          <input type="text" inputMode="numeric" value={raInp.acquisitionTarget} onChange={(e) => handleRaNumInput("acquisitionTarget", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>進捗</label>
                          <input type="text" inputMode="numeric" value={raInp.acquisitionProgress} onChange={(e) => handleRaNumInput("acquisitionProgress", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>案件獲得企業名</label>
                      {raAcqCompanies.map((c, i) => (
                        <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "8px 10px", background: "#f8f9fa", borderRadius: 8 }}>
                          <FieldWrap label="企業名" grow><input type="text" value={c.name} onChange={(e) => { const a = [...raAcqCompanies]; a[i] = { ...a[i], name: e.target.value }; setRaAcqCompanies(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                          <FieldWrap label="担当" className="fw-select" w={110}><select value={c.staff} onChange={(e) => { const a = [...raAcqCompanies]; a[i] = { ...a[i], staff: e.target.value }; setRaAcqCompanies(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                          <button onClick={() => setRaAcqCompanies(raAcqCompanies.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                        </div>
                      ))}
                      <button onClick={() => setRaAcqCompanies([...raAcqCompanies, { name: "", staff: "" }])} style={addBtnStyle}>＋ 企業を追加</button>
                    </div>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10 }}>参画決定</h4>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>企業目標</label>
                          <input type="text" inputMode="numeric" value={raInp.joinTarget} onChange={(e) => handleRaNumInput("joinTarget", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>進捗</label>
                          <input type="text" inputMode="numeric" value={raInp.joinProgress} onChange={(e) => handleRaNumInput("joinProgress", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 6 }}>参画決定企業名</label>
                      {raJoinCompanies.map((c, i) => (
                        <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "8px 10px", background: "#f8f9fa", borderRadius: 8 }}>
                          <FieldWrap label="企業名" grow><input type="text" value={c.name} onChange={(e) => { const a = [...raJoinCompanies]; a[i] = { ...a[i], name: e.target.value }; setRaJoinCompanies(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                          <FieldWrap label="担当" className="fw-select" w={110}><select value={c.staff} onChange={(e) => { const a = [...raJoinCompanies]; a[i] = { ...a[i], staff: e.target.value }; setRaJoinCompanies(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                          <button onClick={() => setRaJoinCompanies(raJoinCompanies.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                        </div>
                      ))}
                      <button onClick={() => setRaJoinCompanies([...raJoinCompanies, { name: "", staff: "" }])} style={addBtnStyle}>＋ 企業を追加</button>
                    </div>
                  </div>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", marginBottom: 10, marginTop: 24, display: "flex", alignItems: "center", gap: 8 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0077b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                    全体連絡
                  </h4>
                  {announcements.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: "#999", flexShrink: 0 }}>・</span>
                      <input type="text" value={a} onChange={(e) => { const arr = [...announcements]; arr[i] = e.target.value; setAnnouncements(arr); }} placeholder="連絡事項を入力" style={{ ...focusInputStyle, flex: 1 }} />
                      <button onClick={() => setAnnouncements(announcements.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setAnnouncements([...announcements, ""])} style={addBtnStyle}>＋ 連絡事項を追加</button>

                  {/* 下部の保存ボタン */}
                  <div style={{ marginTop: 24, paddingTop: 20, borderTop: "2px solid #e0e0e0" }}>
                    <button onClick={saveCurrentData} disabled={saving} style={{
                      width: "100%", padding: "14px 24px", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                    }}>
                      {saving ? "保存中..." : "保存"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>}

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 24px", background: "#1a1a2e", color: "#fff", borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 1000 }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

// ===== FieldWrap =====
function FieldWrap({ label, children, grow, w, className }: { label: string; children: React.ReactNode; grow?: boolean; w?: number; className?: string }) {
  return (
    <div className={className} style={{ flex: grow ? 1 : "none", width: w, minWidth: 0 }}>
      <span style={{ fontSize: 10, color: "#999", display: "block" }}>{label}</span>
      {children}
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
    <div style={{ background: bg, borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", color }}>
      <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: `1px solid ${isTotal ? "rgba(255,255,255,0.15)" : "#f0f2f5"}` }}>{title}</div>
      <Row label="目標" value={formatYen(data.target)} labelColor={labelColor} valueColor={isTotal ? "#fff" : "#1a1a2e"} />
      <Row label="進捗" value={formatYen(data.progress)} labelColor={labelColor} valueColor={isTotal ? "#4cc9f0" : "#0077b6"} />
      <Row label="見込" value={formatYen(data.forecast)} labelColor={labelColor} valueColor={isTotal ? "#a8e6cf" : "#2ecc71"} />
      {standby !== undefined && <Row label="待機" value={`${standby}名`} labelColor={labelColor} valueColor={isTotal ? "#ffd6a5" : "#f39c12"} />}
      <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${isTotal ? "rgba(255,255,255,0.15)" : "#f0f2f5"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
          <span style={{ color: labelColor }}>達成率</span><span style={{ fontWeight: 700, color: barFill }}>{rate}%</span>
        </div>
        <div style={{ height: 6, borderRadius: 3, background: barBg, overflow: "hidden" }}>
          <div style={{ width: `${Math.min(rate, 100)}%`, height: "100%", borderRadius: 3, background: barFill, transition: "width 0.5s" }} />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: labelColor }}>{label}</span><span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}

function FocusPeopleDisplay({ people }: { people: FocusPerson[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflowX: "auto" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>注力人材</h3>
      {people.length === 0 ? <p style={{ color: "#bbb", fontSize: 14 }}>未入力</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 500 }}>
          <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
            <th style={thStyle}>氏名</th><th style={thStyle}>所属</th><th style={thStyle}>ポジション</th><th style={thStyle}>担当</th><th style={thStyle}>スキル</th><th style={{ ...thStyle, textAlign: "right" }}>仕入れ額</th>
          </tr></thead>
          <tbody>{people.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#1a1a2e" }}>{p.name || "-"}</td>
              <td style={{ padding: "8px 0" }}><Badge text={p.affiliation} type={p.affiliation === "BP" ? "bp" : p.affiliation === "フリーランス" ? "fl" : "proper"} /></td>
              <td style={{ padding: "8px 0", color: "#555", fontWeight: 600 }}>{p.position || "-"}</td>
              <td style={{ padding: "8px 0", color: "#555", fontWeight: 600 }}>{p.staff || "-"}</td>
              <td style={{ padding: "8px 0", color: "#555" }}>{p.skill || "-"}</td>
              <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#1a1a2e" }}>{p.cost ? formatYen(p.cost) : "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function FocusProjectsDisplay({ projects }: { projects: FocusProject[] }) {
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflowX: "auto" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 12 }}>注力案件</h3>
      {projects.length === 0 ? <p style={{ color: "#bbb", fontSize: 14 }}>未入力</p> : (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 650 }}>
          <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
            <th style={thStyle}>企業名</th><th style={thStyle}>案件</th><th style={thStyle}>ポジション</th><th style={thStyle}>担当</th><th style={{ ...thStyle, textAlign: "right" }}>単価</th><th style={thStyle}>契約</th><th style={thStyle}>勤務場所</th>
          </tr></thead>
          <tbody>{projects.map((p, i) => (
            <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
              <td style={{ padding: "8px 0", fontWeight: 600, color: "#1a1a2e" }}>{p.company || "-"}</td>
              <td style={{ padding: "8px 0", color: "#555" }}>{p.title || "-"}</td>
              <td style={{ padding: "8px 0", color: "#555", fontWeight: 600 }}>{p.position || "-"}</td>
              <td style={{ padding: "8px 0", color: "#555", fontWeight: 600 }}>{p.staff || "-"}</td>
              <td style={{ padding: "8px 0", textAlign: "right", fontWeight: 600, color: "#1a1a2e" }}>{p.price ? formatYen(p.price) : "-"}</td>
              <td style={{ padding: "8px 0" }}><Badge text={p.contract} type={p.contract === "準委任" ? "quasi" : p.contract === "両方OK" ? "both" : "dispatch"} /></td>
              <td style={{ padding: "8px 0", color: "#555" }}>{p.location || "-"}</td>
            </tr>
          ))}</tbody>
        </table>
      )}
    </div>
  );
}

function RADisplay({ ra }: { ra: RAData }) {
  const acqCompanies = Array.isArray(ra.acquisitionCompanies) ? ra.acquisitionCompanies.filter(c => c.name) : [];
  const joinCompanies = Array.isArray(ra.joinCompanies) ? ra.joinCompanies.filter(c => c.name) : [];
  const hasData = ra.acquisitionTarget || ra.acquisitionProgress || ra.joinTarget || ra.joinProgress || acqCompanies.length || joinCompanies.length;
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", overflowX: "auto" }}>
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "#1a1a2e", marginBottom: 16 }}>RA開拓</h3>
      {!hasData ? <p style={{ color: "#bbb", fontSize: 14 }}>未入力</p> : (
        <div className="focus-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          {/* 案件獲得 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#0077b6", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e8f4fd" }}>案件獲得</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#999" }}>企業数目標</span><span style={{ fontWeight: 700, color: "#1a1a2e" }}>{ra.acquisitionTarget}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#999" }}>進捗</span><span style={{ fontWeight: 700, color: "#0077b6" }}>{ra.acquisitionProgress}</span>
            </div>
            {ra.acquisitionTarget > 0 && (
              <div style={{ height: 6, borderRadius: 3, background: "#f0f2f5", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${Math.min(Math.round((ra.acquisitionProgress / ra.acquisitionTarget) * 100), 100)}%`, height: "100%", borderRadius: 3, background: ra.acquisitionProgress >= ra.acquisitionTarget ? "#2ecc71" : "#0077b6", transition: "width 0.5s" }} />
              </div>
            )}
            {acqCompanies.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
                  <th style={thStyle}>企業名</th><th style={thStyle}>担当</th>
                </tr></thead>
                <tbody>{acqCompanies.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "6px 0", fontWeight: 600, color: "#1a1a2e" }}>{c.name}</td>
                    <td style={{ padding: "6px 0", color: "#555", fontWeight: 600 }}>{c.staff || "-"}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </div>
          {/* 参画決定 */}
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#2ecc71", marginBottom: 10, paddingBottom: 6, borderBottom: "2px solid #e8f5e9" }}>参画決定</div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
              <span style={{ color: "#999" }}>企業目標</span><span style={{ fontWeight: 700, color: "#1a1a2e" }}>{ra.joinTarget}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
              <span style={{ color: "#999" }}>進捗</span><span style={{ fontWeight: 700, color: "#2ecc71" }}>{ra.joinProgress}</span>
            </div>
            {ra.joinTarget > 0 && (
              <div style={{ height: 6, borderRadius: 3, background: "#f0f2f5", overflow: "hidden", marginBottom: 12 }}>
                <div style={{ width: `${Math.min(Math.round((ra.joinProgress / ra.joinTarget) * 100), 100)}%`, height: "100%", borderRadius: 3, background: ra.joinProgress >= ra.joinTarget ? "#2ecc71" : "#f39c12", transition: "width 0.5s" }} />
              </div>
            )}
            {joinCompanies.length > 0 && (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead><tr style={{ borderBottom: "2px solid #f0f2f5" }}>
                  <th style={thStyle}>企業名</th><th style={thStyle}>担当</th>
                </tr></thead>
                <tbody>{joinCompanies.map((c, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f8f9fa" }}>
                    <td style={{ padding: "6px 0", fontWeight: 600, color: "#1a1a2e" }}>{c.name}</td>
                    <td style={{ padding: "6px 0", color: "#555", fontWeight: 600 }}>{c.staff || "-"}</td>
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

// ===== 月別営業活動成績コンポーネント =====
function MonthlyActivityView({ allData, monthlyYM, setMonthlyYM, isMobile }: { allData: AllData; monthlyYM: string; setMonthlyYM: (v: string) => void; isMobile: boolean }) {
  const [ymYear, ymMonth] = monthlyYM.split("-").map(Number);
  const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  // 年月セレクトの選択肢を生成（2026-03 〜 2028-03）
  const ymOptions: string[] = [];
  for (let y = 2026; y <= 2028; y++) {
    const startM = y === 2026 ? 3 : 1;
    const endM = y === 2028 ? 3 : 12;
    for (let m = startM; m <= endM; m++) {
      ymOptions.push(`${y}-${("0" + m).slice(-2)}`);
    }
  }

  // 日付情報を生成
  const days = Array.from({ length: daysInMonth }, (_, i) => {
    const d = i + 1;
    const dt = new Date(ymYear, ymMonth - 1, d);
    const key = `${ymYear}-${("0" + ymMonth).slice(-2)}-${("0" + d).slice(-2)}`;
    const dow = dt.getDay();
    const holiday = JAPAN_HOLIDAYS[key];
    const isRed = dow === 0 || dow === 6 || !!holiday;
    return { d, key, dow, holiday, isRed, dowLabel: DOW[dow] };
  });

  // 各担当×各日×各指標のデータを集計
  const getStaffDayValue = (staff: string, dayKey: string, field: keyof StaffActivity): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find(s => s.staff === staff);
    return entry ? ((entry[field] as number) || 0) : 0;
  };

  const getStaffMonthTotal = (staff: string, field: keyof StaffActivity): number => {
    return days.reduce((sum, day) => sum + getStaffDayValue(staff, day.key, field), 0);
  };

  const getDayTotal = (dayKey: string, field: keyof StaffActivity): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffDayValue(staff, dayKey, field), 0);
  };

  const getMonthGrandTotal = (field: keyof StaffActivity): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffMonthTotal(staff, field), 0);
  };

  const cellStyle: React.CSSProperties = { padding: "4px 6px", textAlign: "center", fontSize: 12, borderRight: "1px solid #e0e0e0", borderBottom: "1px solid #e0e0e0", whiteSpace: "nowrap" };
  const headerCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: "#f8f9fa", position: "sticky", top: 0, zIndex: 2 };
  const staffCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, textAlign: "left", position: "sticky", left: 0, background: "#fff", zIndex: 1, minWidth: 70 };
  const fieldHeaderStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, textAlign: "left", position: "sticky", left: 0, background: "#f0f2f5", zIndex: 3, minWidth: 70 };

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* 年月セレクト */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <select value={monthlyYM} onChange={(e) => setMonthlyYM(e.target.value)} style={{ padding: "8px 16px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, fontWeight: 600, background: "#fff", cursor: "pointer" }}>
          {ymOptions.map(ym => {
            const [y, m] = ym.split("-");
            return <option key={ym} value={ym}>{y}年{parseInt(m)}月</option>;
          })}
        </select>
      </div>

      {/* ベスト5（5分野まとめて表示） */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
        {ACTIVITY_FIELDS.map(af => {
          const ranked = STAFF_LIST
            .map(staff => ({ staff, total: getStaffMonthTotal(staff, af.key) }))
            .filter(s => s.total > 0)
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
          const medals = ["🥇", "🥈", "🥉"];
          return (
            <div key={af.key} style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{af.label}</h3>
                <span style={{ fontSize: 18, fontWeight: 700, color: af.color }}>{getMonthGrandTotal(af.key)}</span>
              </div>
              {ranked.length === 0 ? <p style={{ color: "#bbb", fontSize: 13, margin: 0 }}>データなし</p> : (
                ranked.map((r, i) => (
                  <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: "#999", fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                      <span style={{ fontSize: 13, fontWeight: 600, color: "#1a1a2e" }}>{r.staff}</span>
                    </div>
                    <span style={{ fontSize: 15, fontWeight: 700, color: af.color }}>{r.total}</span>
                  </div>
                ))
              )}
            </div>
          );
        })}
      </div>

      {/* 各指標ごとにテーブル */}
      {ACTIVITY_FIELDS.map(af => (
        <div key={af.key} style={{ background: "#fff", borderRadius: 14, padding: "16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: af.color, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: af.color, display: "inline-block" }} />
            {af.label}
            <span style={{ fontSize: 13, color: "#999", fontWeight: 400, marginLeft: 8 }}>月合計: {getMonthGrandTotal(af.key)}</span>
          </h3>
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, minWidth: 70 }}>担当</th>
                {days.map(day => (
                  <th key={day.d} style={{ ...headerCellStyle, color: day.isRed ? "#e63946" : "#333", minWidth: 36 }} title={day.holiday || ""}>
                    {day.d}
                  </th>
                ))}
                <th style={{ ...headerCellStyle, background: "#e8f4fd", minWidth: 50 }}>合計</th>
              </tr>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, fontSize: 10, padding: "2px 6px" }}></th>
                {days.map(day => (
                  <th key={`dow-${day.d}`} style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px", color: day.isRed ? "#e63946" : "#999" }}>
                    {day.holiday ? "祝" : day.dowLabel}
                  </th>
                ))}
                <th style={{ ...headerCellStyle, background: "#e8f4fd", fontSize: 10, padding: "2px 6px" }}></th>
              </tr>
            </thead>
            <tbody>
              {STAFF_LIST.map(staff => {
                const monthTotal = getStaffMonthTotal(staff, af.key);
                return (
                  <tr key={staff}>
                    <td style={staffCellStyle}>{staff}</td>
                    {days.map(day => {
                      const val = getStaffDayValue(staff, day.key, af.key);
                      return (
                        <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : "#ddd", fontWeight: val > 0 ? 700 : 400, background: day.isRed ? "#fef8f8" : undefined }}>
                          {val || "-"}
                        </td>
                      );
                    })}
                    <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : "#999", background: "#e8f4fd" }}>{monthTotal}</td>
                  </tr>
                );
              })}
              {/* 合計行 */}
              <tr style={{ background: "#f8f9fa" }}>
                <td style={{ ...staffCellStyle, fontWeight: 700, background: "#f0f2f5" }}>合計</td>
                {days.map(day => {
                  const dayTotal = getDayTotal(day.key, af.key);
                  return (
                    <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? "#1a1a2e" : "#ddd", background: day.isRed ? "#fef2f2" : "#f8f9fa" }}>
                      {dayTotal || "-"}
                    </td>
                  );
                })}
                <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: "#d6eaf8", fontSize: 14 }}>{getMonthGrandTotal(af.key)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );
}

function ActivityRankCard({ title, data, field, color }: { title: string; data: StaffActivity[]; field: keyof StaffActivity; color: string }) {
  const [showAll, setShowAll] = useState(false);
  const sorted = [...data].filter(s => s.staff && (s[field] as number) > 0).sort((a, b) => (b[field] as number) - (a[field] as number));
  const top3 = sorted.slice(0, 3);
  const total = sorted.reduce((sum, s) => sum + (s[field] as number), 0);
  const medals = ["🥇", "🥈", "🥉"];
  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: "20px 16px", boxShadow: "0 2px 12px rgba(0,0,0,0.08)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: "#1a1a2e", margin: 0 }}>{title}</h3>
        <span style={{ fontSize: 20, fontWeight: 700, color }}>{total}</span>
      </div>
      {sorted.length === 0 ? <p style={{ color: "#bbb", fontSize: 13, margin: 0 }}>未入力</p> : (
        <>
          {top3.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid #f0f2f5" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{medals[i]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: "#1a1a2e" }}>{s.staff}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color }}>{s[field] as number}</span>
            </div>
          ))}
          {sorted.length > 3 && (
            <>
              <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px solid #0077b6", borderRadius: 6, cursor: "pointer", width: "100%" }}>
                {showAll ? "閉じる" : `全${sorted.length}件を表示`}
              </button>
              {showAll && sorted.slice(3).map((s, i) => (
                <div key={i + 3} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #f8f9fa" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 12, color: "#999", width: 20, textAlign: "center" }}>{i + 4}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "#555" }}>{s.staff}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{s[field] as number}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Badge({ text, type }: { text: string; type: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    proper: { bg: "#e8f4fd", color: "#0077b6" }, bp: { bg: "#fff3e0", color: "#f57c00" }, fl: { bg: "#e8f5e9", color: "#388e3c" },
    dispatch: { bg: "#e8f4fd", color: "#0077b6" }, quasi: { bg: "#fce4ec", color: "#c62828" }, both: { bg: "#f3e5f5", color: "#7b1fa2" },
  };
  const c = colors[type] || colors.proper;
  return <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.color }}>{text}</span>;
}

function InputGroup({ title, fields, onChange }: { title: string; fields: { label: string; value: string; key: string }[]; onChange: (key: string, value: string) => void; }) {
  return (
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, paddingBottom: 6, borderBottom: "2px solid #e0e0e0" }}>{title}</h3>
      {fields.map((f) => (
        <div key={f.key} style={{ marginBottom: 10 }}>
          <label style={{ display: "block", fontSize: 12, color: "#666", marginBottom: 3 }}>{f.label}</label>
          <input type="text" inputMode="numeric" value={f.value} onChange={(e) => onChange(f.key, e.target.value)} placeholder="0"
            style={{ width: "100%", padding: "8px 12px", border: "1px solid #ddd", borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
    </div>
  );
}

// ===== 共通スタイル =====
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 };
const calBtnStyle: React.CSSProperties = { width: 32, height: 32, border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" };
const focusInputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" };
const focusSelectStyle: React.CSSProperties = { width: "100%", padding: "7px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" };
const removeBtnStyle: React.CSSProperties = { width: 28, height: 28, border: "none", background: "#fee", color: "#e63946", borderRadius: 6, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const addBtnStyle: React.CSSProperties = { padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px dashed #0077b6", borderRadius: 8, cursor: "pointer", width: "100%", marginTop: 8 };
