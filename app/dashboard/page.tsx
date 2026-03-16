"use client";

import { useState, useEffect, useCallback, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme-provider";
import { ADashLogo, ThemeToggle } from "../logo";

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
const ACTIVITY_FIELDS: { key: keyof StaffActivity; label: string; color: string; targetType: "monthly" | "daily" }[] = [
  { key: "ordersRA", label: "RA受注数", color: "#e74c3c", targetType: "monthly" },
  { key: "ordersCA", label: "CA受注数", color: "#9b59b6", targetType: "monthly" },
  { key: "interviewSetups", label: "面談設定数", color: "#0077b6", targetType: "daily" },
  { key: "interviewsConducted", label: "面談実施数", color: "#e67e22", targetType: "monthly" },
  { key: "appointmentAcquisitions", label: "RA開拓アポ獲得", color: "#2ecc71", targetType: "monthly" },
];

const ACTIVITY_AMOUNT_FIELDS: { key: string; label: string; rankLabel: string; tableLabel: string; color: string }[] = [
  { key: "amountRA", label: "RA受注金額", rankLabel: "今月RA受注", tableLabel: "RA粗利", color: "#e74c3c" },
  { key: "amountCA", label: "CA受注金額", rankLabel: "今月CA受注", tableLabel: "CA粗利", color: "#9b59b6" },
];

// ===== 勤務場所リスト =====
const LOCATION_LIST = ["出社", "リモート", "ハイブリッド"];

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

interface OrderEntry {
  amount: number;
  revenue: number;
  company: string;
  affiliation: string;
  position: string;
}

interface StaffActivity {
  staff: string;
  interviewSetups: number;
  interviewsConducted: number;
  appointmentAcquisitions: number;
  ordersRA: number;
  ordersCA: number;
  raEntries: OrderEntry[];
  caEntries: OrderEntry[];
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
function parseAmount(str: string): number { const cleaned = str.replace(/[^0-9.]/g, ""); const num = parseFloat(cleaned); return isNaN(num) ? 0 : Math.round(num * 10) / 10; }
function formatAmount(num: number): string { if (!num) return ""; return num % 1 === 0 ? num.toString() : num.toFixed(1); }
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
  const { theme, t: tc } = useTheme();
  const [allData, setAllData] = useState<AllData>({});
  const [selectedDate, setSelectedDate] = useState(() => {
    const t = todayKey();
    return isBusinessDay(t) ? t : getNextBusinessDay(t);
  });
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [inputOpen, setInputOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [sectionSalesOpen, setSectionSalesOpen] = useState(false);
  const [sectionFocusOpen, setSectionFocusOpen] = useState(false);
  const [sectionRAOpen, setSectionRAOpen] = useState(false);
  const [sectionAnnouncementOpen, setSectionAnnouncementOpen] = useState(false);
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

  // 天気情報
  const [weatherInfo, setWeatherInfo] = useState<{ shibuya: string; shinjuku: string } | null>(null);
  // ビジネス格言
  const [dailyQuote, setDailyQuote] = useState<string>("");

  // レスポンシブ検知
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // モバイルではカレンダー非表示がデフォルト
  useEffect(() => { if (isMobile) setCalendarOpen(false); }, [isMobile]);

  // 天気取得（Open-Meteo API、渋谷・新宿）
  useEffect(() => {
    const cacheKey = `weather_${todayKey()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setWeatherInfo(JSON.parse(cached)); return; }
    const weatherCode: Record<number, string> = {
      0: "☀️快晴", 1: "🌤️晴れ", 2: "⛅曇り", 3: "☁️曇り",
      45: "🌫️霧", 48: "🌫️霧", 51: "🌦️小雨", 53: "🌧️雨", 55: "🌧️雨",
      61: "🌧️雨", 63: "🌧️雨", 65: "🌧️大雨", 71: "🌨️雪", 73: "🌨️雪", 75: "❄️大雪",
      80: "🌦️にわか雨", 81: "🌧️にわか雨", 82: "⛈️豪雨", 95: "⛈️雷雨", 96: "⛈️雷雨", 99: "⛈️雷雨",
    };
    const fetchW = async (lat: number, lon: number) => {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=1`);
      const d = await res.json();
      const idx = 10; // 10時
      const temp = Math.round(d.hourly.temperature_2m[idx]);
      const code = d.hourly.weather_code[idx];
      return `${weatherCode[code] || "—"} ${temp}°C`;
    };
    Promise.all([
      fetchW(35.6580, 139.7016), // 渋谷
      fetchW(35.6938, 139.7034), // 新宿
    ]).then(([s, n]) => {
      const info = { shibuya: s, shinjuku: n };
      setWeatherInfo(info);
      sessionStorage.setItem(cacheKey, JSON.stringify(info));
    }).catch(() => {});
  }, []);

  // ビジネス格言（日替わり）
  useEffect(() => {
    const cacheKey = `quote_${todayKey()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setDailyQuote(cached); return; }
    const quotes = [
      "成功とは、失敗を重ねても熱意を失わないことである — W.チャーチル",
      "最大の危険は、目標が高すぎて失敗することではなく、低すぎて達成してしまうことだ — ミケランジェロ",
      "行動は全ての成功の基本的な鍵である — P.ピカソ",
      "今日できることを明日に延ばすな — B.フランクリン",
      "準備を怠ることは、失敗を準備することだ — B.フランクリン",
      "変化は脅威ではなく機会である — P.ドラッカー",
      "顧客にとっての価値を創造せよ — P.ドラッカー",
      "まず最も重要なことから始めよ — S.コヴィー",
      "小さな改善の積み重ねが大きな差を生む — 豊田章男",
      "リーダーとは希望を配る人のことだ — ナポレオン",
      "品質とは、誰も見ていないときにきちんとやることだ — H.フォード",
      "最善の投資先は自分自身である — W.バフェット",
      "速さより方向が大事だ — 孫正義",
      "困難の中に機会がある — A.アインシュタイン",
      "信頼は最大の資産である — S.コヴィー",
      "勝つことではなく、諦めないことが大事だ — 松下幸之助",
      "現場が全ての答えを持っている — 大野耐一",
      "まず動け、考えるのはそれからだ — 本田宗一郎",
      "人を動かすには、まず自分が動け — 稲盛和夫",
      "1%の改善を毎日続ければ、1年で37倍になる — J.クリア",
      "計画のない目標は、ただの願望である — A.サン=テグジュペリ",
      "成長とは、快適な領域を出ることだ — J.C.マクスウェル",
      "チームワークは夢を実現する — M.ジョーダン",
      "お客様の声に耳を傾けよ — S.ジョブズ",
      "完璧を目指すより、まず終わらせろ — M.ザッカーバーグ",
      "イノベーションが指導者と追随者を分ける — S.ジョブズ",
      "時間は最も貴重な資源である — P.ドラッカー",
      "やってみせ、言って聞かせて、させてみて、褒めてやらねば人は動かじ — 山本五十六",
      "チャンスは準備された心に訪れる — L.パスツール",
      "情熱なくして偉大なことは成し遂げられない — G.W.F.ヘーゲル",
      "失敗は成功のもと — 日本のことわざ",
    ];
    const dayNum = parseInt(todayKey().replace(/-/g, ""), 10);
    const q = quotes[dayNum % quotes.length];
    setDailyQuote(q);
    sessionStorage.setItem(cacheKey, q);
  }, []);

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

    // マージ：前営業日データをベースに、当日の既存データ（RA等）を上書き
    const merged: DayData = JSON.parse(JSON.stringify(prevData));
    // 営業活動は日次入力のため一切継承しない（常に空）
    merged.staffActivities = [];
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
  // 営業活動は選択日の前営業日のデータのみ表示（土日祝スキップ）
  const prevBizDayKey = getPrevBusinessDay(selectedDate);
  const prevDayStaffActivities = (() => {
    const d = allData[prevBizDayKey];
    if (d && Array.isArray(d.staffActivities)) {
      return d.staffActivities.filter(s => s.staff);
    }
    return [];
  })();
  const dStaffActivities = prevDayStaffActivities;
  // 前々営業日のデータ（前日比アイコン用）
  const prevPrevBizDayKey = getPrevBusinessDay(prevBizDayKey);
  const prevPrevStaffActivities = (() => {
    const d = allData[prevPrevBizDayKey];
    if (d && Array.isArray(d.staffActivities)) return d.staffActivities.filter(s => s.staff);
    return [];
  })();
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
      // 営業活動：当日に入力済みデータがあればそれを表示、なければ空で開始
      setStaffActivities(d.staffActivities?.length ? d.staffActivities.map((s: any) => ({
  staff: s.staff || "",
  interviewSetups: s.interviewSetups || 0,
  interviewsConducted: s.interviewsConducted || 0,
  appointmentAcquisitions: s.appointmentAcquisitions || 0,
  ordersRA: s.ordersRA || 0,
  ordersCA: s.ordersCA || 0,
  raEntries: s.raEntries?.length ? s.raEntries : (s.ordersRA > 0 ? [{ amount: s.amountRA || 0, revenue: 0, company: s.companyRA || "", affiliation: s.affiliationRA || "", position: s.positionRA || "" }] : []),
  caEntries: s.caEntries?.length ? s.caEntries : (s.ordersCA > 0 ? [{ amount: s.amountCA || 0, revenue: 0, company: s.companyCA || "", affiliation: s.affiliationCA || "", position: s.positionCA || "" }] : []),
})) : [{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [] }]);
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
        // 営業活動は日次入力のため常に空で開始
        setStaffActivities([{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [] }]);
      } else {
        setInp({ properTarget: "", properProgress: "", properForecast: "", properStandby: "", bpTarget: "", bpProgress: "", bpForecast: "", flTarget: "", flProgress: "", flForecast: "" });
        setFocusPeople([{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
        setFocusProjects([{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
        setAnnouncements([""]);
        setRaInp({ acquisitionTarget: "", acquisitionProgress: "", joinTarget: "", joinProgress: "" });
        setRaAcqCompanies([{ name: "", staff: "" }]);
        setRaJoinCompanies([{ name: "", staff: "" }]);
        setStaffActivities([{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [] }]);
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
        <p style={{ fontSize: 18, color: tc.textSecondary }}>読み込み中...</p>
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
      <div style={{ fontFamily: "var(--font)", background: tc.bg, color: tc.text, minHeight: "100vh", padding: isMobile ? 12 : 24, transition: "background 0.3s, color 0.3s" }}>
        {/* ヘッダー */}
        <div style={{ display: "flex", alignItems: "center", maxWidth: 1400, margin: "0 auto 16px", position: "relative" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <button onClick={() => setCalendarOpen(!calendarOpen)} title={calendarOpen ? "サイドバーを閉じる" : "サイドバーを開く"} style={{
              width: 40, height: 40, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, flexShrink: 0,
            }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={tc.text} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {calendarOpen ? (
                  <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><line x1="14" y1="9" x2="19" y2="9" /><line x1="14" y1="15" x2="19" y2="15" /></>
                ) : (
                  <><rect x="3" y="3" width="18" height="18" rx="2" /><line x1="9" y1="3" x2="9" y2="21" /><polyline points="14,10 17,12 14,14" /></>
                )}
              </svg>
            </button>
            <ADashLogo height={isMobile ? 32 : 44} />
          </div>
          <h1 style={{ fontSize: isMobile ? 22 : 32, color: tc.textHeading, margin: 0, flex: 1, textAlign: "center" }}>{(() => {
            const m = activeTab === "monthly" ? parseInt(monthlyYM.split("-")[1]) : calMonth + 1;
            const next = m === 12 ? 1 : m + 1;
            return `${next}月稼働`;
          })()}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <ThemeToggle />
            <button onClick={handleLogout} style={{ padding: "8px 16px", background: tc.buttonBg, border: `1px solid ${tc.buttonBorder}`, borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, color: tc.buttonText, flexShrink: 0 }}>
              ログアウト
            </button>
          </div>
        </div>

        {/* タブ切り替え */}
        <div style={{ display: "flex", gap: 0, maxWidth: 1400, margin: "0 auto 16px", borderBottom: "2px solid " + tc.tabBorder }}>
          {[{ key: "main" as const, label: "メイン" }, { key: "monthly" as const, label: "月別営業活動成績" }].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", borderBottom: activeTab === tab.key ? "3px solid " + tc.tabActive : "3px solid transparent",
              background: "transparent", color: activeTab === tab.key ? tc.tabActive : tc.tabInactive, marginBottom: -2,
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "monthly" && (
          <MonthlyActivityView allData={allData} setAllData={setAllData} monthlyYM={monthlyYM} setMonthlyYM={setMonthlyYM} isMobile={isMobile} />
        )}

        {activeTab === "main" && <div className="layout-flex" style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
          {/* サイドバー: カレンダー */}
          {calendarOpen && (
            <div className="sidebar" style={{ width: 300, flexShrink: 0 }}>
              <div style={{ background: tc.bgCard, borderRadius: 14, padding: 20, boxShadow: tc.shadow, position: isMobile ? "static" : "sticky", top: 24 }}>
                {/* 会社ロゴ */}
                <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${tc.border}` }}>
                  <img src="/logo.png" alt="Cell Promote" style={{ maxWidth: "80%", height: "auto", maxHeight: 40, objectFit: "contain" }} />
                </div>
                {/* 天気 & 格言 */}
                {weatherInfo && (
                  <div style={{ fontSize: 11, color: tc.textSecondary, marginBottom: 8, lineHeight: 1.6, background: tc.bgSection, borderRadius: 8, padding: "6px 10px" }}>
                    <div style={{ display: "flex", gap: 12, whiteSpace: "nowrap" }}>
                      <span><b>渋谷</b> {weatherInfo.shibuya}</span>
                      <span><b>新宿</b> {weatherInfo.shinjuku}</span>
                    </div>
                  </div>
                )}
                {dailyQuote && (
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 10, lineHeight: 1.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingBottom: 10, borderBottom: "1px solid #eee" }} title={dailyQuote}>
                    💡 {dailyQuote}
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{calYear}年{calMonth + 1}月</h3>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button onClick={() => changeMonth(-1)} style={calBtnStyle}>&#9664;</button>
                    <button onClick={() => { const t = todayKey(); const initDate = isBusinessDay(t) ? t : getNextBusinessDay(t); setCalYear(new Date().getFullYear()); setCalMonth(new Date().getMonth()); setSelectedDate(initDate); setSaveDate(initDate); setInputOpen(false); }} style={{ ...calBtnStyle, width: "auto", padding: "0 10px", fontSize: 12 }}>今月</button>
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
                    const isSelected = key === selectedDate, hasData = !!allData[key];
                    const isBizDay = isBusinessDay(key);
                    const maxClickable = isBusinessDay(today) ? today : getNextBusinessDay(today);
                    const isDisabled = !isBizDay || key > maxClickable;
                    const isActiveDay = key === maxClickable;
                    // ヒートマップ: 面談設定数に応じた背景色
                    let heatBg = "transparent";
                    if (hasData && !isActiveDay && !isDisabled) {
                      const dayData = allData[key];
                      const acts = dayData?.staffActivities || [];
                      const totalSetups = acts.reduce((s: number, a: StaffActivity) => s + (a.interviewSetups || 0), 0);
                      heatBg = totalSetups >= 15 ? "rgba(0,119,182,0.25)" : totalSetups >= 10 ? "rgba(0,119,182,0.13)" : totalSetups >= 1 ? "rgba(0,119,182,0.06)" : "transparent";
                    }
                    return (
                      <div key={d} onClick={() => { if (!isDisabled) { setSelectedDate(key); setSaveDate(key); setInputOpen(false); } }} style={{
                        aspectRatio: "1", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, borderRadius: 8, cursor: isDisabled ? "default" : "pointer", position: "relative",
                        border: isSelected ? "2px solid #0077b6" : "2px solid transparent",
                        background: isActiveDay ? "#1a1a2e" : isDisabled ? "#f5f5f5" : heatBg,
                        color: isActiveDay ? "#fff" : isDisabled ? "#ccc" : dow === 0 ? "#e63946" : dow === 6 ? "#0077b6" : JAPAN_HOLIDAYS[key] ? "#e63946" : "#333",
                        fontWeight: isActiveDay || isSelected ? 700 : 400,
                        opacity: isDisabled ? 0.5 : 1,
                      }}>
                        {d}
                        {hasData && <span style={{ position: "absolute", bottom: 3, width: 5, height: 5, borderRadius: "50%", background: isActiveDay ? "#4cc9f0" : "#0077b6" }} />}
                      </div>
                    );
                  })}
                </div>
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #eee", textAlign: "center" }}>
                  <strong style={{ color: tc.textPrimary, fontSize: 16 }}>{formatDateJP(selectedDate)}</strong>
                </div>
              </div>

              {/* 全体連絡欄 */}
              <div style={{ background: tc.bgCard, borderRadius: 14, padding: 20, boxShadow: tc.shadow, marginTop: 16 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0077b6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  全体連絡
                </h3>
                {dAnnouncements.length === 0 ? (
                  <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>連絡事項なし</p>
                ) : (
                  <ul style={{ margin: 0, paddingLeft: 20, listStyle: "disc" }}>
                    {dAnnouncements.map((a, i) => (
                      <li key={i} style={{ fontSize: 13, color: tc.textPrimary, marginBottom: 6, lineHeight: 1.5 }}>{a}</li>
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

            {/* 前日営業活動成績（件数5カード + 金額2カード） */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "3px solid #e67e22" }}>
              <div style={{ width: 6, height: 24, borderRadius: 3, background: "#e67e22" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>前営業日結果</h3>
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#0077b6", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0077b6", display: "inline-block" }} />件数
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 16 }} className="focus-grid">
              <ActivityRankCard title="RA受注数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="ordersRA" color="#e74c3c" />
              <ActivityRankCard title="CA受注数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="ordersCA" color="#9b59b6" />
              <ActivityRankCard title="面談設定数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="interviewSetups" color="#0077b6" />
              <ActivityRankCard title="面談実施数" data={dStaffActivities} prevData={prevPrevStaffActivities} field="interviewsConducted" color="#e67e22" />
              <ActivityRankCard title="RA開拓アポ獲得" data={dStaffActivities} prevData={prevPrevStaffActivities} field="appointmentAcquisitions" color="#2ecc71" />
            </div>
            <h4 style={{ fontSize: 13, fontWeight: 600, color: "#e74c3c", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", display: "inline-block" }} />金額（万円）
            </h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16, marginBottom: isMobile ? 16 : 24 }} className="focus-grid">
              <AmountRankCard title="RA受注金額" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="ra" color="#e74c3c" />
              <AmountRankCard title="CA受注金額" data={dStaffActivities} prevData={prevPrevStaffActivities} entryType="ca" color="#9b59b6" />
            </div>

            {/* 注力セクション */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "3px solid #4cc9f0" }}>
              <div style={{ width: 6, height: 24, borderRadius: 3, background: "#4cc9f0" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>注力案件・人材</h3>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: isMobile ? 16 : 24 }}>
              <FocusProjectsDisplay projects={dProjects} />
              <FocusPeopleDisplay people={dPeople} />
            </div>

            {/* RA開拓セクション（3段目） */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "3px solid #2ecc71" }}>
              <div style={{ width: 6, height: 24, borderRadius: 3, background: "#2ecc71" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>RA開拓</h3>
            </div>
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
              <div style={{ background: tc.bgCard, borderRadius: 14, padding: isMobile ? 16 : 32, boxShadow: tc.shadow }}>
                <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12, marginBottom: 24 }}>
                  <label style={{ fontSize: 14, color: tc.textSecondary }}>保存日付：</label>
                  <input type="date" value={saveDate} onChange={(e) => setSaveDate(e.target.value)} style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 14 }} />
                  <button onClick={saveCurrentData} disabled={saving} style={{
                    padding: "10px 24px", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 14, fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1,
                  }}>
                    {saving ? "保存中..." : "保存"}
                  </button>
                </div>

                {/* 営業活動入力 */}
                <h2 style={{ fontSize: 20, fontWeight: 700, color: tc.textPrimary, marginBottom: 16 }}>営業活動</h2>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0077b6", display: "inline-block" }} />
                  件数セクター
                </h4>
                {staffActivities.map((s, i) => (
                  <div key={`count-${i}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                    <FieldWrap label="担当" className="fw-select" w={120}><select value={s.staff} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], staff: e.target.value }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(n => <option key={n}>{n}</option>)}</select></FieldWrap>
                    <FieldWrap label="面談設定数" w={100}><input type="text" inputMode="numeric" value={s.interviewSetups || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], interviewSetups: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                    <FieldWrap label="面談実施数" w={100}><input type="text" inputMode="numeric" value={s.interviewsConducted || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], interviewsConducted: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                    <FieldWrap label="RA開拓アポ獲得" w={130}><input type="text" inputMode="numeric" value={s.appointmentAcquisitions || ""} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], appointmentAcquisitions: parseNum(e.target.value) }; setStaffActivities(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                    <FieldWrap label="RA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersRA || ""} onChange={(e) => {
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].raEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "" }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], ordersRA: newCount, raEntries: newEntries };
                      setStaffActivities(a);
                    }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                    <FieldWrap label="CA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersCA || ""} onChange={(e) => {
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].caEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "" }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], ordersCA: newCount, caEntries: newEntries };
                      setStaffActivities(a);
                    }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                    <button onClick={() => setStaffActivities(staffActivities.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                  </div>
                ))}
                <button onClick={() => setStaffActivities([...staffActivities, { staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [] }])} style={addBtnStyle}>＋ 担当を追加</button>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 4, marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", display: "inline-block" }} />
                  金額セクター<span style={{ fontSize: 11, fontWeight: 400, color: tc.textSecondary }}>※件数セクターでRA受注数またはCA受注数が1以上の担当者のみ表示されます</span>
                </h4>
                <p style={{ fontSize: 11, color: tc.textSecondary, margin: "0 0 10px", paddingLeft: 16, lineHeight: 1.8 }}>入力単位：万円（整数4桁・小数1桁まで）<br />複数受注の場合は1件ずつ登録してください</p>
                {/* RA受注：件数降順 */}
                {(() => {
                  const raEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.ordersRA || 0) > 0).sort((a, b) => (b.s.ordersRA || 0) - (a.s.ordersRA || 0));
                  return raEntries.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e74c3c", marginBottom: 8 }}>RA受注</div>
                      {raEntries.map(({ s, i }) => (
                        <div key={`ra-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#fef8f8", borderRadius: 8, borderLeft: "3px solid #e74c3c" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.ordersRA}件）</div>
                          {(s.raEntries || []).map((entry, j) => (
                            <div key={`ra-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < s.raEntries.length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#e74c3c", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="売上（万円）" w={130}><input type="text" inputMode="decimal" value={formatAmount(entry.revenue || 0)} onChange={(e) => { const v = e.target.value; if (/^\d{0,4}(\.\d{0,1})?$/.test(v) || v === "") { const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], revenue: parseAmount(v) }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); } }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><input type="text" inputMode="decimal" value={formatAmount(entry.amount)} onChange={(e) => { const v = e.target.value; if (/^\d{0,4}(\.\d{0,1})?$/.test(v) || v === "") { const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], amount: parseAmount(v) }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); } }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><input type="text" value={entry.company || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], company: e.target.value }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select value={entry.affiliation || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select value={entry.position || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}
                {/* CA受注：件数降順 */}
                {(() => {
                  const caEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.ordersCA || 0) > 0).sort((a, b) => (b.s.ordersCA || 0) - (a.s.ordersCA || 0));
                  return caEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#9b59b6", marginBottom: 8 }}>CA受注</div>
                      {caEntries.map(({ s, i }) => (
                        <div key={`ca-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#f9f5fc", borderRadius: 8, borderLeft: "3px solid #9b59b6" }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.ordersCA}件）</div>
                          {(s.caEntries || []).map((entry, j) => (
                            <div key={`ca-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < s.caEntries.length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#9b59b6", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="仕入（万円）" w={130}><input type="text" inputMode="decimal" value={formatAmount(entry.revenue || 0)} onChange={(e) => { const v = e.target.value; if (/^\d{0,4}(\.\d{0,1})?$/.test(v) || v === "") { const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], revenue: parseAmount(v) }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); } }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><input type="text" inputMode="decimal" value={formatAmount(entry.amount)} onChange={(e) => { const v = e.target.value; if (/^\d{0,4}(\.\d{0,1})?$/.test(v) || v === "") { const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], amount: parseAmount(v) }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); } }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><input type="text" value={entry.company || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], company: e.target.value }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select value={entry.affiliation || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select value={entry.position || ""} onChange={(e) => { const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* 売上数値セクション */}
                <div style={{ marginTop: 24, borderTop: "3px solid " + tc.textPrimary }}>
                  <div onClick={() => setSectionSalesOpen(!sectionSalesOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionSalesOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>売上数値</h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionSalesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionSalesOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>
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
                    </div>
                  )}
                </div>


                {/* 注力セクション */}
                <div style={{ marginTop: 24, borderTop: "3px solid #1a1a2e" }}>
                  <div onClick={() => setSectionFocusOpen(!sectionFocusOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionFocusOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>注力</h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionFocusOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionFocusOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10 }}>注力案件</h4>
                  {focusProjects.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="企業名" grow><input type="text" value={p.company} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], company: e.target.value }; setFocusProjects(a); }} placeholder="企業名" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="案件タイトル" grow><input type="text" value={p.title} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], title: e.target.value.slice(0, 20) }; setFocusProjects(a); }} placeholder="案件タイトル" maxLength={20} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], position: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}><select value={p.staff} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], staff: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="単価" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.price ? p.price.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], price: parseNum(e.target.value) }; setFocusProjects(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="契約形態" className="fw-select" w={110}><select value={p.contract} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], contract: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option>派遣</option><option>準委任</option><option>両方OK</option></select></FieldWrap>
                      <FieldWrap label="勤務場所" className="fw-select" w={120}><select value={p.location} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], location: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{LOCATION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <button onClick={() => setFocusProjects(focusProjects.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusProjects([...focusProjects, { company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }])} style={addBtnStyle}>＋ 案件を追加</button>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10, marginTop: 24 }}>注力人材</h4>
                  {focusPeople.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="氏名" grow><input type="text" value={p.name} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], name: e.target.value }; setFocusPeople(a); }} placeholder="氏名" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="所属" className="fw-select" w={110}><select value={p.affiliation} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], affiliation: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], position: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}><select value={p.staff} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], staff: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="スキル" w={140}><input type="text" value={p.skill} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], skill: e.target.value.slice(0, 15) }; setFocusPeople(a); }} placeholder="スキル" maxLength={15} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="仕入れ額" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.cost ? p.cost.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], cost: parseNum(e.target.value) }; setFocusPeople(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <button onClick={() => setFocusPeople(focusPeople.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusPeople([...focusPeople, { name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }])} style={addBtnStyle}>＋ 人材を追加</button>

                    </div>
                  )}
                </div>

                {/* RA開拓セクション */}
                <div style={{ marginTop: 24, borderTop: "3px solid " + tc.textPrimary }}>
                  <div onClick={() => setSectionRAOpen(!sectionRAOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionRAOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0 }}>RA開拓</h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionRAOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionRAOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>

                  <div className="input-3col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                    <div>
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10 }}>案件獲得</h4>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 3 }}>企業数目標</label>
                          <input type="text" inputMode="numeric" value={raInp.acquisitionTarget} onChange={(e) => handleRaNumInput("acquisitionTarget", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 3 }}>進捗</label>
                          <input type="text" inputMode="numeric" value={raInp.acquisitionProgress} onChange={(e) => handleRaNumInput("acquisitionProgress", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 6 }}>案件獲得企業名</label>
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
                      <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10 }}>参画決定</h4>
                      <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 3 }}>企業目標</label>
                          <input type="text" inputMode="numeric" value={raInp.joinTarget} onChange={(e) => handleRaNumInput("joinTarget", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 3 }}>進捗</label>
                          <input type="text" inputMode="numeric" value={raInp.joinProgress} onChange={(e) => handleRaNumInput("joinProgress", e.target.value)} placeholder="0"
                            style={{ width: "100%", padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, textAlign: "right", outline: "none", boxSizing: "border-box" }} />
                        </div>
                      </div>
                      <label style={{ display: "block", fontSize: 12, color: tc.textSecondary, marginBottom: 6 }}>参画決定企業名</label>
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

                    </div>
                  )}
                </div>

                {/* 全体連絡セクション */}
                <div style={{ marginTop: 24, borderTop: "3px solid #1a1a2e" }}>
                  <div onClick={() => setSectionAnnouncementOpen(!sectionAnnouncementOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionAnnouncementOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      全体連絡
                    </h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionAnnouncementOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionAnnouncementOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>
                  {announcements.map((a, i) => (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                      <span style={{ fontSize: 13, color: tc.textSecondary, flexShrink: 0 }}>・</span>
                      <input type="text" value={a} onChange={(e) => { const arr = [...announcements]; arr[i] = e.target.value; setAnnouncements(arr); }} placeholder="連絡事項を入力" style={{ ...focusInputStyle, flex: 1 }} />
                      <button onClick={() => setAnnouncements(announcements.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setAnnouncements([...announcements, ""])} style={addBtnStyle}>＋ 連絡事項を追加</button>

                    </div>
                  )}
                </div>

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
            )}
          </div>
        </div>}

        {/* Toast */}
        {toast && (
          <div style={{ position: "fixed", bottom: 24, right: 24, padding: "12px 24px", background: tc.toastBg, color: tc.toastText, borderRadius: 10, fontSize: 14, fontWeight: 600, boxShadow: "0 4px 16px rgba(0,0,0,0.2)", zIndex: 1000 }}>
            {toast}
          </div>
        )}
      </div>
    </>
  );
}

// ===== FieldWrap =====
function FieldWrap({ label, children, grow, w, className }: { label: string; children: React.ReactNode; grow?: boolean; w?: number; className?: string }) {
  const { t: tc } = useTheme();
  return (
    <div className={className} style={{ flex: grow ? 1 : "none", width: w, minWidth: 0 }}>
      <span style={{ fontSize: 10, color: tc.textSecondary, display: "block" }}>{label}</span>
      {children}
    </div>
  );
}

// ===== サブコンポーネント =====
function DonutChart({ rate, size, color, trackColor }: { rate: number; size: number; color: string; trackColor: string }) {
  const sw = Math.max(Math.round(size / 8), 5);
  const r = (size - sw) / 2, c = Math.PI * 2 * r, pct = Math.min(rate, 100);
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={trackColor} strokeWidth={sw} />
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={sw}
        strokeDasharray={`${(pct / 100) * c} ${c}`} strokeLinecap="round" style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

function SummaryCard({ title, data, rate, isTotal, standby }: {
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

function Row({ label, value, labelColor, valueColor }: { label: string; value: string; labelColor: string; valueColor: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6, fontSize: 13 }}>
      <span style={{ color: labelColor }}>{label}</span><span style={{ fontWeight: 700, color: valueColor }}>{value}</span>
    </div>
  );
}

function FocusPeopleDisplay({ people }: { people: FocusPerson[] }) {
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

function FocusProjectsDisplay({ projects }: { projects: FocusProject[] }) {
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

function RADisplay({ ra }: { ra: RAData }) {
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

// ===== 月別営業活動成績コンポーネント =====
function MonthlyActivityView({ allData, setAllData, monthlyYM, setMonthlyYM, isMobile }: { allData: AllData; setAllData: React.Dispatch<React.SetStateAction<AllData>>; monthlyYM: string; setMonthlyYM: (v: string) => void; isMobile: boolean }) {
  const { theme, t: tc } = useTheme();
  const [monthlyMode, setMonthlyMode] = useState<"count" | "amount" | "other">("amount");
  const [sortState, setSortState] = useState<Record<string, "asc" | "desc" | "none">>({});
  const [budgets, setBudgets] = useState<Record<string, Record<string, number>>>({});
  const [carryovers, setCarryovers] = useState<Record<string, Record<string, number>>>({});
  const [countTargets, setCountTargets] = useState<Record<string, Record<string, number>>>({});
  const [editingCell, setEditingCell] = useState<{ staff: string; field: string; type: "budget" | "carryover" | "countTarget" | "dailyTarget"; dayKey?: string } | null>(null);
  const [caCountTotalOnly, setCaCountTotalOnly] = useState(false);
  const [caAmountTotalOnly, setCaAmountTotalOnly] = useState(false);
  const [editingCellValue, setEditingCellValue] = useState("");
  // その他
  const [miscItems, setMiscItems] = useState<{ staff: string; content: string; deadline: string; status: string; createdAt: string }[]>([]);
  const [miscInput, setMiscInput] = useState<{ staff: string; content: string; deadline: string; status: string }>({ staff: "", content: "", deadline: "", status: "" });
  const [miscSortKey, setMiscSortKey] = useState<"staff" | "status">("staff");
  const [miscSortDir, setMiscSortDir] = useState<"asc" | "desc">("asc");
  const [ymYear, ymMonth] = monthlyYM.split("-").map(Number);
  const daysInMonth = new Date(ymYear, ymMonth, 0).getDate();
  const DOW = ["日", "月", "火", "水", "木", "金", "土"];

  // 予算・前月繰越データをロード
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) return;
        const data = await res.json();
        const budgetData: Record<string, Record<string, number>> = {};
        const carryoverData: Record<string, Record<string, number>> = {};
        const countTargetData: Record<string, Record<string, number>> = {};
        for (const key of Object.keys(data)) {
          if (key.startsWith("budget-")) {
            budgetData[key] = data[key];
          } else if (key.startsWith("carryover-")) {
            carryoverData[key] = data[key];
          } else if (key.startsWith("countTarget-") || key.startsWith("dailyTarget-")) {
            countTargetData[key] = data[key];
          }
        }
        setBudgets(budgetData);
        setCarryovers(carryoverData);
        setCountTargets(countTargetData);
      } catch {}
    };
    loadData();
  }, []);

  // その他データのロード
  useEffect(() => {
    const loadMisc = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) return;
        const data = await res.json();
        const miscKey = `misc-${monthlyYM}`;
        if (data[miscKey] && Array.isArray(data[miscKey].items)) {
          setMiscItems(data[miscKey].items.map((item: any) => ({ ...item, deadline: item.deadline || "" })));
        } else {
          setMiscItems([]);
        }
      } catch {}
    };
    loadMisc();
  }, [monthlyYM]);

  // その他データを保存
  const saveMiscItems = async (items: { staff: string; content: string; deadline: string; status: string; createdAt: string }[]) => {
    const miscKey = `misc-${monthlyYM}`;
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: miscKey, data: { items } }) });
    } catch {}
  };

  // その他アイテム追加
  const addMiscItem = () => {
    if (!miscInput.staff || !miscInput.content || !miscInput.status) return;
    const now = new Date().toISOString();
    const updated = [...miscItems, { ...miscInput, createdAt: now }];
    setMiscItems(updated);
    saveMiscItems(updated);
    setMiscInput({ staff: "", content: "", deadline: "", status: "" });
  };

  // その他アイテム更新（内容・進捗のみ、日時は変えない）
  const updateMiscItem = (index: number, field: "content" | "deadline" | "status", value: string) => {
    const updated = [...miscItems];
    updated[index] = { ...updated[index], [field]: value };
    setMiscItems(updated);
    saveMiscItems(updated);
  };

  // その他アイテム削除
  const removeMiscItem = (index: number) => {
    const updated = miscItems.filter((_, i) => i !== index);
    setMiscItems(updated);
    saveMiscItems(updated);
  };

  // その他ソート切替
  const toggleMiscSort = (key: "staff" | "status") => {
    if (miscSortKey === key) {
      setMiscSortDir(prev => prev === "asc" ? "desc" : "asc");
    } else {
      setMiscSortKey(key);
      setMiscSortDir("asc");
    }
  };

  // 予算を保存
  const saveBudget = async (field: string, staff: string, value: number) => {
    const budgetKey = `budget-${field}-${monthlyYM}`;
    const current = budgets[budgetKey] || {};
    const updated = { ...current, [staff]: value };
    setBudgets(prev => ({ ...prev, [budgetKey]: updated }));
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: budgetKey, data: updated }),
      });
    } catch {}
  };

  // 前月繰越を保存
  const saveCarryover = async (field: string, staff: string, value: number) => {
    const carryoverKey = `carryover-${field}-${monthlyYM}`;
    const current = carryovers[carryoverKey] || {};
    const updated = { ...current, [staff]: value };
    setCarryovers(prev => ({ ...prev, [carryoverKey]: updated }));
    try {
      await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateKey: carryoverKey, data: updated }),
      });
    } catch {}
  };

  // 予算取得
  const getStaffBudget = (staff: string, field: string): number => {
    const budgetKey = `budget-${field}-${monthlyYM}`;
    return budgets[budgetKey]?.[staff] || 0;
  };

  // 前月繰越取得（手入力値）
  const getStaffCarryover = (staff: string, field: string): number => {
    const carryoverKey = `carryover-${field}-${monthlyYM}`;
    return carryovers[carryoverKey]?.[staff] || 0;
  };

  // 件数・月目標を保存
  const saveCountTarget = async (field: string, staff: string, value: number) => {
    const key = `countTarget-${field}-${monthlyYM}`;
    const current = countTargets[key] || {};
    const updated = { ...current, [staff]: value };
    setCountTargets(prev => ({ ...prev, [key]: updated }));
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: key, data: updated }) });
    } catch {}
  };

  // 件数・日目標を保存（担当×日ごと）
  const saveDailyTarget = async (field: string, staff: string, dayKey: string, value: number) => {
    const key = `dailyTarget-${field}-${monthlyYM}`;
    const current = countTargets[key] || {};
    const staffKey = `${staff}_${dayKey}`;
    const updated = { ...current, [staffKey]: value };
    setCountTargets(prev => ({ ...prev, [key]: updated }));
    try {
      await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: key, data: updated }) });
    } catch {}
  };

  // 件数・月目標取得
  const getCountTarget = (staff: string, field: string): number => {
    const key = `countTarget-${field}-${monthlyYM}`;
    return countTargets[key]?.[staff] || 0;
  };

  // 件数・日目標取得
  const getDailyTarget = (staff: string, field: string, dayKey: string): number => {
    const key = `dailyTarget-${field}-${monthlyYM}`;
    return countTargets[key]?.[`${staff}_${dayKey}`] || 0;
  };

  // 達成率の色
  const getAchievementColor = (rate: number): string => {
    if (rate <= 50) return "#e74c3c";      // 赤
    if (rate <= 80) return "#f39c12";      // 黄色
    if (rate <= 90) return "#27ae60";      // 緑
    return "#2980b9";                       // 青
  };

  // 達成率の背景色
  const getAchievementBg = (rate: number): string => {
    if (rate <= 50) return "#fdecea";
    if (rate <= 80) return "#fef9e7";
    if (rate <= 90) return "#eafaf1";
    return "#ebf5fb";
  };

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
  const getStaffDayValue = (staff: string, dayKey: string, field: keyof StaffActivity | string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    // Handle legacy amountCA/amountRA by summing entries
    if (field === "amountCA") {
      const entries = (entry as any).caEntries || [];
      return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || ((entry as any).amountCA || 0);
    }
    if (field === "amountRA") {
      const entries = (entry as any).raEntries || [];
      return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || ((entry as any).amountRA || 0);
    }
    return ((entry as any)[field] as number) || 0;
  };

  const getStaffMonthTotal = (staff: string, field: keyof StaffActivity | string): number => {
    return days.reduce((sum, day) => sum + getStaffDayValue(staff, day.key, field), 0);
  };

  const getDayTotal = (dayKey: string, field: keyof StaffActivity | string): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffDayValue(staff, dayKey, field), 0);
  };

  const getMonthGrandTotal = (field: keyof StaffActivity | string): number => {
    return STAFF_LIST.reduce((sum, staff) => sum + getStaffMonthTotal(staff, field), 0);
  };

  // CA/RA entries から所属別の金額を集計
  const getStaffDayAmountByAffiliation = (staff: string, dayKey: string, entryType: "ca" | "ra", affiliation: string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = entryType === "ca" ? ((entry as any).caEntries || []) : ((entry as any).raEntries || []);
    return entries
      .filter((e: any) => e.affiliation === affiliation)
      .reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  };

  // CA/RA entries の金額合計
  const getStaffDayAmountTotal = (staff: string, dayKey: string, entryType: "ca" | "ra"): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = entryType === "ca" ? ((entry as any).caEntries || []) : ((entry as any).raEntries || []);
    return entries.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
  };

  // 月間合計（所属別）
  const getStaffMonthAmountByAffiliation = (staff: string, entryType: "ca" | "ra", affiliation: string): number => {
    return days.reduce((sum, day) => sum + getStaffDayAmountByAffiliation(staff, day.key, entryType, affiliation), 0);
  };

  // 月間合計（全体）
  const getStaffMonthAmountTotal = (staff: string, entryType: "ca" | "ra"): number => {
    return days.reduce((sum, day) => sum + getStaffDayAmountTotal(staff, day.key, entryType), 0);
  };

  // CA entries から所属別の件数を集計（日別）
  const getStaffDayCACountByAffiliation = (staff: string, dayKey: string, affiliation: string): number => {
    const dayData = allData[dayKey];
    if (!dayData || !Array.isArray(dayData.staffActivities)) return 0;
    const entry = dayData.staffActivities.find((s: any) => s.staff === staff);
    if (!entry) return 0;
    const entries = (entry as any).caEntries || [];
    return entries.filter((e: any) => e.affiliation === affiliation).length;
  };

  // CA entries の所属別月間件数合計
  const getStaffMonthCACountByAffiliation = (staff: string, affiliation: string): number => {
    return days.reduce((sum, day) => sum + getStaffDayCACountByAffiliation(staff, day.key, affiliation), 0);
  };

  // 3桁カンマ区切り（小数点以下あり対応）
  const fmtAmount = (v: number): string => {
    if (v === 0) return "—";
    const parts = v.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  };

  // 繰越粗利ヘッダーラベル（X/1繰越粗利）
  const carryoverLabel = (() => {
    const [, m] = monthlyYM.split("-").map(Number);
    const nextMonth = m === 12 ? 1 : m + 1;
    return `${nextMonth}/1繰越粗利`;
  })();

  // 月計ヘッダーラベル（金額タブ用：X月営業粗利）
  const monthlyAmountLabel = (() => {
    const [, m] = monthlyYM.split("-").map(Number);
    return `${m}月営業粗利`;
  })();

  const isDark = theme === "dark";
  const cellStyle: React.CSSProperties = { padding: "4px 6px", textAlign: "center", fontSize: 12, borderRight: "1px solid " + tc.border, borderBottom: "1px solid " + tc.border, whiteSpace: "nowrap", color: tc.text };
  const headerCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 700, background: tc.bgSection, color: tc.text, position: "sticky", top: 0, zIndex: 2 };
  const staffCellStyle: React.CSSProperties = { ...cellStyle, fontWeight: 600, textAlign: "left", position: "sticky", left: 0, background: tc.bgCard, color: tc.text, zIndex: 1, minWidth: 70 };
  // Dark-safe accent backgrounds
  const hdrYellow = isDark ? "#3d3200" : "#fff3cd";
  const hdrGreen = isDark ? "#1a3a2a" : "#d4edda";
  const hdrBlue = isDark ? "#1a2e4a" : "#e8f4fd";
  const hdrBlueAlt = isDark ? "#1e3a5f" : "#dbeafe";
  const hdrGray = isDark ? "#2d3748" : "#e2e3e5";
  const rowEven = tc.bgCard;
  const rowOdd = isDark ? "#1a2332" : "#f8f9fb";

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* 年月セレクト + 件数/金額 切替 */}
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
        <select value={monthlyYM} onChange={(e) => setMonthlyYM(e.target.value)} style={{ padding: "8px 16px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 15, fontWeight: 600, background: tc.bgCard, color: tc.text, cursor: "pointer" }}>
          {ymOptions.map(ym => {
            const [y, m] = ym.split("-");
            return <option key={ym} value={ym}>{y}年{parseInt(m)}月</option>;
          })}
        </select>
        <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: "1px solid " + tc.inputBorder }}>
          {[{ key: "amount" as const, label: "金額" }, { key: "count" as const, label: "件数" }, { key: "other" as const, label: "その他" }].map(tab => (
            <button key={tab.key} onClick={() => setMonthlyMode(tab.key)} style={{
              padding: "8px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer", border: "none",
              background: monthlyMode === tab.key ? tc.accent : tc.bgCard, color: monthlyMode === tab.key ? "#fff" : tc.textSecondary,
            }}>{tab.label}</button>
          ))}
        </div>
      </div>

      {/* ベスト5 */}
      {monthlyMode === "count" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
          {ACTIVITY_FIELDS.map(af => {
            const ranked = STAFF_LIST
              .map(staff => ({ staff, total: getStaffMonthTotal(staff, af.key) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);
            const medals = ["🥇", "🥈", "🥉"];
            return (
              <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.label}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: af.color }}>{getMonthGrandTotal(af.key)}</span>
                </div>
                {ranked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  ranked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: af.color }}>{r.total}</span>
                    </div>
                  ))
                )}
              </div>
            );
          })}
        </div>
      )}

      {monthlyMode === "amount" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 24 }} className="focus-grid">
          {ACTIVITY_AMOUNT_FIELDS.map(af => {
            const medals = ["🥇", "🥈", "🥉"];
            const isCAField = af.key === "amountCA";
            const caSubs = ["プロパー", "BP", "フリーランス", "協業"];
            const getBudgetForField = (staff: string) => isCAField
              ? caSubs.reduce((sum, a) => sum + getStaffBudget(staff, `amountCA_${a}`), 0)
              : getStaffBudget(staff, af.key);
            const getCarryForField = (staff: string) => isCAField
              ? caSubs.reduce((sum, a) => sum + getStaffCarryover(staff, `amountCA_${a}`), 0)
              : getStaffCarryover(staff, af.key);
            const getMonthForField = (staff: string) => isCAField
              ? Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10
              : Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
            // 達成率ランキング
            const rateRanked = STAFF_LIST
              .map(staff => {
                const budget = getBudgetForField(staff);
                const carry = getCarryForField(staff);
                const month = getMonthForField(staff);
                const progress = carry + month;
                const rate = budget > 0 ? Math.round((progress / budget) * 1000) / 10 : 0;
                return { staff, rate, budget };
              })
              .filter(s => s.budget > 0)
              .sort((a, b) => b.rate - a.rate)
              .slice(0, 5);
            const allBudget = STAFF_LIST.reduce((sum, s) => sum + getBudgetForField(s), 0);
            const allProgress = STAFF_LIST.reduce((sum, s) => sum + getCarryForField(s) + getMonthForField(s), 0);
            const allRate = allBudget > 0 ? Math.round((allProgress / allBudget) * 1000) / 10 : 0;
            // 金額ランキング
            const amountRanked = STAFF_LIST
              .map(staff => ({ staff, total: getMonthForField(staff) }))
              .filter(s => s.total > 0)
              .sort((a, b) => b.total - a.total)
              .slice(0, 5);
            const grandTotal = isCAField
              ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10
              : Math.round(getMonthGrandTotal(af.key) * 10) / 10;
            return (<>
              {/* 達成率カード */}
              <div key={af.key + "_rate"} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.key === "amountRA" ? "RA達成率" : "CA達成率"}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: allBudget > 0 ? getAchievementColor(allRate) : "#ccc" }}>{allBudget > 0 ? `${allRate.toFixed(1)}%` : "—"}</span>
                </div>
                {rateRanked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  rateRanked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: getAchievementColor(r.rate) }}>{r.rate.toFixed(1)}%</span>
                    </div>
                  ))
                )}
              </div>
              {/* 金額カード */}
              <div key={af.key + "_amount"} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <h3 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{af.rankLabel}</h3>
                  <span style={{ fontSize: 18, fontWeight: 700, color: af.color }}>{grandTotal > 0 ? fmtAmount(grandTotal) : "0"}万円</span>
                </div>
                {amountRanked.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>データなし</p> : (
                  amountRanked.map((r, i) => (
                    <div key={r.staff} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 0", borderBottom: "1px solid #f0f2f5" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {i < 3 ? <span style={{ fontSize: 16 }}>{medals[i]}</span> : <span style={{ fontSize: 12, color: tc.textSecondary, fontWeight: 700, width: 20, textAlign: "center" }}>{i + 1}</span>}
                        <span style={{ fontSize: 13, fontWeight: 600, color: tc.textPrimary }}>{r.staff}</span>
                      </div>
                      <span style={{ fontSize: 15, fontWeight: 700, color: af.color }}>{r.total > 0 ? fmtAmount(r.total) : "0"}万円</span>
                    </div>
                  ))
                )}
              </div>
            </>);
          })}
        </div>
      )}

      {/* 各指標ごとにテーブル（件数）— 面談設定数を先頭に */}
      {monthlyMode === "count" && [...ACTIVITY_FIELDS].sort((a, b) => a.targetType === "daily" ? -1 : b.targetType === "daily" ? 1 : 0).map(af => {
        const isDaily = af.targetType === "daily";
        const sortKeyMonth = af.key + "_cMonth";
        const sortKeyTarget = af.key + "_cTarget";
        const sortKeyRate = af.key + "_cRate";
        const allCountSortKeys = [sortKeyMonth, sortKeyTarget, sortKeyRate];
        const currentSortMonth = sortState[sortKeyMonth] || "none";
        const currentSortTarget = sortState[sortKeyTarget] || "none";
        const currentSortRate = sortState[sortKeyRate] || "none";
        const makeToggleC = (key: string, current: string) => () => {
          const reset: Record<string, "none"> = {};
          allCountSortKeys.forEach(k => { reset[k] = "none"; });
          setSortState(prev => ({ ...prev, ...reset, [key]: current === "none" ? "desc" : current === "desc" ? "asc" : "none" }));
        };
        const toggleSortMonth = makeToggleC(sortKeyMonth, currentSortMonth);
        const toggleSortTarget = makeToggleC(sortKeyTarget, currentSortTarget);
        const toggleSortRate = makeToggleC(sortKeyRate, currentSortRate);
        const sortIconC = (s: string) => s === "asc" ? "▲" : s === "desc" ? "▼" : "⇅";

        // ソート
        let sortedStaff = [...STAFF_LIST];
        if (currentSortMonth !== "none") {
          sortedStaff.sort((a, b) => {
            const av = getStaffMonthTotal(a, af.key), bv = getStaffMonthTotal(b, af.key);
            return currentSortMonth === "asc" ? av - bv : bv - av;
          });
        } else if (currentSortTarget !== "none") {
          sortedStaff.sort((a, b) => {
            const av = getCountTarget(a, af.key), bv = getCountTarget(b, af.key);
            return currentSortTarget === "asc" ? av - bv : bv - av;
          });
        } else if (currentSortRate !== "none" && !isDaily) {
          sortedStaff.sort((a, b) => {
            const aT = getCountTarget(a, af.key), bT = getCountTarget(b, af.key);
            const aR = aT > 0 ? (getStaffMonthTotal(a, af.key) / aT) * 100 : 0;
            const bR = bT > 0 ? (getStaffMonthTotal(b, af.key) / bT) * 100 : 0;
            return currentSortRate === "asc" ? aR - bR : bR - aR;
          });
        }

        const isCACount = af.key === "ordersCA";
        const caCountSubs = ["プロパー", "BP", "フリーランス", "協業"];

        return (
        <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow, marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: af.color, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: af.color, display: "inline-block" }} />
            {af.label}
            <span style={{ fontSize: 13, color: tc.textMuted, fontWeight: 400, marginLeft: 8 }}>月合計: {getMonthGrandTotal(af.key)}</span>
          </h3>
          {isCACount && (
            <label style={{ fontSize: 12, fontWeight: 500, color: tc.textSecondary, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={caCountTotalOnly} onChange={(e) => setCaCountTotalOnly(e.target.checked)} style={{ cursor: "pointer" }} />
              計のみ表示
            </label>
          )}
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, minWidth: 70 }}>担当</th>
                {isCACount && !caCountTotalOnly && <th style={{ ...headerCellStyle, minWidth: 70 }}>所属</th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortTarget}>
                  {isDaily ? "日目標" : "目標"} {sortIconC(currentSortTarget)}
                </th>
                {!isDaily && (
                  <th style={{ ...headerCellStyle, background: hdrGreen, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortRate}>
                    達成率 {sortIconC(currentSortRate)}
                  </th>
                )}
                <th style={{ ...headerCellStyle, background: hdrBlue, minWidth: 50, cursor: "pointer", userSelect: "none" }} onClick={toggleSortMonth}>
                  月計 {sortIconC(currentSortMonth)}
                </th>
                {days.map(day => (
                  <th key={day.d} style={{ ...headerCellStyle, color: day.isRed ? "#e63946" : tc.text, minWidth: 36 }} title={day.holiday || ""}>
                    {day.d}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, fontSize: 10, padding: "2px 6px" }}></th>
                {isCACount && !caCountTotalOnly && <th style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px" }}></th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, fontSize: 10, padding: "2px 6px" }}>{isDaily ? "/日" : "件"}</th>
                {!isDaily && <th style={{ ...headerCellStyle, background: hdrGreen, fontSize: 10, padding: "2px 6px" }}>%</th>}
                <th style={{ ...headerCellStyle, background: hdrBlue, fontSize: 10, padding: "2px 6px" }}></th>
                {days.map(day => (
                  <th key={`dow-${day.d}`} style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px", color: day.isRed ? "#e63946" : tc.textMuted }}>
                    {day.holiday ? "祝" : day.dowLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staff, idx) => {
                const monthTotal = getStaffMonthTotal(staff, af.key);
                const target = getCountTarget(staff, af.key);
                const rowBg = idx % 2 === 1 ? rowOdd : rowEven;
                const isEditingTarget = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "countTarget";
                // 月目標の達成率
                const monthRate = (!isDaily && target > 0) ? Math.round((monthTotal / target) * 1000) / 10 : 0;

                if (isCACount) {
                  const subRowCount = caCountTotalOnly ? 1 : 5;
                  const borderBottom = caCountTotalOnly ? undefined : "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  const totalTargetAll = caCountSubs.reduce((sum, sub) => sum + getCountTarget(staff, `ordersCA_${sub}`), 0);
                  const totalRateAll = totalTargetAll > 0 ? Math.round((monthTotal / totalTargetAll) * 1000) / 10 : 0;

                  if (caCountTotalOnly) {
                    return (
                      <tr key={staff} style={{ background: rowBg }}>
                        <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0") }}>
                          <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalTargetAll > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                            {totalTargetAll > 0 ? totalTargetAll : "\u2014"}
                          </span>
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: totalTargetAll > 0 ? getAchievementColor(totalRateAll) : "#ccc", background: totalTargetAll > 0 ? getAchievementBg(totalRateAll) : undefined, textAlign: "right" }}>
                          {totalTargetAll > 0 ? `${totalRateAll.toFixed(1)}%` : "\u2014"}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{monthTotal}</td>
                        {days.map(day => {
                          const val = getStaffDayValue(staff, day.key, af.key);
                          return (
                            <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                              {val || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <Fragment key={staff}>
                      {caCountSubs.map((sub, subIdx) => {
                        const subTarget = getCountTarget(staff, `ordersCA_${sub}`);
                        const subMonthTotal = getStaffMonthCACountByAffiliation(staff, sub);
                        const subRate = subTarget > 0 ? Math.round((subMonthTotal / subTarget) * 1000) / 10 : 0;
                        const isEditingSub = editingCell?.staff === staff && editingCell?.field === `ordersCA_${sub}` && editingCell?.type === "countTarget";
                        return (
                          <tr key={`${staff}-${sub}`} style={{ background: rowBg }}>
                            {subIdx === 0 && (
                              <td rowSpan={subRowCount} style={{ ...staffCellStyle, background: rowBg, borderBottom, verticalAlign: "middle" }}>{staff}</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                              {sub}
                            </td>
                            {/* 目標（編集可能） */}
                            <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 50, padding: 0, borderBottom: dashBorder }}
                              onClick={() => { if (!isEditingSub) { setEditingCell({ staff, field: `ordersCA_${sub}`, type: "countTarget" }); setEditingCellValue(subTarget ? String(subTarget) : ""); } }}>
                              {isEditingSub ? (
                                <input type="text" inputMode="numeric" autoFocus value={editingCellValue}
                                  onChange={(e) => { const v = e.target.value; if (/^\d{0,5}$/.test(v) || v === "") setEditingCellValue(v); }}
                                  onBlur={() => { saveCountTarget(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); }}
                                  onKeyDown={(e) => { if (e.key === "Enter") { saveCountTarget(`ordersCA_${sub}`, staff, parseInt(editingCellValue) || 0); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                  style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }} />
                              ) : (
                                <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: subTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                  {subTarget > 0 ? subTarget : "—"}
                                </span>
                              )}
                            </td>
                            {/* 達成率 */}
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subTarget > 0 ? getAchievementColor(subRate) : "#ccc", background: subTarget > 0 ? getAchievementBg(subRate) : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            {/* 月計 */}
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonthTotal > 0 ? subColor : tc.textDisabled, fontSize: 11, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom: dashBorder, textAlign: "right" }}>
                              {subMonthTotal > 0 ? subMonthTotal : "-"}
                            </td>
                            {/* 日付セル */}
                            {days.map(day => {
                              const val = getStaffDayCACountByAffiliation(staff, day.key, sub);
                              return (
                                <td key={day.d} style={{ ...cellStyle, color: val > 0 ? subColor : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 600 : 400, fontSize: 11, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                  {val || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const totalTarget = caCountSubs.reduce((sum, sub) => sum + getCountTarget(staff, `ordersCA_${sub}`), 0);
                        const totalRate = totalTarget > 0 ? Math.round((monthTotal / totalTarget) * 1000) / 10 : 0;
                        return (
                          <tr key={`${staff}-total`} style={{ background: rowBg, borderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom }}>計</td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), borderBottom }}>
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                {totalTarget > 0 ? totalTarget : "—"}
                              </span>
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: totalTarget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalTarget > 0 ? getAchievementBg(totalRate) : undefined, borderBottom, textAlign: "right" }}>
                              {totalTarget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom, textAlign: "right" }}>{monthTotal}</td>
                            {days.map(day => {
                              const val = getStaffDayValue(staff, day.key, af.key);
                              return (
                                <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : (isDark ? "#555" : "#ddd"), fontWeight: val > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom, textAlign: "right" }}>
                                  {val || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </Fragment>
                  );
                }

                return (
                  <tr key={staff} style={{ background: rowBg }}>
                    <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                    {/* 目標（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 50, padding: 0 }}
                      onClick={() => { if (!isEditingTarget) { setEditingCell({ staff, field: af.key, type: "countTarget" }); setEditingCellValue(target ? String(target) : ""); } }}>
                      {isEditingTarget ? (
                        <input type="text" inputMode="numeric" autoFocus value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,5}$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { saveCountTarget(af.key, staff, parseInt(editingCellValue) || 0); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { saveCountTarget(af.key, staff, parseInt(editingCellValue) || 0); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: target > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {target > 0 ? target : "—"}
                        </span>
                      )}
                    </td>
                    {/* 達成率（月目標のみ） */}
                    {!isDaily && (
                      <td style={{ ...cellStyle, fontWeight: 700, color: target > 0 ? getAchievementColor(monthRate) : "#ccc", background: target > 0 ? getAchievementBg(monthRate) : undefined, textAlign: "right" }}>
                        {target > 0 ? `${monthRate.toFixed(1)}%` : "—"}
                      </td>
                    )}
                    {/* 月計 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{monthTotal}</td>
                    {/* 日付セル */}
                    {days.map(day => {
                      const val = getStaffDayValue(staff, day.key, af.key);
                      if (isDaily) {
                        // 日目標：件数のみ表示、日目標があれば達成率色を適用
                        const dayTarget = getDailyTarget(staff, af.key, day.key) || target;
                        const dayRate = dayTarget > 0 && val > 0 ? Math.round((val / dayTarget) * 1000) / 10 : 0;
                        const hasDayTarget = dayTarget > 0;
                        const cellBg = day.isRed ? "#fef8f8" : (hasDayTarget && val > 0 ? getAchievementBg(dayRate) : undefined);
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: val > 0 ? (hasDayTarget ? getAchievementColor(dayRate) : af.color) : "#ddd", fontWeight: val > 0 ? 700 : 400, background: cellBg, textAlign: "right" }}>
                            {val || "-"}
                          </td>
                        );
                      } else {
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: val > 0 ? af.color : "#ddd", fontWeight: val > 0 ? 700 : 400, background: day.isRed ? "#fef8f8" : undefined, textAlign: "right" }}>
                            {val || "-"}
                          </td>
                        );
                      }
                    })}
                  </tr>
                );
              })}
              {/* 合計行 */}
              {(() => {
                if (isCACount) {
                  const totalBorderBottom = "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  const gTarget = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountTarget(s, `ordersCA_${sub}`), 0), 0);
                  const gMonth = getMonthGrandTotal(af.key);
                  const gRate = gTarget > 0 ? Math.round((gMonth / gTarget) * 1000) / 10 : 0;

                  if (caCountTotalOnly) {
                    return (
                      <tr style={{ background: tc.bgSection }}>
                        <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: gTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, textAlign: "right" }}>{gTarget > 0 ? gTarget : "\u2014"}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>{gTarget > 0 ? <span style={{ color: getAchievementColor(gRate) }}>{gRate.toFixed(1)}%</span> : "\u2014"}</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{gMonth}</td>
                        {days.map(day => {
                          const dayTotal = getDayTotal(day.key, af.key);
                          return (
                            <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                              {dayTotal || "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }

                  return (
                    <>
                      {caCountSubs.map((sub, subIdx) => {
                        const subTarget = STAFF_LIST.reduce((sum, s) => sum + getCountTarget(s, `ordersCA_${sub}`), 0);
                        const subMonth = STAFF_LIST.reduce((sum, s) => sum + getStaffMonthCACountByAffiliation(s, sub), 0);
                        const subRate = subTarget > 0 ? Math.round((subMonth / subTarget) * 1000) / 10 : 0;
                        return (
                          <tr key={`grand-${sub}`} style={{ background: tc.bgSection }}>
                            {subIdx === 0 && (
                              <td rowSpan={5} style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection, verticalAlign: "middle", borderBottom: totalBorderBottom }}>合計</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>{sub}</td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? subTarget : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subTarget > 0 ? getAchievementColor(subRate) : "#ccc", background: subTarget > 0 ? getAchievementBg(subRate) : hdrGreen, borderBottom: dashBorder, textAlign: "right" }}>
                              {subTarget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonth > 0 ? subColor : tc.textDisabled, background: hdrBlue, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {subMonth > 0 ? subMonth : "-"}
                            </td>
                            {days.map(day => {
                              const dayVal = STAFF_LIST.reduce((sum, s) => sum + getStaffDayCACountByAffiliation(s, day.key, sub), 0);
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: dayVal > 0 ? subColor : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: dashBorder, textAlign: "right" }}>
                                  {dayVal || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const grandTarget = STAFF_LIST.reduce((sum, s) => sum + caCountSubs.reduce((ss, sub) => ss + getCountTarget(s, `ordersCA_${sub}`), 0), 0);
                        const grandMonth = getMonthGrandTotal(af.key);
                        const grandRate = grandTarget > 0 ? Math.round((grandMonth / grandTarget) * 1000) / 10 : 0;
                        return (
                          <tr style={{ background: tc.bgSection, borderBottom: totalBorderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: totalBorderBottom }}>計</td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: grandTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandTarget > 0 ? grandTarget : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandTarget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, borderBottom: totalBorderBottom, textAlign: "right" }}>{grandMonth}</td>
                            {days.map(day => {
                              const dayTotal = getDayTotal(day.key, af.key);
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: totalBorderBottom, textAlign: "right" }}>
                                  {dayTotal || "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </>
                  );
                } else {
                  // RA等: 従来通り1行
                  const totalTarget = STAFF_LIST.reduce((sum, s) => sum + getCountTarget(s, af.key), 0);
                  const totalMonth = getMonthGrandTotal(af.key);
                  const totalRate = totalTarget > 0 ? Math.round((totalMonth / totalTarget) * 1000) / 10 : 0;
                  return (
                    <tr style={{ background: tc.bgSection }}>
                      <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalTarget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, textAlign: "right" }}>
                        {totalTarget > 0 ? totalTarget : "—"}
                      </td>
                      {!isDaily && (
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                          {totalTarget > 0 ? <span style={{ color: getAchievementColor(totalRate) }}>{totalRate.toFixed(1)}%</span> : "—"}
                        </td>
                      )}
                      <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{totalMonth}</td>
                      {days.map(day => {
                        const dayTotal = getDayTotal(day.key, af.key);
                        return (
                          <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                            {dayTotal || "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
        );
      })}

      {/* 金額テーブル（新仕様：担当→予算→進捗→達成率→前月繰越→月計→日付） */}
      {monthlyMode === "amount" && ACTIVITY_AMOUNT_FIELDS.map(af => {
        const sortKeyBudget = af.key + "_budget";
        const sortKeyProgress = af.key + "_progress";
        const sortKeyRate = af.key + "_rate";
        const sortKeyCarryover = af.key + "_carryover";
        const sortKeyMonth = af.key + "_month";
        const allAmountSortKeys = [sortKeyBudget, sortKeyProgress, sortKeyRate, sortKeyCarryover, sortKeyMonth];
        const currentSortBudget = sortState[sortKeyBudget] || "none";
        const currentSortProgress = sortState[sortKeyProgress] || "none";
        const currentSortRate = sortState[sortKeyRate] || "none";
        const currentSortCarryover = sortState[sortKeyCarryover] || "none";
        const currentSortMonth = sortState[sortKeyMonth] || "none";
        const makeToggle = (key: string, current: string) => () => {
          const reset: Record<string, "none"> = {};
          allAmountSortKeys.forEach(k => { reset[k] = "none"; });
          setSortState(prev => ({ ...prev, ...reset, [key]: current === "none" ? "desc" : current === "desc" ? "asc" : "none" }));
        };
        const toggleSortBudget = makeToggle(sortKeyBudget, currentSortBudget);
        const toggleSortProgress = makeToggle(sortKeyProgress, currentSortProgress);
        const toggleSortRate = makeToggle(sortKeyRate, currentSortRate);
        const toggleSortCarryover = makeToggle(sortKeyCarryover, currentSortCarryover);
        const toggleSortMonth = makeToggle(sortKeyMonth, currentSortMonth);
        const sortIcon = (s: string) => s === "asc" ? "▲" : s === "desc" ? "▼" : "⇅";

        // ソート対象を決定
        let sortedStaff = [...STAFF_LIST];
        const isCATable = af.key === "amountCA";
        const caAffiliations = ["プロパー", "BP", "フリーランス", "協業"];
        const getTableBudget = (staff: string) => isCATable
          ? caAffiliations.reduce((sum, a) => sum + getStaffBudget(staff, `amountCA_${a}`), 0)
          : getStaffBudget(staff, af.key);
        const getTableCarry = (staff: string) => isCATable
          ? caAffiliations.reduce((sum, a) => sum + getStaffCarryover(staff, `amountCA_${a}`), 0)
          : getStaffCarryover(staff, af.key);
        const getTableMonth = (staff: string) => isCATable
          ? Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10
          : Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
        const getProgress = (staff: string) => {
          const c = getTableCarry(staff);
          const m = getTableMonth(staff);
          return Math.round((c + m) * 10) / 10;
        };
        const getRate = (staff: string) => {
          const b = getTableBudget(staff);
          return b > 0 ? (getProgress(staff) / b) * 100 : 0;
        };
        if (currentSortBudget !== "none") {
          sortedStaff.sort((a, b) => currentSortBudget === "asc" ? getTableBudget(a) - getTableBudget(b) : getTableBudget(b) - getTableBudget(a));
        } else if (currentSortProgress !== "none") {
          sortedStaff.sort((a, b) => currentSortProgress === "asc" ? getProgress(a) - getProgress(b) : getProgress(b) - getProgress(a));
        } else if (currentSortRate !== "none") {
          sortedStaff.sort((a, b) => currentSortRate === "asc" ? getRate(a) - getRate(b) : getRate(b) - getRate(a));
        } else if (currentSortCarryover !== "none") {
          sortedStaff.sort((a, b) => currentSortCarryover === "asc" ? getTableCarry(a) - getTableCarry(b) : getTableCarry(b) - getTableCarry(a));
        } else if (currentSortMonth !== "none") {
          sortedStaff.sort((a, b) => currentSortMonth === "asc" ? getTableMonth(a) - getTableMonth(b) : getTableMonth(b) - getTableMonth(a));
        }

        return (
        <div key={af.key} style={{ background: tc.bgCard, borderRadius: 14, padding: "16px", boxShadow: tc.shadow, marginBottom: 20, overflowX: "auto" }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, color: af.color, margin: "0 0 12px", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <span style={{ width: 10, height: 10, borderRadius: "50%", background: af.color, display: "inline-block" }} />
            {af.tableLabel}
            {(() => {
              const totalCarry = isCATable
                ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getTableCarry(s), 0) * 10) / 10
                : Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, af.key), 0) * 10) / 10;
              const totalMonth = isCATable
                ? Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10
                : Math.round(getMonthGrandTotal(af.key) * 10) / 10;
              const totalProgress = Math.round((totalCarry + totalMonth) * 10) / 10;
              return (
                <>
                  <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#93c5fd" : "#1e40af", marginLeft: 8 }}>進捗: {totalProgress > 0 ? fmtAmount(totalProgress) : "0"}万円</span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: af.color }}>今月新規: {totalMonth > 0 ? fmtAmount(totalMonth) : "0"}万円</span>
                </>
              );
            })()}
          </h3>
          {isCATable && (
            <label style={{ fontSize: 12, fontWeight: 500, color: tc.textSecondary, display: "flex", alignItems: "center", gap: 4, cursor: "pointer", marginBottom: 8 }}>
              <input type="checkbox" checked={caAmountTotalOnly} onChange={(e) => setCaAmountTotalOnly(e.target.checked)} style={{ cursor: "pointer" }} />
              計のみ表示
            </label>
          )}
          <table style={{ borderCollapse: "collapse", fontSize: 12, width: "max-content", minWidth: "100%" }}>
            <thead>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, minWidth: 70 }}>担当</th>
                {isCATable && !caAmountTotalOnly && <th style={{ ...headerCellStyle, minWidth: 70 }}>所属</th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortBudget}>
                  予算 {sortIcon(currentSortBudget)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrBlueAlt, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortProgress}>
                  進捗 {sortIcon(currentSortProgress)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrGreen, minWidth: 70, cursor: "pointer", userSelect: "none" }} onClick={toggleSortRate}>
                  達成率 {sortIcon(currentSortRate)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrGray, minWidth: 90, cursor: "pointer", userSelect: "none" }} onClick={toggleSortCarryover}>
                  {carryoverLabel} {sortIcon(currentSortCarryover)}
                </th>
                <th style={{ ...headerCellStyle, background: hdrBlue, minWidth: 80, cursor: "pointer", userSelect: "none" }} onClick={toggleSortMonth}>
                  {monthlyAmountLabel} {sortIcon(currentSortMonth)}
                </th>
                {days.map(day => (
                  <th key={day.d} style={{ ...headerCellStyle, color: day.isRed ? "#e63946" : tc.text, minWidth: 46 }} title={day.holiday || ""}>
                    {day.d}
                  </th>
                ))}
              </tr>
              <tr>
                <th style={{ ...headerCellStyle, position: "sticky", left: 0, zIndex: 4, fontSize: 10, padding: "2px 6px" }}></th>
                {isCATable && !caAmountTotalOnly && <th style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px" }}></th>}
                <th style={{ ...headerCellStyle, background: hdrYellow, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrBlueAlt, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrGreen, fontSize: 10, padding: "2px 6px" }}>%</th>
                <th style={{ ...headerCellStyle, background: hdrGray, fontSize: 10, padding: "2px 6px" }}>万円</th>
                <th style={{ ...headerCellStyle, background: hdrBlue, fontSize: 10, padding: "2px 6px" }}>万円</th>
                {days.map(day => (
                  <th key={`dow-${day.d}`} style={{ ...headerCellStyle, fontSize: 10, padding: "2px 6px", color: day.isRed ? "#e63946" : tc.textMuted }}>
                    {day.holiday ? "祝" : day.dowLabel}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedStaff.map((staff, idx) => {
                const monthTotal = Math.round(getStaffMonthTotal(staff, af.key) * 10) / 10;
                const budget = getStaffBudget(staff, af.key);
                const carryover = getStaffCarryover(staff, af.key);
                const progress = Math.round((carryover + monthTotal) * 10) / 10;
                const achievementRate = budget > 0 ? Math.round((progress / budget) * 1000) / 10 : 0;
                const rowBg = idx % 2 === 1 ? rowOdd : rowEven;
                const isEditingBudget = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "budget";
                const isEditingCarryover = editingCell?.staff === staff && editingCell?.field === af.key && editingCell?.type === "carryover";
                const caSubTypes = isCATable ? [
                  { label: "プロパー", affiliation: "プロパー" },
                  { label: "BP", affiliation: "BP" },
                  { label: "フリーランス", affiliation: "フリーランス" },
                  { label: "協業", affiliation: "協業" },
                ] : [];
                const subRowCount = isCATable ? 5 : 1;
                const borderBottom = isCATable ? "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0") : undefined;
                return isCATable ? (
                  caAmountTotalOnly ? (
                    (() => {
                      const totalBudget = Math.round((getStaffBudget(staff, "amountCA_プロパー") + getStaffBudget(staff, "amountCA_BP") + getStaffBudget(staff, "amountCA_フリーランス") + getStaffBudget(staff, "amountCA_協業")) * 10) / 10;
                      const totalCarryover = Math.round((getStaffCarryover(staff, "amountCA_プロパー") + getStaffCarryover(staff, "amountCA_BP") + getStaffCarryover(staff, "amountCA_フリーランス") + getStaffCarryover(staff, "amountCA_協業")) * 10) / 10;
                      const totalMonth = Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10;
                      const totalProgress = Math.round((totalCarryover + totalMonth) * 10) / 10;
                      const totalRate = totalBudget > 0 ? Math.round((totalProgress / totalBudget) * 1000) / 10 : 0;
                      return (
                        <tr key={staff} style={{ background: rowBg }}>
                          <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                          <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), textAlign: "right" }}>
                            <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                              {fmtAmount(totalBudget)}
                            </span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), textAlign: "right" }}>
                            {fmtAmount(totalProgress)}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalBudget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalBudget > 0 ? getAchievementBg(totalRate) : undefined, textAlign: "right" }}>
                            {totalBudget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), textAlign: "right" }}>
                            <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalCarryover > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(totalCarryover)}</span>
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 700, color: totalMonth > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{fmtAmount(totalMonth)}</td>
                          {days.map(day => {
                            const val = getStaffDayAmountTotal(staff, day.key, "ca");
                            const rounded = Math.round(val * 10) / 10;
                            return (
                              <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                                {rounded > 0 ? fmtAmount(rounded) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })()
                  ) : (
                  <Fragment key={staff}>
                    {/* プロパー/BP/フリーランス sub-rows */}
                    {caSubTypes.map((sub, subIdx) => {
                      const subMonthTotal = Math.round(getStaffMonthAmountByAffiliation(staff, "ca", sub.affiliation) * 10) / 10;
                      const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                      const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                      return (
                        <tr key={`${staff}-${sub.label}`} style={{ background: rowBg }}>
                          {subIdx === 0 && (
                            <td rowSpan={subRowCount} style={{ ...staffCellStyle, background: rowBg, borderBottom, verticalAlign: "middle" }}>{staff}</td>
                          )}
                          <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                            {sub.label}
                          </td>
                          <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 70, padding: 0, borderBottom: dashBorder, textAlign: "right" }}
                            onClick={() => { if (!isEditingBudget) { setEditingCell({ staff, field: `amountCA_${sub.affiliation}`, type: "budget" }); setEditingCellValue(getStaffBudget(staff, `amountCA_${sub.affiliation}`) ? String(getStaffBudget(staff, `amountCA_${sub.affiliation}`)) : ""); } }}>
                            {editingCell?.staff === staff && editingCell?.field === `amountCA_${sub.affiliation}` && editingCell?.type === "budget" ? (
                              <input type="text" inputMode="decimal" autoFocus value={editingCellValue}
                                onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                                onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveBudget(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveBudget(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }} />
                            ) : (
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: getStaffBudget(staff, `amountCA_${sub.affiliation}`) > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                                {fmtAmount(getStaffBudget(staff, `amountCA_${sub.affiliation}`))}
                              </span>
                            )}
                          </td>
                          {(() => {
                            const subBudget = getStaffBudget(staff, `amountCA_${sub.affiliation}`);
                            const subCarryover = getStaffCarryover(staff, `amountCA_${sub.affiliation}`);
                            const subProgress = Math.round((subCarryover + subMonthTotal) * 10) / 10;
                            const subRate = subBudget > 0 ? Math.round((subProgress / subBudget) * 1000) / 10 : 0;
                            return (
                              <>
                                <td style={{ ...cellStyle, fontWeight: 600, color: subProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), borderBottom: dashBorder, fontSize: 11, textAlign: "right" }}>
                                  {fmtAmount(subProgress)}
                                </td>
                                <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subBudget > 0 ? getAchievementColor(subRate) : "#ccc", background: subBudget > 0 ? getAchievementBg(subRate) : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                  {subBudget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                                </td>
                              </>
                            );
                          })()}
                          <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), cursor: "pointer", minWidth: 70, padding: 0, borderBottom: dashBorder, textAlign: "right" }}
                            onClick={() => { if (!isEditingCarryover) { setEditingCell({ staff, field: `amountCA_${sub.affiliation}`, type: "carryover" }); setEditingCellValue(getStaffCarryover(staff, `amountCA_${sub.affiliation}`) ? String(getStaffCarryover(staff, `amountCA_${sub.affiliation}`)) : ""); } }}>
                            {editingCell?.staff === staff && editingCell?.field === `amountCA_${sub.affiliation}` && editingCell?.type === "carryover" ? (
                              <input type="text" inputMode="decimal" autoFocus value={editingCellValue}
                                onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                                onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveCarryover(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                                onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveCarryover(`amountCA_${sub.affiliation}`, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                                style={{ width: "100%", border: "2px solid #6c757d", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#f8f9fa", boxSizing: "border-box" }} />
                            ) : (
                              <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: getStaffCarryover(staff, `amountCA_${sub.affiliation}`) > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(getStaffCarryover(staff, `amountCA_${sub.affiliation}`))}</span>
                            )}
                          </td>
                          <td style={{ ...cellStyle, fontWeight: 600, color: subMonthTotal > 0 ? subColor : tc.textDisabled, fontSize: 11, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom: dashBorder, textAlign: "right" }}>
                            {fmtAmount(subMonthTotal)}
                          </td>
                          {days.map(day => {
                            const val = getStaffDayAmountByAffiliation(staff, day.key, "ca", sub.affiliation);
                            const rounded = Math.round(val * 10) / 10;
                            return (
                              <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? subColor : tc.textDisabled, fontWeight: rounded > 0 ? 600 : 400, fontSize: 11, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom: dashBorder, textAlign: "right" }}>
                                {rounded > 0 ? fmtAmount(rounded) : "-"}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                    {/* 計 sub-row */}
                    {(() => {
                      const totalBudget = Math.round((getStaffBudget(staff, "amountCA_プロパー") + getStaffBudget(staff, "amountCA_BP") + getStaffBudget(staff, "amountCA_フリーランス") + getStaffBudget(staff, "amountCA_協業")) * 10) / 10;
                      const totalCarryover = Math.round((getStaffCarryover(staff, "amountCA_プロパー") + getStaffCarryover(staff, "amountCA_BP") + getStaffCarryover(staff, "amountCA_フリーランス") + getStaffCarryover(staff, "amountCA_協業")) * 10) / 10;
                      const totalMonth = Math.round(getStaffMonthAmountTotal(staff, "ca") * 10) / 10;
                      const totalProgress = Math.round((totalCarryover + totalMonth) * 10) / 10;
                      const totalRate = totalBudget > 0 ? Math.round((totalProgress / totalBudget) * 1000) / 10 : 0;
                      return (
                    <tr key={`${staff}-total`} style={{ background: rowBg, borderBottom }}>
                      <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: rowBg, textAlign: "left", paddingLeft: 8, borderBottom }}>
                        計
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), borderBottom, textAlign: "right" }}>
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {fmtAmount(totalBudget)}
                        </span>
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), borderBottom, textAlign: "right" }}>
                        {fmtAmount(totalProgress)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalBudget > 0 ? getAchievementColor(totalRate) : "#ccc", background: totalBudget > 0 ? getAchievementBg(totalRate) : undefined, borderBottom, textAlign: "right" }}>
                        {totalBudget > 0 ? `${totalRate.toFixed(1)}%` : "—"}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), borderBottom, textAlign: "right" }}>
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 700, color: totalCarryover > 0 ? tc.textSecondary : tc.textDisabled }}>{fmtAmount(totalCarryover)}</span>
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: totalMonth > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), borderBottom, textAlign: "right" }}>{fmtAmount(totalMonth)}</td>
                      {days.map(day => {
                        const val = getStaffDayAmountTotal(staff, day.key, "ca");
                        const rounded = Math.round(val * 10) / 10;
                        return (
                          <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, borderBottom, textAlign: "right" }}>
                            {rounded > 0 ? fmtAmount(rounded) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                      );
                    })()}
                  </Fragment>
                  )
                ) : (
                  <tr key={staff} style={{ background: rowBg }}>
                    <td style={{ ...staffCellStyle, background: rowBg }}>{staff}</td>
                    {/* 予算（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d2600" : "#332d00") : (idx % 2 === 1 ? "#fef9e7" : "#fffdf0"), cursor: "pointer", minWidth: 70, padding: 0 }}
                      onClick={() => { if (!isEditingBudget) { setEditingCell({ staff, field: af.key, type: "budget" }); setEditingCellValue(budget ? String(budget) : ""); } }}>
                      {isEditingBudget ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveBudget(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveBudget(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #f39c12", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#fffef5", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: budget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled }}>
                          {fmtAmount(budget)}
                        </span>
                      )}
                    </td>
                    {/* 進捗（前月繰越 + 月計） */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: progress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: isDark ? (idx % 2 === 1 ? "#1a2540" : "#1e2d4a") : (idx % 2 === 1 ? "#eff6ff" : "#f0f7ff"), textAlign: "right" }}>
                      {fmtAmount(progress)}
                    </td>
                    {/* 達成率 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: budget > 0 ? getAchievementColor(achievementRate) : "#ccc", background: budget > 0 ? getAchievementBg(achievementRate) : undefined, textAlign: "right" }}>
                      {budget > 0 ? `${achievementRate.toFixed(1)}%` : "—"}
                    </td>
                    {/* 前月繰越（クリックで編集） */}
                    <td style={{ ...cellStyle, background: isDark ? (idx % 2 === 1 ? "#2d3748" : "#374151") : (idx % 2 === 1 ? "#eff0f2" : "#f5f6f8"), cursor: "pointer", minWidth: 70, padding: 0, textAlign: "right" }}
                      onClick={() => { if (!isEditingCarryover) { setEditingCell({ staff, field: af.key, type: "carryover" }); setEditingCellValue(carryover ? String(carryover) : ""); } }}>
                      {isEditingCarryover ? (
                        <input
                          type="text"
                          inputMode="decimal"
                          autoFocus
                          value={editingCellValue}
                          onChange={(e) => { const v = e.target.value; if (/^\d{0,6}(\.\d{0,1})?$/.test(v) || v === "") setEditingCellValue(v); }}
                          onBlur={() => { const val = parseFloat(editingCellValue) || 0; saveCarryover(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); }}
                          onKeyDown={(e) => { if (e.key === "Enter") { const val = parseFloat(editingCellValue) || 0; saveCarryover(af.key, staff, Math.round(val * 10) / 10); setEditingCell(null); } if (e.key === "Escape") setEditingCell(null); }}
                          style={{ width: "100%", border: "2px solid #6c757d", borderRadius: 4, padding: "3px 6px", fontSize: 12, textAlign: "right", outline: "none", background: "#f8f9fa", boxSizing: "border-box" }}
                        />
                      ) : (
                        <span style={{ display: "block", padding: "4px 6px", textAlign: "right", fontWeight: 600, color: carryover > 0 ? tc.textSecondary : tc.textDisabled }}>
                          {fmtAmount(carryover)}
                        </span>
                      )}
                    </td>
                    {/* 月計 */}
                    <td style={{ ...cellStyle, fontWeight: 700, color: monthTotal > 0 ? af.color : tc.textMuted, background: isDark ? (idx % 2 === 1 ? "#1a2e4a" : "#1e3550") : (idx % 2 === 1 ? "#e1eef8" : "#e8f4fd"), textAlign: "right" }}>{fmtAmount(monthTotal)}</td>
                    {days.map(day => {
                      const val = getStaffDayValue(staff, day.key, af.key);
                      const rounded = Math.round(val * 10) / 10;
                      return (
                        <td key={day.d} style={{ ...cellStyle, color: rounded > 0 ? af.color : tc.textDisabled, fontWeight: rounded > 0 ? 700 : 400, background: day.isRed ? (isDark ? "#3b1419" : "#fef8f8") : undefined, textAlign: "right" }}>
                          {rounded > 0 ? fmtAmount(rounded) : "-"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {/* 合計行 */}
              {(() => {
                const caSubs = ["プロパー", "BP", "フリーランス", "協業"];
                if (isCATable) {
                  // CA: 4行（プロパー/BP/フリーランス/計）
                  const totalBorderBottom = "2px solid " + (isDark ? "#4a4a4a" : "#d0d0d0");
                  const dashBorder = "1px dashed " + (isDark ? "#555" : "#ddd");
                  const subColor = isDark ? "#c4b5fd" : "#7c3aed";
                  if (caAmountTotalOnly) {
                    const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffBudget(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                    const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffCarryover(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                    const grandMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10;
                    const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                    const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                    return (
                      <tr style={{ background: tc.bgSection }}>
                        <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, textAlign: "right" }}>
                          {fmtAmount(grandBudget)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, textAlign: "right" }}>
                          {fmtAmount(grandProgress)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                          {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, textAlign: "right" }}>
                          {fmtAmount(grandCarry)}
                        </td>
                        <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                        {days.map(day => {
                          const dayTotal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountTotal(s, day.key, "ca"), 0) * 10) / 10;
                          return (
                            <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                              {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  }
                  return (
                    <>
                      {caSubs.map((sub, subIdx) => {
                        const subBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffBudget(s, `amountCA_${sub}`), 0) * 10) / 10;
                        const subCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, `amountCA_${sub}`), 0) * 10) / 10;
                        const subMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountByAffiliation(s, "ca", sub), 0) * 10) / 10;
                        const subProgress = Math.round((subCarry + subMonth) * 10) / 10;
                        const subRate = subBudget > 0 ? Math.round((subProgress / subBudget) * 1000) / 10 : 0;
                        return (
                          <tr key={`grand-${sub}`} style={{ background: tc.bgSection }}>
                            {subIdx === 0 && (
                              <td rowSpan={5} style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection, verticalAlign: "middle", borderBottom: totalBorderBottom }}>合計</td>
                            )}
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 600, color: subColor, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: dashBorder }}>
                              {sub}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subBudget > 0 ? (isDark ? "#fbbf24" : "#856404") : tc.textDisabled, background: hdrYellow, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subBudget)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subProgress > 0 ? (isDark ? "#93c5fd" : "#1e40af") : tc.textDisabled, background: hdrBlueAlt, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subProgress)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: subBudget > 0 ? getAchievementColor(subRate) : "#ccc", background: subBudget > 0 ? getAchievementBg(subRate) : hdrGreen, borderBottom: dashBorder, textAlign: "right" }}>
                              {subBudget > 0 ? `${subRate.toFixed(1)}%` : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subCarry > 0 ? tc.textSecondary : tc.textDisabled, background: hdrGray, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subCarry)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 600, color: subMonth > 0 ? subColor : tc.textDisabled, background: hdrBlue, fontSize: 11, borderBottom: dashBorder, textAlign: "right" }}>
                              {fmtAmount(subMonth)}
                            </td>
                            {days.map(day => {
                              const dayVal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountByAffiliation(s, day.key, "ca", sub), 0) * 10) / 10;
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 600, fontSize: 11, color: dayVal > 0 ? subColor : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: dashBorder, textAlign: "right" }}>
                                  {dayVal > 0 ? fmtAmount(dayVal) : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                      {/* 計 row */}
                      {(() => {
                        const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffBudget(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                        const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + caSubs.reduce((ss, a) => ss + getStaffCarryover(s, `amountCA_${a}`), 0), 0) * 10) / 10;
                        const grandMonth = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffMonthAmountTotal(s, "ca"), 0) * 10) / 10;
                        const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                        const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                        return (
                          <tr style={{ background: tc.bgSection, borderBottom: totalBorderBottom }}>
                            <td style={{ ...cellStyle, fontSize: 11, fontWeight: 700, color: af.color, background: tc.bgSection, textAlign: "left", paddingLeft: 8, borderBottom: totalBorderBottom }}>
                              計
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandBudget)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandProgress)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, borderBottom: totalBorderBottom, textAlign: "right" }}>
                              {fmtAmount(grandCarry)}
                            </td>
                            <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, borderBottom: totalBorderBottom, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                            {days.map(day => {
                              const dayTotal = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffDayAmountTotal(s, day.key, "ca"), 0) * 10) / 10;
                              return (
                                <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, borderBottom: totalBorderBottom, textAlign: "right" }}>
                                  {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })()}
                    </>
                  );
                } else {
                  // RA: 1行（従来通り）
                  const grandBudget = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffBudget(s, af.key), 0) * 10) / 10;
                  const grandCarry = Math.round(STAFF_LIST.reduce((sum, s) => sum + getStaffCarryover(s, af.key), 0) * 10) / 10;
                  const grandMonth = Math.round(getMonthGrandTotal(af.key) * 10) / 10;
                  const grandProgress = Math.round((grandCarry + grandMonth) * 10) / 10;
                  const grandRate = grandBudget > 0 ? Math.round((grandProgress / grandBudget) * 1000) / 10 : 0;
                  return (
                    <tr style={{ background: tc.bgSection }}>
                      <td style={{ ...staffCellStyle, fontWeight: 700, background: tc.bgSection }}>合計</td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#fbbf24" : "#856404", background: hdrYellow, textAlign: "right" }}>
                        {fmtAmount(grandBudget)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: isDark ? "#93c5fd" : "#1e40af", background: hdrBlueAlt, textAlign: "right" }}>
                        {fmtAmount(grandProgress)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, background: hdrGreen, textAlign: "right" }}>
                        {grandBudget > 0 ? <span style={{ color: getAchievementColor(grandRate) }}>{grandRate.toFixed(1)}%</span> : "—"}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: tc.textSecondary, background: hdrGray, textAlign: "right" }}>
                        {fmtAmount(grandCarry)}
                      </td>
                      <td style={{ ...cellStyle, fontWeight: 700, color: af.color, background: hdrBlue, textAlign: "right" }}>{fmtAmount(grandMonth)}</td>
                      {days.map(day => {
                        const dayTotal = Math.round(getDayTotal(day.key, af.key) * 10) / 10;
                        return (
                          <td key={day.d} style={{ ...cellStyle, fontWeight: 700, color: dayTotal > 0 ? (isDark ? "#e2e8f0" : "#1a1a2e") : (isDark ? "#555" : "#ddd"), background: day.isRed ? (isDark ? "#3b1419" : "#fef2f2") : tc.bgSection, textAlign: "right" }}>
                            {dayTotal > 0 ? fmtAmount(dayTotal) : "-"}
                          </td>
                        );
                      })}
                    </tr>
                  );
                }
              })()}
            </tbody>
          </table>
        </div>
        );
      })}

      {/* その他タブ */}
      {monthlyMode === "other" && (() => {
        const statusOptions = [
          { key: "rain", icon: "🌧️", label: "雨" },
          { key: "cloudy", icon: "⛅", label: "曇" },
          { key: "sunny", icon: "☀️", label: "晴" },
          { key: "done", icon: "達成", label: "達成" },
        ];
        const statusDisplay: Record<string, { icon: string; color: string; order: number }> = {
          rain: { icon: "🌧️", color: "#e74c3c", order: 0 },
          cloudy: { icon: "⛅", color: "#f39c12", order: 1 },
          sunny: { icon: "☀️", color: "#27ae60", order: 2 },
          done: { icon: "達成", color: "#2980b9", order: 3 },
        };
        const miscSortIcon = (key: string) => miscSortKey === key ? (miscSortDir === "asc" ? "▲" : "▼") : "⇅";
        const sortedMisc = [...miscItems]
          .map((item, origIdx) => ({ ...item, origIdx }))
          .sort((a, b) => {
            let cmp = 0;
            if (miscSortKey === "staff") {
              cmp = a.staff.localeCompare(b.staff, "ja");
              if (cmp === 0) cmp = (b.createdAt || "").localeCompare(a.createdAt || "");
            } else {
              cmp = (statusDisplay[a.status]?.order ?? 9) - (statusDisplay[b.status]?.order ?? 9);
              if (cmp === 0) cmp = a.staff.localeCompare(b.staff, "ja");
            }
            return miscSortDir === "desc" ? -cmp : cmp;
          });
        const formatDT = (iso: string) => {
          if (!iso) return "—";
          const d = new Date(iso);
          return `${d.getMonth() + 1}/${d.getDate()} ${("0" + d.getHours()).slice(-2)}:${("0" + d.getMinutes()).slice(-2)}`;
        };
        return (
        <div style={{ maxWidth: 900 }}>
          {/* 入力欄（上） */}
          <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow, marginBottom: 20 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: tc.accentText, display: "inline-block" }} />
              新規追加
            </h3>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>担当</label>
                <select value={miscInput.staff} onChange={(e) => setMiscInput(prev => ({ ...prev, staff: e.target.value }))}
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text, minWidth: 100 }}>
                  <option value="">選択</option>
                  {STAFF_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 200 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>内容（20文字まで）</label>
                <input type="text" value={miscInput.content} maxLength={20}
                  onChange={(e) => setMiscInput(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="内容を入力..."
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>締切</label>
                <input type="date" value={miscInput.deadline}
                  onChange={(e) => setMiscInput(prev => ({ ...prev, deadline: e.target.value }))}
                  style={{ padding: "8px 12px", border: "1px solid " + tc.inputBorder, borderRadius: 8, fontSize: 13, background: tc.bgInput, color: tc.text }} />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: tc.textSecondary }}>進捗</label>
                <div style={{ display: "flex", gap: 4 }}>
                  {statusOptions.map(opt => (
                    <button key={opt.key} onClick={() => setMiscInput(prev => ({ ...prev, status: opt.key }))}
                      style={{
                        padding: opt.key === "done" ? "6px 10px" : "6px 8px", border: miscInput.status === opt.key ? "2px solid " + tc.accentText : "1px solid " + tc.inputBorder,
                        borderRadius: 8, background: miscInput.status === opt.key ? tc.accentLight : tc.bgCard, cursor: "pointer",
                        fontSize: opt.key === "done" ? 12 : 18, fontWeight: opt.key === "done" ? 700 : 400,
                        color: opt.key === "done" ? "#2980b9" : undefined, lineHeight: 1,
                      }} title={opt.label}>
                      {opt.icon}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={addMiscItem}
                disabled={!miscInput.staff || !miscInput.content || !miscInput.status}
                style={{
                  padding: "8px 24px", background: (!miscInput.staff || !miscInput.content || !miscInput.status) ? "#ccc" : "#1a1a2e",
                  color: "#fff", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13,
                  cursor: (!miscInput.staff || !miscInput.content || !miscInput.status) ? "default" : "pointer", whiteSpace: "nowrap",
                }}>
                追加
              </button>
            </div>
          </div>

          {/* 一覧（下） */}
          <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px", boxShadow: tc.shadow }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textHeading, margin: "0 0 16px", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#6c757d", display: "inline-block" }} />
              登録一覧
              <span style={{ fontSize: 13, color: tc.textMuted, fontWeight: 400, marginLeft: 8 }}>{miscItems.length}件</span>
            </h3>
            {miscItems.length === 0 ? (
              <p style={{ color: tc.textMuted, fontSize: 13, margin: 0 }}>データなし</p>
            ) : (
              <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 80, cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleMiscSort("staff")}>
                      担当 {miscSortIcon("staff")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "left", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading }}>内容</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 130 }}>締切</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 120, cursor: "pointer", userSelect: "none" }}
                      onClick={() => toggleMiscSort("status")}>
                      進捗 {miscSortIcon("status")}
                    </th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 90 }}>登録日時</th>
                    <th style={{ padding: "8px 12px", textAlign: "center", borderBottom: "2px solid " + tc.border, fontWeight: 700, color: tc.textHeading, width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMisc.map((item, idx) => {
                    const st = statusDisplay[item.status] || { icon: "—", color: "#999", order: 9 };
                    const miscRowBg = idx % 2 === 1 ? (isDark ? "#1e2533" : "#f8f9fb") : tc.bgCard;
                    return (
                      <tr key={item.origIdx} style={{ background: miscRowBg }}>
                        <td style={{ padding: "10px 12px", borderBottom: "1px solid " + tc.border, fontWeight: 600, color: isDark ? "#f1f5f9" : tc.text }}>{item.staff}</td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border }}>
                          <input type="text" value={item.content} maxLength={20}
                            onChange={(e) => updateMiscItem(item.origIdx, "content", e.target.value)}
                            style={{ width: "100%", border: "1px solid " + tc.border, borderRadius: 6, padding: "6px 10px", fontSize: 13, background: tc.bgSection, color: tc.text, boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <input type="date" value={item.deadline || ""}
                            onChange={(e) => updateMiscItem(item.origIdx, "deadline", e.target.value)}
                            style={{ border: "1px solid " + tc.border, borderRadius: 6, padding: "6px 8px", fontSize: 12, background: tc.bgSection, color: tc.text, width: "100%", boxSizing: "border-box" }} />
                        </td>
                        <td style={{ padding: "6px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <div style={{ display: "flex", gap: 3, justifyContent: "center" }}>
                            {statusOptions.map(opt => (
                              <button key={opt.key} onClick={() => updateMiscItem(item.origIdx, "status", opt.key)}
                                style={{
                                  padding: opt.key === "done" ? "3px 6px" : "3px 4px",
                                  border: item.status === opt.key ? "2px solid #0077b6" : "1px solid " + tc.border,
                                  borderRadius: 6, background: item.status === opt.key ? (isDark ? "#1e3a5f" : "#e8f4fd") : "transparent", cursor: "pointer",
                                  fontSize: opt.key === "done" ? 10 : 14, fontWeight: opt.key === "done" ? 700 : 400,
                                  color: opt.key === "done" ? (isDark ? "#60a5fa" : "#2980b9") : undefined, lineHeight: 1, opacity: item.status === opt.key ? 1 : 0.5,
                                }} title={opt.label}>
                                {opt.icon}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center", fontSize: 11, color: tc.textMuted }}>
                          {formatDT(item.createdAt)}
                        </td>
                        <td style={{ padding: "10px 8px", borderBottom: "1px solid " + tc.border, textAlign: "center" }}>
                          <button onClick={() => removeMiscItem(item.origIdx)} style={{ border: "none", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 16, padding: 2, lineHeight: 1 }} title="削除">×</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
        );
      })()}
    </div>
  );
}

function TrendIcon({ current, prev }: { current: number; prev: number }) {
  if (current > prev) return <span style={{ color: "#2ecc71", fontSize: 14, fontWeight: 700 }}>▲</span>;
  if (current < prev) return <span style={{ color: "#e63946", fontSize: 14, fontWeight: 700 }}>▼</span>;
  return <span style={{ color: "#999", fontSize: 12, fontWeight: 700 }}>→</span>;
}

function ActivityRankCard({ title, data, prevData, field, color, unit }: { title: string; data: StaffActivity[]; prevData?: StaffActivity[]; field: keyof StaffActivity; color: string; unit?: string }) {
  const { t: tc } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const sorted = [...data].filter(s => s.staff && (s[field] as number) > 0).sort((a, b) => (b[field] as number) - (a[field] as number));
  const top3 = sorted.slice(0, 3);
  const total = sorted.reduce((sum, s) => sum + (s[field] as number), 0);
  const prevTotal = (prevData || []).reduce((sum, s) => sum + ((s[field] as number) || 0), 0);
  const totalDisplay = unit ? (Math.round(total * 10) / 10) : total;
  const medals = ["🥇", "🥈", "🥉"];
  const fmtVal = (v: number) => unit ? `${Math.round(v * 10) / 10}${unit}` : String(v);
  return (
    <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {prevData && <TrendIcon current={total} prev={prevTotal} />}
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{unit ? `${totalDisplay}${unit}` : totalDisplay}</span>
        </div>
      </div>
      {sorted.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>未入力</p> : (
        <>
          {top3.map((s, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${tc.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 16 }}>{medals[i]}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: tc.textPrimary }}>{s.staff}</span>
              </div>
              <span style={{ fontSize: 16, fontWeight: 700, color }}>{fmtVal(s[field] as number)}</span>
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
                    <span style={{ fontSize: 12, color: tc.textSecondary, width: 20, textAlign: "center" }}>{i + 4}</span>
                    <span style={{ fontSize: 13, fontWeight: 600, color: tc.textSecondary }}>{s.staff}</span>
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 700, color }}>{fmtVal(s[field] as number)}</span>
                </div>
              ))}
            </>
          )}
        </>
      )}
    </div>
  );
}

function AmountRankCard({ title, data, prevData, entryType, color }: {
  title: string; data: StaffActivity[]; prevData?: StaffActivity[]; entryType: "ra" | "ca"; color: string;
}) {
  const { t: tc } = useTheme();
  const [showAll, setShowAll] = useState(false);
  const getEntries = (s: StaffActivity) => entryType === "ra" ? (s.raEntries || []) : (s.caEntries || []);
  const getTotal = (s: StaffActivity) => getEntries(s).reduce((sum, e) => sum + (e.amount || 0), 0);
  const sorted = [...data].filter(s => s.staff && getTotal(s) > 0).sort((a, b) => getTotal(b) - getTotal(a));
  const top3 = sorted.slice(0, 3);
  const total = Math.round(sorted.reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const prevTotal = Math.round((prevData || []).reduce((sum, s) => sum + getTotal(s), 0) * 10) / 10;
  const medals = ["🥇", "🥈", "🥉"];
  const fmtVal = (v: number) => `${Math.round(v * 10) / 10}万円`;
  const renderEntry = (s: StaffActivity, i: number, isSub?: boolean) => {
    const entries = getEntries(s);
    const staffTotal = Math.round(getTotal(s) * 10) / 10;
    return (
      <div key={i} style={{ padding: "8px 0", borderBottom: `1px solid ${tc.border}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSub ? <span style={{ fontSize: 12, color: tc.textMuted, width: 20, textAlign: "center" }}>{i + 1}</span> : <span style={{ fontSize: 16 }}>{medals[i]}</span>}
            <span style={{ fontSize: isSub ? 13 : 14, fontWeight: 600, color: isSub ? tc.textSecondary : tc.textPrimary }}>{s.staff}</span>
          </div>
          <span style={{ fontSize: isSub ? 14 : 16, fontWeight: 700, color }}>{fmtVal(staffTotal)}</span>
        </div>
        {entries.map((e, ei) => {
          const details = [e.company, e.affiliation, e.position].filter(Boolean).join(" / ");
          const revLabel = entryType === "ra" ? "売上" : "仕入";
          const revVal = e.revenue || 0;
          const amtVal = e.amount || 0;
          const priceStr = revVal > 0 && amtVal > 0 ? ` (${revLabel}${fmtVal(revVal)}／粗利${fmtVal(amtVal)})` : revVal > 0 ? ` (${revLabel}${fmtVal(revVal)})` : amtVal > 0 ? ` (粗利${fmtVal(amtVal)})` : "";
          return details || priceStr ? <div key={ei} style={{ fontSize: 11, color: tc.textMuted, marginTop: 2, paddingLeft: 28 }}>{entries.length > 1 ? `${ei + 1}件目: ` : ""}{details}{priceStr}</div> : null;
        })}
      </div>
    );
  };
  return (
    <div style={{ background: tc.bgCard, borderRadius: 14, padding: "20px 16px", boxShadow: tc.shadow, borderTop: `3px solid ${color}` }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>{title}</h3>
        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
          {prevData && <TrendIcon current={total} prev={prevTotal} />}
          <span style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{total}万円</span>
        </div>
      </div>
      {sorted.length === 0 ? <p style={{ color: tc.textDisabled, fontSize: 13, margin: 0 }}>未入力</p> : (
        <>
          {top3.map((s, i) => renderEntry(s, i))}
          {sorted.length > 3 && (
            <>
              <button onClick={() => setShowAll(!showAll)} style={{ marginTop: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px solid #0077b6", borderRadius: 6, cursor: "pointer", width: "100%" }}>
                {showAll ? "閉じる" : `全${sorted.length}件を表示`}
              </button>
              {showAll && sorted.slice(3).map((s, i) => renderEntry(s, i + 3, true))}
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
