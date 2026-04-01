"use client";

import { useState, useEffect, useCallback, useMemo, Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "../theme-provider";
import { ADashLogo, ThemeToggle } from "../logo";

// ===== Imports from extracted files =====
import { STAFF_LIST, POSITION_LIST, JAPAN_HOLIDAYS, ACTIVITY_FIELDS, ACTIVITY_AMOUNT_FIELDS, LOCATION_LIST, COMPANY_LIST } from "./constants/data";
import { CategoryData, FocusPerson, FocusProject, RACompany, RAData, OrderEntry, StaffActivity, DayData, AllData } from "./types/index";
import { dateKey, todayKey, parseDate, formatDateJP, isBusinessDay, getNextBusinessDay, getPrevBusinessDay, getLatestDataForDate } from "./utils/dates";
import { parseNum, parseAmount, formatAmount, formatNumStr, formatYen, calcRate, getTitle, emptyData } from "./utils/numbers";
import { FieldWrap } from "./components/ui/FieldWrap";
import { DonutChart } from "./components/ui/DonutChart";
import { Row } from "./components/ui/Row";
import { Badge } from "./components/ui/Badge";
import { TrendIcon } from "./components/ui/TrendIcon";
import { SummaryCard } from "./components/cards/SummaryCard";
import { ActivityRankCard } from "./components/cards/ActivityRankCard";
import { AmountRankCard } from "./components/cards/AmountRankCard";
import { FocusPeopleDisplay } from "./components/displays/FocusPeopleDisplay";
import { FocusProjectsDisplay } from "./components/displays/FocusProjectsDisplay";
import { RADisplay } from "./components/displays/RADisplay";
import { MonthlyActivityView } from "./components/MonthlyActivityView";
import { InputGroup } from "./components/forms/InputGroup";
import { CompanySelect } from "./components/ui/CompanySelect";
import { AmountInput } from "./components/ui/AmountInput";
import { UserManagementView } from "./components/UserManagementView";
import { useAuth } from "./hooks/useAuth";
import { useDataManagement } from "./hooks/useDataManagement";
import { PrevDayResultSection } from "./components/sections/PrevDayResultSection";
import { SalesAnalysisView } from "./components/SalesAnalysisView";

// ===== メインコンポーネント =====
export default function DashboardPage() {
  const router = useRouter();
  const { theme, t: tc } = useTheme();

  // Custom hooks
  const { isAdmin, setIsAdmin, currentStaffName, setCurrentStaffName, subStaffName, setSubStaffName, userRole, setUserRole } = useAuth();
  const { allData, setAllData, selectedDate, setSelectedDate, saveDate, setSaveDate, loading, setLoading, isDataEmpty, inheritOnce, fetchAllData } = useDataManagement();

  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [inputOpen, setInputOpen] = useState(false);
  const [calendarOpen, setCalendarOpen] = useState(true);
  const [sectionSalesOpen, setSectionSalesOpen] = useState(false);
  const [sectionFocusOpen, setSectionFocusOpen] = useState(false);
  const [sectionRAOpen, setSectionRAOpen] = useState(false);
  const [sectionAnnouncementOpen, setSectionAnnouncementOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [savingSection, setSavingSection] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState<"main" | "monthly" | "analysis" | "users">("main");
  const [monthlyYM, setMonthlyYM] = useState(`${new Date().getFullYear()}-${("0" + (new Date().getMonth() + 1)).slice(-2)}`);

  const [inp, setInp] = useState({
    properTarget: "", properForecast: "", properStandby: "", properStandbyCost: "",
    bpTarget: "", bpForecast: "", bpSupportCost: "",
    flTarget: "", flForecast: "", flSupportCost: "",
    coTarget: "", coForecast: "", coSupportCost: "",
  });
  const [focusPeople, setFocusPeople] = useState<FocusPerson[]>([]);
  const [focusProjects, setFocusProjects] = useState<FocusProject[]>([]);
  const [announcements, setAnnouncements] = useState<string[]>([]);
  const [raInp, setRaInp] = useState({ acquisitionTarget: "", acquisitionProgress: "", joinTarget: "", joinProgress: "" });
  const [raAcqCompanies, setRaAcqCompanies] = useState<RACompany[]>([]);
  const [raJoinCompanies, setRaJoinCompanies] = useState<RACompany[]>([]);
  const [staffActivities, setStaffActivities] = useState<StaffActivity[]>([]);
  const [affiliationProgress, setAffiliationProgress] = useState<Record<string, { progress: number; target: number }>>({});

  // カスタム企業リスト（DBから取得・DB保存）
  const [customCompanies, setCustomCompanies] = useState<string[]>([]);
  useEffect(() => {
    fetch("/api/companies")
      .then(r => r.ok ? r.json() : [])
      .then(data => { if (Array.isArray(data)) setCustomCompanies(data); })
      .catch(() => {});
  }, []);
  const allCompanies = [...COMPANY_LIST, ...customCompanies].sort((a, b) => a.localeCompare(b, "ja"));
  const handleAddCompany = useCallback(async (name: string) => {
    setCustomCompanies(prev => {
      if (!COMPANY_LIST.includes(name) && !prev.includes(name)) {
        fetch("/api/companies", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name }) })
          .catch(() => {});
        return [...prev, name];
      }
      return prev;
    });
  }, []);

  // 天気情報（9時・14時・18時の3時間帯）
  type WeatherSlot = { time: string; weather: string; temp: number };
  type AreaWeather = { slots: WeatherSlot[] };
  const [weatherInfo, setWeatherInfo] = useState<{ shibuya: AreaWeather; shinjuku: AreaWeather } | null>(null);
  // ビジネス格言
  const [dailyQuote, setDailyQuote] = useState<string>("");

  // currentStaffNameが取得された後、空staffのstaffActivitiesを補完
  useEffect(() => {
    if (currentStaffName && !isAdmin) {
      setStaffActivities(prev => {
        const needsUpdate = prev.some(s => !s.staff);
        if (!needsUpdate) return prev;
        return prev.map(s => s.staff ? s : { ...s, staff: currentStaffName });
      });
    }
  }, [currentStaffName, isAdmin]);

  // レスポンシブ検知
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  // モバイルではカレンダー非表示がデフォルト
  useEffect(() => { if (isMobile) setCalendarOpen(false); }, [isMobile]);

  // 天気取得（Open-Meteo API、渋谷・新宿、9時/19時の2時間帯）
  useEffect(() => {
    const cacheKey = `weather2_${todayKey()}`;
    const cached = sessionStorage.getItem(cacheKey);
    if (cached) { setWeatherInfo(JSON.parse(cached)); return; }
    const weatherCode: Record<number, string> = {
      0: "☀️", 1: "🌤️", 2: "⛅", 3: "☁️",
      45: "🌫️", 48: "🌫️", 51: "🌦️", 53: "🌧️", 55: "🌧️",
      61: "🌧️", 63: "🌧️", 65: "🌧️", 71: "🌨️", 73: "🌨️", 75: "❄️",
      80: "🌦️", 81: "🌧️", 82: "⛈️", 95: "⛈️", 96: "⛈️", 99: "⛈️",
    };
    const timeSlots = [{ hour: 9, label: "9時" }, { hour: 19, label: "19時" }];
    const fetchW = async (lat: number, lon: number): Promise<AreaWeather> => {
      const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,weather_code&timezone=Asia%2FTokyo&forecast_days=1`);
      const d = await res.json();
      const slots = timeSlots.map(s => ({
        time: s.label,
        weather: weatherCode[d.hourly.weather_code[s.hour]] || "—",
        temp: Math.round(d.hourly.temperature_2m[s.hour]),
      }));
      return { slots };
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


  // データロード（初回のみ当日データを前営業日から継承。日付変更時の自動継承は行わない）
  useEffect(() => {
    fetchAllData(router);
  }, [router, fetchAllData]);

  // 表示用データ
  const result = getLatestDataForDate(allData, selectedDate);
  const displayData = result ? result.data : emptyData();

  // CA粗利の前月繰越データをロード
  const [caCarryovers, setCaCarryovers] = useState<Record<string, Record<string, number>>>({});
  const [caCountCarryovers, setCaCountCarryovers] = useState<Record<string, Record<string, number>>>({});
  useEffect(() => {
    const loadCarryovers = async () => {
      try {
        const res = await fetch("/api/data");
        if (!res.ok) return;
        const data = await res.json();
        const co: Record<string, Record<string, number>> = {};
        const cco: Record<string, Record<string, number>> = {};
        for (const key of Object.keys(data)) {
          if (key.startsWith("carryover-")) co[key] = data[key];
          if (key.startsWith("countCarryover-")) cco[key] = data[key];
        }
        setCaCarryovers(co);
        setCaCountCarryovers(cco);
      } catch {}
    };
    loadCarryovers();
  }, []);

  // CA粗利を所属別に月間集計（前月繰越＋月間新規＋CA単価UP = 月別タブの合計と同じ）
  const calcCAProgressByAffiliation = useCallback((affiliation: string): { total: number; carryover: number; monthOrder: number; monthOrderNew: number; monthOrderSlide: number; monthOrderPU: number; hcCarryover: number; hcNew: number; hcSlide: number } => {
    const ym = selectedDate.substring(0, 7); // "YYYY-MM"
    const [y, m] = ym.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    // 前月繰越: 全スタッフ分を合計
    const carryKey = `carryover-amountCA_${affiliation}-${ym}`;
    const carryData = caCarryovers[carryKey] || {};
    const carryTotal = STAFF_LIST.reduce((sum, staff) => sum + (carryData[staff] || 0), 0);
    // 繰越HC: 件数繰越
    const countCarryKey = `countCarryover-ordersCA_${affiliation}-${ym}`;
    const countCarryData = caCountCarryovers[countCarryKey] || {};
    const hcCarryover = STAFF_LIST.reduce((sum, staff) => sum + (countCarryData[staff] || 0), 0);
    // 月間新規: CA受注の粗利を所属別にSUM + CA単価UP分も加算
    let monthTotal = 0;
    let monthNew = 0;
    let monthSlide = 0;
    let monthPU = 0;
    let hcNew = 0;
    let hcSlide = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${y}-${("0" + m).slice(-2)}-${("0" + d).slice(-2)}`;
      const dayData = allData[dk];
      if (!dayData || !Array.isArray(dayData.staffActivities)) continue;
      dayData.staffActivities.forEach((s: any) => {
        const entries = s.caEntries || [];
        entries.forEach((e: any) => {
          if (e.affiliation === affiliation) {
            const amt = e.amount || 0;
            monthTotal += amt;
            const ot = e.orderType || "新規";
            if (ot === "スライド") { monthSlide += amt; hcSlide += 1; }
            else { monthNew += amt; hcNew += 1; }
          }
        });
        // CA単価UP分（HCには含めない：既存稼働者の単価変更のため）
        const puEntries = s.caPriceUpEntries || [];
        puEntries.forEach((e: any) => {
          if (e.affiliation === affiliation) {
            const amt = e.amount || 0;
            monthTotal += amt;
            monthPU += amt;
          }
        });
      });
    }
    const roundedCarry = Math.round(carryTotal * 10) / 10;
    const roundedMonth = Math.round(monthTotal * 10) / 10;
    const roundedNew = Math.round(monthNew * 10) / 10;
    const roundedSlide = Math.round(monthSlide * 10) / 10;
    const roundedPU = Math.round(monthPU * 10) / 10;
    return { total: Math.round((carryTotal + monthTotal) * 10) / 10, carryover: roundedCarry, monthOrder: roundedMonth, monthOrderNew: roundedNew, monthOrderSlide: roundedSlide, monthOrderPU: roundedPU, hcCarryover, hcNew, hcSlide };
  }, [allData, selectedDate, caCarryovers, caCountCarryovers]);

  const properBreakdown = calcCAProgressByAffiliation("プロパー");
  const bpBreakdown = calcCAProgressByAffiliation("BP");
  const flBreakdown = calcCAProgressByAffiliation("フリーランス");
  const coBreakdown = calcCAProgressByAffiliation("協業");
  const properProgressMan = properBreakdown.total;
  const bpProgressMan = bpBreakdown.total;
  const flProgressMan = flBreakdown.total;
  const coProgressMan = coBreakdown.total;
  // 万円→円に変換（メインカード表示は円単位、小数以下切り捨て）
  const properProgress = Math.floor(properProgressMan * 10000);
  const bpProgress = Math.floor(bpProgressMan * 10000);
  const flProgress = Math.floor(flProgressMan * 10000);
  const coProgress = Math.floor(coProgressMan * 10000);

  // 目標 = CA粗利の月別目標値（budget-amountCA_${affiliation}-${YYYY-MM}キーから取得）
  const caBudgetTargets = useMemo(() => {
    const ym = selectedDate.substring(0, 7);
    const affiliations = ["プロパー", "BP", "フリーランス", "協業"] as const;
    const result: Record<string, number> = {};
    for (const aff of affiliations) {
      const budgetKey = `budget-amountCA_${aff}-${ym}`;
      const budgetData = allData[budgetKey];
      if (budgetData && typeof budgetData === "object") {
        const total = STAFF_LIST.reduce((sum, staff) => sum + (budgetData[staff] || 0), 0);
        result[aff] = Math.round(total * 10000);
      } else {
        result[aff] = 0;
      }
    }
    return result;
  }, [allData, selectedDate]);

  const proper = { ...(displayData.proper || { target: 0, progress: 0, forecast: 0, standby: 0, standbyCost: 0 }), progress: properProgress, target: caBudgetTargets["プロパー"] };
  const bp = { ...(displayData.bp || { target: 0, progress: 0, forecast: 0, supportCost: 0 }), progress: bpProgress, target: caBudgetTargets["BP"] };
  const fl = { ...(displayData.fl || { target: 0, progress: 0, forecast: 0, supportCost: 0 }), progress: flProgress, target: caBudgetTargets["フリーランス"] };
  const co = { ...(displayData.co || { target: 0, progress: 0, forecast: 0, supportCost: 0 }), progress: coProgress, target: caBudgetTargets["協業"] };
  // 進捗計から待機費用・支援費等を引いた調整後進捗
  const properAdjusted = properProgress - (proper.standbyCost || 0);
  const bpAdjusted = bpProgress - (bp.supportCost || 0);
  const flAdjusted = flProgress - (fl.supportCost || 0);
  const coAdjusted = coProgress - (co.supportCost || 0);
  const total = {
    target: proper.target + bp.target + fl.target + co.target,
    progress: properProgress + bpProgress + flProgress + coProgress,
    forecast: proper.forecast + bp.forecast + fl.forecast + co.forecast,
  };
  const totalAdjusted = properAdjusted + bpAdjusted + flAdjusted + coAdjusted;

  // 所属別 企業粗利ランキング集計（RA受注ベース）
  const getCompanyProfitByAffiliation = useCallback((affiliation: string): { company: string; profit: number }[] => {
    const ym = selectedDate.substring(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const compMap: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${y}-${("0" + m).slice(-2)}-${("0" + d).slice(-2)}`;
      const dayData = allData[dk];
      if (!dayData || !Array.isArray(dayData.staffActivities)) continue;
      dayData.staffActivities.forEach((s: any) => {
        (s.raEntries || []).forEach((e: any) => {
          if (e.affiliation === affiliation && e.company) {
            compMap[e.company] = (compMap[e.company] || 0) + (e.amount || 0);
          }
        });
        (s.raPriceUpEntries || []).forEach((e: any) => {
          if (e.affiliation === affiliation && e.company) {
            compMap[e.company] = (compMap[e.company] || 0) + (e.amount || 0);
          }
        });
      });
    }
    return Object.entries(compMap)
      .map(([company, profit]) => ({ company, profit: Math.round(profit * 10) / 10 }))
      .filter(c => c.profit !== 0)
      .sort((a, b) => b.profit - a.profit);
  }, [allData, selectedDate]);

  // 全体用：全所属の企業粗利ランキング（RA受注ベース）
  const getCompanyProfitAll = useCallback((): { company: string; profit: number }[] => {
    const ym = selectedDate.substring(0, 7);
    const [y, m] = ym.split("-").map(Number);
    const daysInMonth = new Date(y, m, 0).getDate();
    const compMap: Record<string, number> = {};
    for (let d = 1; d <= daysInMonth; d++) {
      const dk = `${y}-${("0" + m).slice(-2)}-${("0" + d).slice(-2)}`;
      const dayData = allData[dk];
      if (!dayData || !Array.isArray(dayData.staffActivities)) continue;
      dayData.staffActivities.forEach((s: any) => {
        (s.raEntries || []).forEach((e: any) => {
          if (e.company) compMap[e.company] = (compMap[e.company] || 0) + (e.amount || 0);
        });
        (s.raPriceUpEntries || []).forEach((e: any) => {
          if (e.company) compMap[e.company] = (compMap[e.company] || 0) + (e.amount || 0);
        });
      });
    }
    return Object.entries(compMap)
      .map(([company, profit]) => ({ company, profit: Math.round(profit * 10) / 10 }))
      .filter(c => c.profit !== 0)
      .sort((a, b) => b.profit - a.profit);
  }, [allData, selectedDate]);

  const companyProfitProper = getCompanyProfitByAffiliation("プロパー");
  const companyProfitBP = getCompanyProfitByAffiliation("BP");
  const companyProfitFL = getCompanyProfitByAffiliation("フリーランス");
  const companyProfitCO = getCompanyProfitByAffiliation("協業");
  const companyProfitAll = getCompanyProfitAll();

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
        properTarget: formatNumStr(properProgress), properForecast: formatNumStr(d.proper?.forecast || 0), properStandby: formatNumStr(d.proper?.standby || 0),
        properStandbyCost: formatNumStr(d.proper?.standbyCost || 0),
        bpTarget: formatNumStr(bpProgress), bpForecast: formatNumStr(d.bp?.forecast || 0),
        bpSupportCost: formatNumStr(d.bp?.supportCost || 0),
        flTarget: formatNumStr(flProgress), flForecast: formatNumStr(d.fl?.forecast || 0),
        flSupportCost: formatNumStr(d.fl?.supportCost || 0),
        coTarget: formatNumStr(coProgress), coForecast: formatNumStr(d.co?.forecast || 0),
        coSupportCost: formatNumStr(d.co?.supportCost || 0),
      });
      {
        // 注力データ: 非管理者は自担当のみロード（API側マージで他担当に干渉しないため安全）
        const allPeople = d.focusPeople?.length ? d.focusPeople.map((p: any) => ({ ...p, staff: p.staff || "", position: p.position || "", skill: p.skill || "" })) : [];
        const allProjects = d.focusProjects?.length ? d.focusProjects.map((p: any) => ({ ...p, staff: p.staff || "", position: p.position || "", location: p.location || "" })) : [];
        if (!isAdmin && currentStaffName) {
          const myPeople = allPeople.filter((p: any) => p.staff === currentStaffName || p.staff === subStaffName);
          setFocusPeople(myPeople.length > 0 ? myPeople : []);
          const myProjects = allProjects.filter((p: any) => p.staff === currentStaffName || p.staff === subStaffName);
          setFocusProjects(myProjects.length > 0 ? myProjects : []);
        } else {
          setFocusPeople(allPeople.length > 0 ? allPeople : [{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
          setFocusProjects(allProjects.length > 0 ? allProjects : [{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
        }
      }
      setAnnouncements(d.announcements?.length ? [...d.announcements] : [""]);
      const ra = d.ra || { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] };
      setRaInp({ acquisitionTarget: formatNumStr(ra.acquisitionTarget), acquisitionProgress: formatNumStr(ra.acquisitionProgress), joinTarget: formatNumStr(ra.joinTarget), joinProgress: formatNumStr(ra.joinProgress) });
      setRaAcqCompanies(ra.acquisitionCompanies?.length ? ra.acquisitionCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
      setRaJoinCompanies(ra.joinCompanies?.length ? ra.joinCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
      // 営業活動：当日に入力済みデータがあればそれを表示、なければ空で開始
      {
        const allActs = d.staffActivities?.length ? d.staffActivities.map((s: any) => ({
          staff: s.staff || "",
          interviewSetups: s.interviewSetups || 0,
          interviewsConducted: s.interviewsConducted || 0,
          appointmentAcquisitions: s.appointmentAcquisitions || 0,
          ordersRA: s.ordersRA || 0,
          ordersCA: s.ordersCA || 0,
          raEntries: s.raEntries?.length ? s.raEntries.map((e: any) => ({ ...e, orderType: e.orderType || "新規" })) : (s.ordersRA > 0 ? [{ amount: s.amountRA || 0, revenue: 0, company: "", affiliation: s.affiliationRA || "", position: s.positionRA || "", orderType: "新規" as const }] : []),
          caEntries: s.caEntries?.length ? s.caEntries.map((e: any) => ({ ...e, orderType: e.orderType || "新規" })) : (s.ordersCA > 0 ? [{ amount: s.amountCA || 0, revenue: 0, company: "", affiliation: s.affiliationCA || "", position: s.positionCA || "", orderType: "新規" as const }] : []),
          raPriceUpCount: s.raPriceUpCount || 0,
          caPriceUpCount: s.caPriceUpCount || 0,
          raPriceUpEntries: s.raPriceUpEntries || [],
          caPriceUpEntries: s.caPriceUpEntries || [],
        })) : [];
        // 非管理者は自分の担当行のみ、管理者は全行
        if (!isAdmin && currentStaffName) {
          const own = allActs.filter((s: StaffActivity) => s.staff === currentStaffName || s.staff === subStaffName);
          const emptyRow = (name: string): StaffActivity => ({ staff: name, interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [], raPriceUpCount: 0, caPriceUpCount: 0, raPriceUpEntries: [], caPriceUpEntries: [] });
          if (subStaffName) {
            // サブ担当がいる場合: 各担当1行ずつ（計2行）
            const mainRows = own.filter(s => s.staff === currentStaffName);
            const subRows = own.filter(s => s.staff === subStaffName);
            const mainRow = mainRows.length > 0 ? mainRows[0] : emptyRow(currentStaffName);
            const subRow = subRows.length > 0 ? subRows[0] : emptyRow(subStaffName);
            setStaffActivities([mainRow, subRow]);
          } else {
            setStaffActivities(own.length > 0 ? own : [emptyRow(currentStaffName)]);
          }
        } else {
          setStaffActivities(allActs.length > 0 ? allActs : [{ staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [], raPriceUpCount: 0, caPriceUpCount: 0, raPriceUpEntries: [], caPriceUpEntries: [] }]);
        }
      }
    } else {
      // データがない場合は前日までの最新データをフォールバックで表示
      const fallback = getLatestDataForDate(allData, selectedDate);
      if (fallback && !fallback.isExact) {
        const d = fallback.data;
        setInp({
          properTarget: formatNumStr(properProgress), properForecast: formatNumStr(d.proper?.forecast || 0), properStandby: formatNumStr(d.proper?.standby || 0),
          properStandbyCost: formatNumStr(d.proper?.standbyCost || 0),
          bpTarget: formatNumStr(bpProgress), bpForecast: formatNumStr(d.bp?.forecast || 0),
          bpSupportCost: formatNumStr(d.bp?.supportCost || 0),
          flTarget: formatNumStr(flProgress), flForecast: formatNumStr(d.fl?.forecast || 0),
          flSupportCost: formatNumStr(d.fl?.supportCost || 0),
          coTarget: formatNumStr(coProgress), coForecast: formatNumStr(d.co?.forecast || 0),
          coSupportCost: formatNumStr(d.co?.supportCost || 0),
        });
        {
          const allPeople = d.focusPeople?.length ? d.focusPeople.map((p: any) => ({ ...p, staff: p.staff || "", position: p.position || "", skill: p.skill || "" })) : [];
          const allProjects = d.focusProjects?.length ? d.focusProjects.map((p: any) => ({ ...p, staff: p.staff || "", position: p.position || "", location: p.location || "" })) : [];
          if (!isAdmin && currentStaffName) {
            const myPeople = allPeople.filter((p: any) => p.staff === currentStaffName || p.staff === subStaffName);
            setFocusPeople(myPeople.length > 0 ? myPeople : []);
            const myProjects = allProjects.filter((p: any) => p.staff === currentStaffName || p.staff === subStaffName);
            setFocusProjects(myProjects.length > 0 ? myProjects : []);
          } else {
            setFocusPeople(allPeople.length > 0 ? allPeople : [{ name: "", affiliation: "プロパー", cost: 0, staff: "", position: "", skill: "" }]);
            setFocusProjects(allProjects.length > 0 ? allProjects : [{ company: "", title: "", price: 0, contract: "派遣", staff: "", position: "", location: "" }]);
          }
        }
        setAnnouncements(d.announcements?.length ? [...d.announcements] : [""]);
        const ra = d.ra || { acquisitionTarget: 0, acquisitionProgress: 0, acquisitionCompanies: [], joinTarget: 0, joinProgress: 0, joinCompanies: [] };
        setRaInp({ acquisitionTarget: formatNumStr(ra.acquisitionTarget), acquisitionProgress: formatNumStr(ra.acquisitionProgress), joinTarget: formatNumStr(ra.joinTarget), joinProgress: formatNumStr(ra.joinProgress) });
        setRaAcqCompanies(ra.acquisitionCompanies?.length ? ra.acquisitionCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
        setRaJoinCompanies(ra.joinCompanies?.length ? ra.joinCompanies.map(c => ({ ...c, staff: c.staff || "" })) : [{ name: "", staff: "" }]);
        // 営業活動は日次入力のため常に空で開始（非管理者は自分の担当名で初期化）
        {
          const emptyAct = (name: string): StaffActivity => ({ staff: name, interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [], raPriceUpCount: 0, caPriceUpCount: 0, raPriceUpEntries: [], caPriceUpEntries: [] });
          if (subStaffName && currentStaffName) {
            setStaffActivities([emptyAct(currentStaffName), emptyAct(subStaffName)]);
          } else {
            setStaffActivities([emptyAct(currentStaffName || "")]);
          }
        }
      } else {
        setInp({ properTarget: "", properForecast: "", properStandby: "", properStandbyCost: "", bpTarget: "", bpForecast: "", bpSupportCost: "", flTarget: "", flForecast: "", flSupportCost: "", coTarget: "", coForecast: "", coSupportCost: "" });
        setFocusPeople([{ name: "", affiliation: "プロパー", cost: 0, staff: (!isAdmin && currentStaffName) ? currentStaffName : "", position: "", skill: "" }]);
        setFocusProjects([{ company: "", title: "", price: 0, contract: "派遣", staff: (!isAdmin && currentStaffName) ? currentStaffName : "", position: "", location: "" }]);
        setAnnouncements([""]);
        setRaInp({ acquisitionTarget: "", acquisitionProgress: "", joinTarget: "", joinProgress: "" });
        setRaAcqCompanies([{ name: "", staff: "" }]);
        setRaJoinCompanies([{ name: "", staff: "" }]);
        {
          const emptyAct2 = (name: string): StaffActivity => ({ staff: name, interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [], raPriceUpCount: 0, caPriceUpCount: 0, raPriceUpEntries: [], caPriceUpEntries: [] });
          if (subStaffName && currentStaffName) {
            setStaffActivities([emptyAct2(currentStaffName), emptyAct2(subStaffName)]);
          } else {
            setStaffActivities([emptyAct2(currentStaffName || "")]);
          }
        }
      }
    }
  };

  // セクション別保存関数
  const saveSectionData = async (section: string, sectionData: any) => {
    if (!saveDate) { showToast("日付を選択してください"); return; }
    setSavingSection(section);
    try {
      const payload: any = { dateKey: saveDate, data: sectionData, section };
      if (!isAdmin && currentStaffName) {
        payload.staffName = currentStaffName;
        if (subStaffName) payload.subStaffName = subStaffName;
        payload.userRole = userRole;
      }
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error();

      // ローカルの allData も更新（表示用）
      setAllData((prev) => {
        const existing = prev[saveDate] || {};
        let merged: any = { ...existing };

        if (section === "staffActivities") {
          if (!isAdmin && currentStaffName) {
            const editableStaff = [currentStaffName, ...(subStaffName ? [subStaffName] : [])];
            const isEditable = (staff: string) => editableStaff.includes(staff);
            const otherActs = (existing.staffActivities || []).filter((s: any) => !isEditable(s.staff));
            const myActs = sectionData.staffActivities || [];
            merged.staffActivities = [...otherActs, ...myActs];
          } else {
            merged.staffActivities = sectionData.staffActivities;
          }
        } else if (section === "budget") {
          if (sectionData.proper) merged.proper = sectionData.proper;
          if (sectionData.bp) merged.bp = sectionData.bp;
          if (sectionData.fl) merged.fl = sectionData.fl;
          if (sectionData.co) merged.co = sectionData.co;
        } else if (section === "focus") {
          if (!isAdmin && currentStaffName) {
            const editableStaff = [currentStaffName, ...(subStaffName ? [subStaffName] : [])];
            const isEditable = (staff: string) => editableStaff.includes(staff);
            const otherFocusPeople = (existing.focusPeople || []).filter((p: any) => !isEditable(p.staff));
            const myFocusPeople = sectionData.focusPeople || [];
            const otherFocusProjects = (existing.focusProjects || []).filter((p: any) => !isEditable(p.staff));
            const myFocusProjects = sectionData.focusProjects || [];
            merged.focusPeople = [...otherFocusPeople, ...myFocusPeople];
            merged.focusProjects = [...otherFocusProjects, ...myFocusProjects];
          } else {
            if (sectionData.focusPeople) merged.focusPeople = sectionData.focusPeople;
            if (sectionData.focusProjects) merged.focusProjects = sectionData.focusProjects;
          }
        } else if (section === "ra") {
          if (sectionData.ra) merged.ra = sectionData.ra;
        } else if (section === "announcements") {
          if (sectionData.announcements) merged.announcements = sectionData.announcements;
        }

        return { ...prev, [saveDate]: merged };
      });
      showToast("保存しました");
    } catch { showToast("保存に失敗しました"); }
    setSavingSection(null);
  };

  const saveStaffActivities = () => {
    const myStaffActs = staffActivities
      .map(s => ({ ...s, staff: s.staff || currentStaffName || "" }))
      .filter(s => s.staff && (s.interviewSetups || s.interviewsConducted || s.appointmentAcquisitions || s.ordersRA || s.ordersCA || s.raPriceUpCount || s.caPriceUpCount));
    // 受注・単価UPエントリーの入力漏れチェック
    for (const s of myStaffActs) {
      // RA受注の必須チェック
      for (let j = 0; j < (s.raEntries || []).length; j++) {
        const e = s.raEntries[j];
        if (!e.revenue) { showToast(`${s.staff}のRA受注${j + 1}件目：売上が未入力です`); return; }
        if (!e.amount) { showToast(`${s.staff}のRA受注${j + 1}件目：粗利が未入力です`); return; }
        if (!e.company) { showToast(`${s.staff}のRA受注${j + 1}件目：企業名が未入力です`); return; }
        if (!e.affiliation) { showToast(`${s.staff}のRA受注${j + 1}件目：所属が未選択です`); return; }
        if (!e.position) { showToast(`${s.staff}のRA受注${j + 1}件目：ポジションが未選択です`); return; }
        if (!e.orderType) { showToast(`${s.staff}のRA受注${j + 1}件目：種別が未選択です`); return; }
      }
      // CA受注の必須チェック
      for (let j = 0; j < (s.caEntries || []).length; j++) {
        const e = s.caEntries[j];
        if (!e.revenue) { showToast(`${s.staff}のCA受注${j + 1}件目：仕入が未入力です`); return; }
        if (!e.amount) { showToast(`${s.staff}のCA受注${j + 1}件目：粗利が未入力です`); return; }
        if (!e.company) { showToast(`${s.staff}のCA受注${j + 1}件目：企業名が未入力です`); return; }
        if (!e.affiliation) { showToast(`${s.staff}のCA受注${j + 1}件目：所属が未選択です`); return; }
        if (!e.position) { showToast(`${s.staff}のCA受注${j + 1}件目：ポジションが未選択です`); return; }
        if (!e.orderType) { showToast(`${s.staff}のCA受注${j + 1}件目：種別が未選択です`); return; }
      }
      // 単価UPエントリーの企業名チェック
      const puEntries = [...(s.raPriceUpEntries || []), ...(s.caPriceUpEntries || [])];
      const puMissing = puEntries.find(e => (e.amount || e.revenue) && !e.company);
      if (puMissing) {
        showToast(`${s.staff}の単価UPに企業名が未入力です`);
        return;
      }
    }
    saveSectionData("staffActivities", { staffActivities: myStaffActs });
  };

  const saveBudget = () => {
    saveSectionData("budget", {
      proper: { target: 0, progress: 0, forecast: parseNum(inp.properForecast), standby: parseNum(inp.properStandby), standbyCost: parseNum(inp.properStandbyCost) },
      bp: { target: 0, progress: 0, forecast: parseNum(inp.bpForecast), supportCost: parseNum(inp.bpSupportCost) },
      fl: { target: 0, progress: 0, forecast: parseNum(inp.flForecast), supportCost: parseNum(inp.flSupportCost) },
      co: { target: 0, progress: 0, forecast: parseNum(inp.coForecast), supportCost: parseNum(inp.coSupportCost) },
    });
  };

  const saveFocus = () => {
    saveSectionData("focus", {
      focusPeople: focusPeople.filter(p => p.name || p.cost),
      focusProjects: focusProjects.filter(p => p.company || p.title || p.price),
    });
  };

  const saveRA = () => {
    saveSectionData("ra", {
      ra: {
        acquisitionTarget: parseNum(raInp.acquisitionTarget), acquisitionProgress: parseNum(raInp.acquisitionProgress),
        acquisitionCompanies: raAcqCompanies.filter(c => c.name),
        joinTarget: parseNum(raInp.joinTarget), joinProgress: parseNum(raInp.joinProgress),
        joinCompanies: raJoinCompanies.filter(c => c.name),
      },
    });
  };

  const saveAnnouncements = () => {
    saveSectionData("announcements", {
      announcements: announcements.filter(a => a.trim()),
    });
  };

  // 過去日付判定: 当日より前の日付は目標・見込/注力/RA開拓/全体連絡を更新不可
  const isSaveDatePast = saveDate < todayKey();

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
        .card-grid { grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)) !important; }
        .main-focus-grid { grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)) !important; }
        @media (max-width: 767px) {
          .layout-flex { flex-direction: column !important; }
          .sidebar { width: 100% !important; }
          .card-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .main-focus-grid { grid-template-columns: 1fr !important; }
          .prev-result-grid { grid-template-columns: 1fr !important; }
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
          {[
            { key: "main" as const, label: "メイン" },
            { key: "monthly" as const, label: "月別営業活動成績" },
            { key: "analysis" as const, label: "営業分析" },
            ...(isAdmin ? [{ key: "users" as const, label: "ユーザー追加" }] : []),
          ].map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
              padding: "10px 24px", fontSize: 14, fontWeight: 700, cursor: "pointer", border: "none", borderBottom: activeTab === tab.key ? "3px solid " + tc.tabActive : "3px solid transparent",
              background: "transparent", color: activeTab === tab.key ? tc.tabActive : tc.tabInactive, marginBottom: -2,
            }}>{tab.label}</button>
          ))}
        </div>

        {activeTab === "monthly" && (
          <MonthlyActivityView allData={allData} setAllData={setAllData} monthlyYM={monthlyYM} setMonthlyYM={setMonthlyYM} isMobile={isMobile} currentStaffName={currentStaffName} isAdmin={isAdmin} userRole={userRole} subStaffName={subStaffName} onAffiliationProgress={setAffiliationProgress} />
        )}

        {activeTab === "analysis" && (
          <SalesAnalysisView allData={allData} monthlyYM={monthlyYM} setMonthlyYM={setMonthlyYM} isMobile={isMobile} />
        )}

        {activeTab === "users" && isAdmin && (
          <UserManagementView isMobile={isMobile} />
        )}

        {activeTab === "main" && <div className="layout-flex" style={{ display: "flex", gap: 24, maxWidth: 1400, margin: "0 auto" }}>
          {/* サイドバー: カレンダー */}
          {calendarOpen && (
            <div className="sidebar" style={{ width: 300, flexShrink: 0 }}>
              <div style={{ position: isMobile ? "static" : "sticky", top: 24, maxHeight: isMobile ? "none" : "calc(100vh - 48px)", overflowY: isMobile ? "visible" : "auto" }}>
              <div style={{ background: tc.bgCard, borderRadius: 14, padding: 20, boxShadow: tc.shadow }}>
                {/* 挨拶 + 担当名 */}
                {(isAdmin || currentStaffName) && (
                  <div style={{ textAlign: "center", marginBottom: 8, fontSize: 13, fontWeight: 700, color: tc.accentText }}>
                    {(() => {
                      const h = new Date().getHours();
                      const greeting = (h >= 5 && h < 12) ? "おはよう" : (h >= 12 && h < 17) ? "こんにちわ" : "こんばんわ";
                      const name = isAdmin ? "管理者" : (currentStaffName || "");
                      const cheers = ["ファイト！", "頑張ろう！", "いい日に！", "絶好調！", "全力で！", "最高の1日を！", "今日もGO！", "やるぞ！", "攻めよう！", "笑顔で！", "突き進め！", "いける！", "負けない！", "楽しもう！", "燃えろ！", "目標達成！", "強気で！", "前向きに！", "勝ちに行こう！", "一歩ずつ！"];
                      const dayIdx = new Date().getDate() + (name ? name.charCodeAt(0) : 0);
                      const cheer = cheers[dayIdx % cheers.length];
                      return `${greeting} ${name}さん　${cheer}`;
                    })()}
                  </div>
                )}
                {/* 会社ロゴ */}
                <div style={{ textAlign: "center", marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${tc.border}` }}>
                  <img src="/logo.png" alt="Cell Promote" style={{ maxWidth: "80%", height: "auto", maxHeight: 40, objectFit: "contain" }} />
                </div>
                {/* 天気 & 格言 */}
                {weatherInfo && (
                  <div style={{ fontSize: 11, color: tc.textSecondary, marginBottom: 8, lineHeight: 1.6, background: tc.bgSection, borderRadius: 8, padding: "8px 10px" }}>
                    {[{ label: "渋谷", data: weatherInfo.shibuya }, { label: "新宿", data: weatherInfo.shinjuku }].map((area, i) => (
                      <div key={area.label} style={{ display: "flex", alignItems: "center", gap: 6, whiteSpace: "nowrap", marginTop: i > 0 ? 4 : 0 }}>
                        <b style={{ minWidth: 28 }}>{area.label}</b>
                        {area.data.slots.map(s => (
                          <span key={s.time} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
                            <span style={{ fontSize: 10, color: tc.textSecondary }}>{s.time}</span>{s.weather}{s.temp}°
                          </span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {dailyQuote && (
                  <div style={{ fontSize: 10, color: "#888", marginBottom: 10, lineHeight: 1.5, wordBreak: "break-word", whiteSpace: "normal", paddingBottom: 10, borderBottom: "1px solid #eee" }}>
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
            </div>
          )}

          {/* メインコンテンツ */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* カード4枚 */}
            <div className="card-grid" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: isMobile ? 8 : 12, marginBottom: isMobile ? 16 : 24 }}>
              {(() => {
                const pCarry = Math.floor(properBreakdown.carryover * 10000);
                const bCarry = Math.floor(bpBreakdown.carryover * 10000);
                const fCarry = Math.floor(flBreakdown.carryover * 10000);
                const cCarry = Math.floor(coBreakdown.carryover * 10000);
                const totalCarry = pCarry + bCarry + fCarry + cCarry;
                const pNew = Math.floor(properBreakdown.monthOrderNew * 10000);
                const bNew = Math.floor(bpBreakdown.monthOrderNew * 10000);
                const fNew = Math.floor(flBreakdown.monthOrderNew * 10000);
                const cNew = Math.floor(coBreakdown.monthOrderNew * 10000);
                const pSlide = Math.floor(properBreakdown.monthOrderSlide * 10000);
                const bSlide = Math.floor(bpBreakdown.monthOrderSlide * 10000);
                const fSlide = Math.floor(flBreakdown.monthOrderSlide * 10000);
                const cSlide = Math.floor(coBreakdown.monthOrderSlide * 10000);
                const pPU = Math.floor(properBreakdown.monthOrderPU * 10000);
                const bPU = Math.floor(bpBreakdown.monthOrderPU * 10000);
                const fPU = Math.floor(flBreakdown.monthOrderPU * 10000);
                const cPU = Math.floor(coBreakdown.monthOrderPU * 10000);
                const totalNew = pNew + bNew + fNew + cNew;
                const totalSlide = pSlide + bSlide + fSlide + cSlide;
                const totalPU = pPU + bPU + fPU + cPU;
                // HC情報
                const pHC = { hcCarryover: properBreakdown.hcCarryover, hcNew: properBreakdown.hcNew, hcSlide: properBreakdown.hcSlide };
                const bHC = { hcCarryover: bpBreakdown.hcCarryover, hcNew: bpBreakdown.hcNew, hcSlide: bpBreakdown.hcSlide };
                const fHC = { hcCarryover: flBreakdown.hcCarryover, hcNew: flBreakdown.hcNew, hcSlide: flBreakdown.hcSlide };
                const cHC = { hcCarryover: coBreakdown.hcCarryover, hcNew: coBreakdown.hcNew, hcSlide: coBreakdown.hcSlide };
                const tHC = { hcCarryover: pHC.hcCarryover + bHC.hcCarryover + fHC.hcCarryover + cHC.hcCarryover, hcNew: pHC.hcNew + bHC.hcNew + fHC.hcNew + cHC.hcNew, hcSlide: pHC.hcSlide + bHC.hcSlide + fHC.hcSlide + cHC.hcSlide };
                return (
                  <>
                    <SummaryCard title="全体" data={total} rate={calcRate(totalAdjusted, total.target)} isTotal countInfo={affiliationProgress["全体"]} grossProfitTotal={totalAdjusted} totalDeduction={(proper.standbyCost || 0) + (bp.supportCost || 0) + (fl.supportCost || 0) + (co.supportCost || 0)} carryover={totalCarry} monthOrder={total.progress - totalCarry} monthOrderNew={totalNew} monthOrderSlide={totalSlide} monthOrderPU={totalPU} hcInfo={tHC} />
                    <SummaryCard title="プロパー" data={proper} rate={calcRate(properAdjusted, proper.target)} standby={proper.standby} standbyCost={proper.standbyCost} countInfo={affiliationProgress["プロパー"]} companyProfits={companyProfitProper} carryover={pCarry} monthOrder={properProgress - pCarry} monthOrderNew={pNew} monthOrderSlide={pSlide} monthOrderPU={pPU} hcInfo={pHC} />
                    <SummaryCard title="BP" data={bp} rate={calcRate(bpAdjusted, bp.target)} supportCost={bp.supportCost} countInfo={affiliationProgress["BP"]} companyProfits={companyProfitBP} carryover={bCarry} monthOrder={bpProgress - bCarry} monthOrderNew={bNew} monthOrderSlide={bSlide} monthOrderPU={bPU} hcInfo={bHC} />
                    <SummaryCard title="フリーランス" data={fl} rate={calcRate(flAdjusted, fl.target)} supportCost={fl.supportCost} countInfo={affiliationProgress["フリーランス"]} companyProfits={companyProfitFL} carryover={fCarry} monthOrder={flProgress - fCarry} monthOrderNew={fNew} monthOrderSlide={fSlide} monthOrderPU={fPU} hcInfo={fHC} />
                    <SummaryCard title="協業" data={co} rate={calcRate(coAdjusted, co.target)} supportCost={co.supportCost} countInfo={affiliationProgress["協業"]} companyProfits={companyProfitCO} carryover={cCarry} monthOrder={coProgress - cCarry} monthOrderNew={cNew} monthOrderSlide={cSlide} monthOrderPU={cPU} hcInfo={cHC} />
                  </>
                );
              })()}
            </div>

            {/* 前日営業活動成績 */}
            <PrevDayResultSection dStaffActivities={dStaffActivities} prevPrevStaffActivities={prevPrevStaffActivities} isMobile={isMobile} textColor={tc.textPrimary} />

            {/* RA開拓セクション */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14, paddingBottom: 8, borderBottom: "3px solid #2ecc71" }}>
              <div style={{ width: 6, height: 24, borderRadius: 3, background: "#2ecc71" }} />
              <h3 style={{ fontSize: 16, fontWeight: 700, color: tc.textPrimary, margin: 0 }}>RA開拓</h3>
            </div>
            <div style={{ marginBottom: isMobile ? 16 : 24 }}>
              <RADisplay ra={dRA} />
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
                </div>

                {/* 営業活動入力（権限D以外） */}
                {userRole !== "D" && <><h2 style={{ fontSize: 20, fontWeight: 700, color: tc.textPrimary, marginBottom: 16 }}>営業活動</h2>

                <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#0077b6", display: "inline-block" }} />
                  件数セクター
                </h4>
                {staffActivities.map((s, i) => {
                  const effectiveStaff = (!isAdmin && currentStaffName && !s.staff) ? currentStaffName : s.staff;
                  const isOwnStaff = !currentStaffName || effectiveStaff === currentStaffName || effectiveStaff === subStaffName;
                  const canEditRow = isAdmin || isOwnStaff;
                  return (
                  <div key={`count-${i}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap", opacity: canEditRow ? 1 : 0.5 }}>
                    <FieldWrap label="担当" className="fw-select" w={120}>{isAdmin ? (
                      <select value={s.staff} onChange={(e) => { const a = [...staffActivities]; a[i] = { ...a[i], staff: e.target.value }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(n => <option key={n}>{n}</option>)}</select>
                    ) : (
                      <div style={{ ...focusSelectStyle, background: tc.bgSection, display: "flex", alignItems: "center", fontWeight: 700 }}>{effectiveStaff || currentStaffName || ""}</div>
                    )}</FieldWrap>
                    <FieldWrap label="面談設定数" w={100}><input type="text" inputMode="numeric" value={s.interviewSetups || ""} onChange={(e) => { if (!canEditRow) return; const a = [...staffActivities]; a[i] = { ...a[i], interviewSetups: parseNum(e.target.value) }; setStaffActivities(a); }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="面談実施数" w={100}><input type="text" inputMode="numeric" value={s.interviewsConducted || ""} onChange={(e) => { if (!canEditRow) return; const a = [...staffActivities]; a[i] = { ...a[i], interviewsConducted: parseNum(e.target.value) }; setStaffActivities(a); }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="RA開拓アポ獲得" w={130}><input type="text" inputMode="numeric" value={s.appointmentAcquisitions || ""} onChange={(e) => { if (!canEditRow) return; const a = [...staffActivities]; a[i] = { ...a[i], appointmentAcquisitions: parseNum(e.target.value) }; setStaffActivities(a); }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="RA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersRA || ""} onChange={(e) => {
                      if (!canEditRow) return;
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].raEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "", orderType: "" as any }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], ordersRA: newCount, raEntries: newEntries };
                      setStaffActivities(a);
                    }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="CA受注数" w={100}><input type="text" inputMode="numeric" value={s.ordersCA || ""} onChange={(e) => {
                      if (!canEditRow) return;
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].caEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "", orderType: "" as any }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], ordersCA: newCount, caEntries: newEntries };
                      setStaffActivities(a);
                    }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="RA単価UP" w={100}><input type="text" inputMode="numeric" value={s.raPriceUpCount || ""} onChange={(e) => {
                      if (!canEditRow) return;
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].raPriceUpEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "" }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], raPriceUpCount: newCount, raPriceUpEntries: newEntries };
                      setStaffActivities(a);
                    }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    <FieldWrap label="CA単価UP" w={100}><input type="text" inputMode="numeric" value={s.caPriceUpCount || ""} onChange={(e) => {
                      if (!canEditRow) return;
                      const a = [...staffActivities];
                      const newCount = parseNum(e.target.value);
                      const oldEntries = a[i].caPriceUpEntries || [];
                      let newEntries: OrderEntry[] = [];
                      if (newCount > oldEntries.length) {
                        newEntries = [...oldEntries, ...Array(newCount - oldEntries.length).fill(null).map(() => ({ amount: 0, revenue: 0, company: "", affiliation: "", position: "" }))];
                      } else {
                        newEntries = oldEntries.slice(0, newCount);
                      }
                      a[i] = { ...a[i], caPriceUpCount: newCount, caPriceUpEntries: newEntries };
                      setStaffActivities(a);
                    }} readOnly={!canEditRow} placeholder="0" style={{ ...focusInputStyle, textAlign: "right", ...(canEditRow ? {} : { cursor: "not-allowed" }) }} /></FieldWrap>
                    {(isAdmin || canEditRow) && <button onClick={() => setStaffActivities(staffActivities.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>}
                  </div>
                  );
                })}
                {isAdmin && <button onClick={() => setStaffActivities([...staffActivities, { staff: "", interviewSetups: 0, interviewsConducted: 0, appointmentAcquisitions: 0, ordersRA: 0, ordersCA: 0, raEntries: [], caEntries: [], raPriceUpCount: 0, caPriceUpCount: 0, raPriceUpEntries: [], caPriceUpEntries: [] }])} style={addBtnStyle}>＋ 担当を追加</button>}

                <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 4, marginTop: 20, display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#e74c3c", display: "inline-block" }} />
                  金額セクター<span style={{ fontSize: 11, fontWeight: 400, color: tc.textSecondary }}>※件数セクターでRA受注数・CA受注数・RA単価UP・CA単価UPが1以上の担当者のみ表示されます</span>
                </h4>
                <p style={{ fontSize: 11, color: tc.textSecondary, margin: "0 0 10px", paddingLeft: 16, lineHeight: 1.8 }}>入力単位：万円（整数4桁・小数1桁まで）<br />複数受注の場合は1件ずつ登録してください</p>
                {/* RA受注：件数降順 */}
                {(() => {
                  const raEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.ordersRA || 0) > 0).sort((a, b) => (b.s.ordersRA || 0) - (a.s.ordersRA || 0));
                  return raEntries.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e74c3c", marginBottom: 8 }}>RA受注</div>
                      {raEntries.map(({ s, i }) => {
                        const effStaff = (!isAdmin && currentStaffName && !s.staff) ? currentStaffName : s.staff;
                        const canEdit = isAdmin || !currentStaffName || effStaff === currentStaffName || effStaff === subStaffName;
                        return (
                        <div key={`ra-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#fef8f8", borderRadius: 8, borderLeft: "3px solid #e74c3c", opacity: canEdit ? 1 : 0.5 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.ordersRA}件）</div>
                          {(s.raEntries || []).map((entry, j) => (
                            <div key={`ra-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < s.raEntries.length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#e74c3c", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="売上（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.revenue || 0} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], revenue: v }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.amount} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], amount: v }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><CompanySelect value={entry.company || ""} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], company: v }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} companies={allCompanies} onAddCompany={handleAddCompany} style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select disabled={!canEdit} value={entry.affiliation || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select disabled={!canEdit} value={entry.position || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                              <FieldWrap label="種別" className="fw-select" w={90}><select disabled={!canEdit} value={entry.orderType || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].raEntries]; entries[j] = { ...entries[j], orderType: e.target.value as "新規" | "スライド" }; a[i] = { ...a[i], raEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>新規</option><option>スライド</option></select></FieldWrap>
                            </div>
                          ))}
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* CA受注：件数降順 */}
                {(() => {
                  const caEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.ordersCA || 0) > 0).sort((a, b) => (b.s.ordersCA || 0) - (a.s.ordersCA || 0));
                  return caEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#9b59b6", marginBottom: 8 }}>CA受注</div>
                      {caEntries.map(({ s, i }) => {
                        const effStaff = (!isAdmin && currentStaffName && !s.staff) ? currentStaffName : s.staff;
                        const canEdit = isAdmin || !currentStaffName || effStaff === currentStaffName || effStaff === subStaffName;
                        return (
                        <div key={`ca-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#f9f5fc", borderRadius: 8, borderLeft: "3px solid #9b59b6", opacity: canEdit ? 1 : 0.5 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.ordersCA}件）</div>
                          {(s.caEntries || []).map((entry, j) => (
                            <div key={`ca-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < s.caEntries.length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#9b59b6", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="仕入（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.revenue || 0} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], revenue: v }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.amount} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], amount: v }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><CompanySelect value={entry.company || ""} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], company: v }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} companies={allCompanies} onAddCompany={handleAddCompany} style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select disabled={!canEdit} value={entry.affiliation || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select disabled={!canEdit} value={entry.position || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                              <FieldWrap label="種別" className="fw-select" w={90}><select disabled={!canEdit} value={entry.orderType || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...a[i].caEntries]; entries[j] = { ...entries[j], orderType: e.target.value as "新規" | "スライド" }; a[i] = { ...a[i], caEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>新規</option><option>スライド</option></select></FieldWrap>
                            </div>
                          ))}
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* RA単価UP：件数降順 */}
                {(() => {
                  const raPUEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.raPriceUpCount || 0) > 0).sort((a, b) => (b.s.raPriceUpCount || 0) - (a.s.raPriceUpCount || 0));
                  return raPUEntries.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#e74c3c", marginBottom: 8 }}>RA単価UP　<span style={{ fontSize: 11, fontWeight: 400, color: tc.textSecondary }}>※UP分のみ記入</span></div>
                      {raPUEntries.map(({ s, i }) => {
                        const effStaff = (!isAdmin && currentStaffName && !s.staff) ? currentStaffName : s.staff;
                        const canEdit = isAdmin || !currentStaffName || effStaff === currentStaffName || effStaff === subStaffName;
                        return (
                        <div key={`rapu-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#fef2f0", borderRadius: 8, borderLeft: "3px solid #e74c3c", opacity: canEdit ? 1 : 0.5 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.raPriceUpCount}件）</div>
                          {(s.raPriceUpEntries || []).map((entry, j) => (
                            <div key={`rapu-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < (s.raPriceUpEntries || []).length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#e74c3c", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="売上（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.revenue || 0} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].raPriceUpEntries || [])]; entries[j] = { ...entries[j], revenue: v }; a[i] = { ...a[i], raPriceUpEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.amount} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].raPriceUpEntries || [])]; entries[j] = { ...entries[j], amount: v }; a[i] = { ...a[i], raPriceUpEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><CompanySelect value={entry.company || ""} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].raPriceUpEntries || [])]; entries[j] = { ...entries[j], company: v }; a[i] = { ...a[i], raPriceUpEntries: entries }; setStaffActivities(a); }} companies={allCompanies} onAddCompany={handleAddCompany} style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select disabled={!canEdit} value={entry.affiliation || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].raPriceUpEntries || [])]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], raPriceUpEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select disabled={!canEdit} value={entry.position || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].raPriceUpEntries || [])]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], raPriceUpEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                            </div>
                          ))}
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}
                {/* CA単価UP：件数降順 */}
                {(() => {
                  const caPUEntries = staffActivities.map((s, i) => ({ s, i })).filter(({ s }) => (s.caPriceUpCount || 0) > 0).sort((a, b) => (b.s.caPriceUpCount || 0) - (a.s.caPriceUpCount || 0));
                  return caPUEntries.length > 0 && (
                    <div style={{ marginBottom: 12 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "#9b59b6", marginBottom: 8 }}>CA単価UP　<span style={{ fontSize: 11, fontWeight: 400, color: tc.textSecondary }}>※UP分のみ記入</span></div>
                      {caPUEntries.map(({ s, i }) => {
                        const effStaff = (!isAdmin && currentStaffName && !s.staff) ? currentStaffName : s.staff;
                        const canEdit = isAdmin || !currentStaffName || effStaff === currentStaffName || effStaff === subStaffName;
                        return (
                        <div key={`capu-${i}`} style={{ marginBottom: 8, padding: "10px 12px", background: "#f9f5fc", borderRadius: 8, borderLeft: "3px solid #9b59b6", opacity: canEdit ? 1 : 0.5 }}>
                          <div style={{ fontSize: 13, fontWeight: 700, color: tc.textPrimary, marginBottom: 6 }}>{s.staff}（{s.caPriceUpCount}件）</div>
                          {(s.caPriceUpEntries || []).map((entry, j) => (
                            <div key={`capu-${i}-${j}`} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: isMobile ? "wrap" : "nowrap", marginBottom: j < (s.caPriceUpEntries || []).length - 1 ? 6 : 0 }}>
                              <span style={{ fontSize: 11, color: "#9b59b6", fontWeight: 600, minWidth: 30, alignSelf: "center" }}>{j + 1}件目</span>
                              <FieldWrap label="仕入（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.revenue || 0} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].caPriceUpEntries || [])]; entries[j] = { ...entries[j], revenue: v }; a[i] = { ...a[i], caPriceUpEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="粗利（万円）" w={130}><AmountInput readOnly={!canEdit} value={entry.amount} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].caPriceUpEntries || [])]; entries[j] = { ...entries[j], amount: v }; a[i] = { ...a[i], caPriceUpEntries: entries }; setStaffActivities(a); }} style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                              <FieldWrap label="企業名" grow><CompanySelect value={entry.company || ""} onChange={(v) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].caPriceUpEntries || [])]; entries[j] = { ...entries[j], company: v }; a[i] = { ...a[i], caPriceUpEntries: entries }; setStaffActivities(a); }} companies={allCompanies} onAddCompany={handleAddCompany} style={focusInputStyle} /></FieldWrap>
                              <FieldWrap label="所属" className="fw-select" w={110}><select disabled={!canEdit} value={entry.affiliation || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].caPriceUpEntries || [])]; entries[j] = { ...entries[j], affiliation: e.target.value }; a[i] = { ...a[i], caPriceUpEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                              <FieldWrap label="ポジション" className="fw-select" w={120}><select disabled={!canEdit} value={entry.position || ""} onChange={(e) => { if (!canEdit) return; const a = [...staffActivities]; const entries = [...(a[i].caPriceUpEntries || [])]; entries[j] = { ...entries[j], position: e.target.value }; a[i] = { ...a[i], caPriceUpEntries: entries }; setStaffActivities(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(p => <option key={p}>{p}</option>)}</select></FieldWrap>
                            </div>
                          ))}
                        </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {/* 営業活動セクション保存ボタン */}
                <div style={{ marginTop: 16 }}>
                  <button onClick={saveStaffActivities} disabled={savingSection === "staffActivities"} style={{
                    width: "100%", padding: "14px 24px", background: "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                    border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: savingSection === "staffActivities" ? "not-allowed" : "pointer", opacity: savingSection === "staffActivities" ? 0.7 : 1,
                  }}>
                    {savingSection === "staffActivities" ? "保存中..." : "営業活動を保存"}
                  </button>
                </div>
                </>}

                {/* 予算・見込セクション（権限A/Bのみ入力可） */}
                {(isAdmin || userRole === "A" || userRole === "B") && (
                <div style={{ marginTop: 24, borderTop: "3px solid " + tc.textPrimary }}>
                  <div onClick={() => setSectionSalesOpen(!sectionSalesOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionSalesOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20V10"/><path d="M18 20V4"/><path d="M6 20v-4"/></svg>
                      予測 <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 600 }}>※追加・更新は本日日付選択後、保存</span>
                    </h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionSalesOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionSalesOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>
                      <div className="input-4col" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
                        <InputGroup title="プロパー" fields={[
                          { label: "目標", value: inp.properTarget, key: "properTarget", disabled: true },
                          { label: "予測", value: inp.properForecast, key: "properForecast" },
                          { label: "待機費用", value: inp.properStandbyCost, key: "properStandbyCost" },
                          { label: "待機（人数）", value: inp.properStandby, key: "properStandby" },
                        ]} onChange={handleNumInput} />
                        <InputGroup title="BP" fields={[
                          { label: "目標", value: inp.bpTarget, key: "bpTarget", disabled: true },
                          { label: "予測", value: inp.bpForecast, key: "bpForecast" },
                          { label: "支援費等", value: inp.bpSupportCost, key: "bpSupportCost" },
                        ]} onChange={handleNumInput} />
                        <InputGroup title="フリーランス" fields={[
                          { label: "目標", value: inp.flTarget, key: "flTarget", disabled: true },
                          { label: "予測", value: inp.flForecast, key: "flForecast" },
                          { label: "支援費等", value: inp.flSupportCost, key: "flSupportCost" },
                        ]} onChange={handleNumInput} />
                        <InputGroup title="協業" fields={[
                          { label: "目標", value: inp.coTarget, key: "coTarget", disabled: true },
                          { label: "予測", value: inp.coForecast, key: "coForecast" },
                          { label: "支援費等", value: inp.coSupportCost, key: "coSupportCost" },
                        ]} onChange={handleNumInput} />
                      </div>
                      <div style={{ marginTop: 16 }}>
                        <button onClick={saveBudget} disabled={savingSection === "budget" || isSaveDatePast} style={{
                          width: "100%", padding: "14px 24px", background: isSaveDatePast ? "#888" : "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                          border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: (savingSection === "budget" || isSaveDatePast) ? "not-allowed" : "pointer", opacity: (savingSection === "budget" || isSaveDatePast) ? 0.7 : 1,
                        }}>
                          {isSaveDatePast ? "過去日付のため更新不可" : savingSection === "budget" ? "保存中..." : "予測を保存"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                )}


                {/* 注力セクション（権限D以外） */}
                {userRole !== "D" && <div style={{ marginTop: 24, borderTop: "3px solid #1a1a2e" }}>
                  <div onClick={() => setSectionFocusOpen(!sectionFocusOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionFocusOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
                      注力 <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 600 }}>※追加・更新は本日日付選択後、保存</span>
                    </h2>
                    <span style={{ fontSize: 18, color: "#fff", transform: sectionFocusOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
                  </div>
                  {sectionFocusOpen && (
                    <div style={{ padding: "16px", background: tc.bgSection, borderRadius: "0 0 10px 10px", border: "1px solid " + tc.border, borderTop: "none" }}>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10 }}>注力案件</h4>
                  {focusProjects.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="企業名" grow><CompanySelect value={p.company || ""} onChange={(v) => { const a = [...focusProjects]; a[i] = { ...a[i], company: v }; setFocusProjects(a); }} companies={allCompanies} onAddCompany={handleAddCompany} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="案件タイトル" grow><input type="text" value={p.title} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], title: e.target.value.slice(0, 20) }; setFocusProjects(a); }} placeholder="案件タイトル" maxLength={20} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], position: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}>{isAdmin ? (
                        <select value={p.staff} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], staff: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select>
                      ) : subStaffName ? (
                        <select value={p.staff} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], staff: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value={currentStaffName || ""}>{currentStaffName}</option><option value={subStaffName}>{subStaffName}</option></select>
                      ) : (
                        <div style={{ ...focusInputStyle, background: tc.bgSection, display: "flex", alignItems: "center" }}>{currentStaffName}</div>
                      )}</FieldWrap>
                      <FieldWrap label="単価" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.price ? p.price.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], price: parseNum(e.target.value) }; setFocusProjects(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <FieldWrap label="契約形態" className="fw-select" w={110}><select value={p.contract} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], contract: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option>派遣</option><option>準委任</option><option>両方OK</option></select></FieldWrap>
                      <FieldWrap label="勤務場所" className="fw-select" w={120}><select value={p.location} onChange={(e) => { const a = [...focusProjects]; a[i] = { ...a[i], location: e.target.value }; setFocusProjects(a); }} style={focusSelectStyle}><option value="">選択</option>{LOCATION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <button onClick={() => setFocusProjects(focusProjects.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusProjects([...focusProjects, { company: "", title: "", price: 0, contract: "派遣", staff: (!isAdmin && currentStaffName) ? currentStaffName : "", position: "", location: "" }])} style={addBtnStyle}>＋ 案件を追加</button>

                  <h4 style={{ fontSize: 14, fontWeight: 700, color: tc.textPrimary, marginBottom: 10, marginTop: 24 }}>注力人材</h4>
                  {focusPeople.map((p, i) => (
                    <div key={i} className="focus-row-flex" style={{ display: "flex", gap: 8, alignItems: "flex-end", marginBottom: 8, padding: "10px 12px", background: "#f8f9fa", borderRadius: 8, flexWrap: isMobile ? "wrap" : "nowrap" }}>
                      <FieldWrap label="氏名" grow><input type="text" value={p.name} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], name: e.target.value }; setFocusPeople(a); }} placeholder="氏名" style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="所属" className="fw-select" w={110}><select value={p.affiliation} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], affiliation: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option>プロパー</option><option>BP</option><option>フリーランス</option><option>協業</option></select></FieldWrap>
                      <FieldWrap label="ポジション" className="fw-select" w={120}><select value={p.position} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], position: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{POSITION_LIST.map(s => <option key={s}>{s}</option>)}</select></FieldWrap>
                      <FieldWrap label="担当" className="fw-select" w={110}>{isAdmin ? (
                        <select value={p.staff} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], staff: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value="">選択</option>{STAFF_LIST.map(s => <option key={s}>{s}</option>)}</select>
                      ) : subStaffName ? (
                        <select value={p.staff} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], staff: e.target.value }; setFocusPeople(a); }} style={focusSelectStyle}><option value={currentStaffName || ""}>{currentStaffName}</option><option value={subStaffName}>{subStaffName}</option></select>
                      ) : (
                        <div style={{ ...focusInputStyle, background: tc.bgSection, display: "flex", alignItems: "center" }}>{currentStaffName}</div>
                      )}</FieldWrap>
                      <FieldWrap label="スキル" w={140}><input type="text" value={p.skill} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], skill: e.target.value.slice(0, 15) }; setFocusPeople(a); }} placeholder="スキル" maxLength={15} style={focusInputStyle} /></FieldWrap>
                      <FieldWrap label="仕入れ額" className="fw-money" w={120}><input type="text" inputMode="numeric" value={p.cost ? p.cost.toLocaleString("ja-JP") : ""} onChange={(e) => { const a = [...focusPeople]; a[i] = { ...a[i], cost: parseNum(e.target.value) }; setFocusPeople(a); }} placeholder="0" style={{ ...focusInputStyle, textAlign: "right" }} /></FieldWrap>
                      <button onClick={() => setFocusPeople(focusPeople.filter((_, j) => j !== i))} style={removeBtnStyle}>×</button>
                    </div>
                  ))}
                  <button onClick={() => setFocusPeople([...focusPeople, { name: "", affiliation: "プロパー", cost: 0, staff: (!isAdmin && currentStaffName) ? currentStaffName : "", position: "", skill: "" }])} style={addBtnStyle}>＋ 人材を追加</button>

                  <div style={{ marginTop: 16 }}>
                    <button onClick={saveFocus} disabled={savingSection === "focus" || isSaveDatePast} style={{
                      width: "100%", padding: "14px 24px", background: isSaveDatePast ? "#888" : "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: (savingSection === "focus" || isSaveDatePast) ? "not-allowed" : "pointer", opacity: (savingSection === "focus" || isSaveDatePast) ? 0.7 : 1,
                    }}>
                      {isSaveDatePast ? "過去日付のため更新不可" : savingSection === "focus" ? "保存中..." : "注力を保存"}
                    </button>
                  </div>

                    </div>
                  )}
                </div>}

                {/* RA開拓セクション（権限D以外） */}
                {userRole !== "D" && <div style={{ marginTop: 24, borderTop: "3px solid " + tc.textPrimary }}>
                  <div onClick={() => setSectionRAOpen(!sectionRAOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionRAOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
                      RA開拓 <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 600 }}>※追加・更新は本日日付選択後、保存</span>
                    </h2>
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

                  <div style={{ marginTop: 16 }}>
                    <button onClick={saveRA} disabled={savingSection === "ra" || isSaveDatePast} style={{
                      width: "100%", padding: "14px 24px", background: isSaveDatePast ? "#888" : "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: (savingSection === "ra" || isSaveDatePast) ? "not-allowed" : "pointer", opacity: (savingSection === "ra" || isSaveDatePast) ? 0.7 : 1,
                    }}>
                      {isSaveDatePast ? "過去日付のため更新不可" : savingSection === "ra" ? "保存中..." : "RA開拓を保存"}
                    </button>
                  </div>

                    </div>
                  )}
                </div>}

                {/* 全体連絡セクション（全権限で入力可） */}
                <div style={{ marginTop: 24, borderTop: "3px solid #1a1a2e" }}>
                  <div onClick={() => setSectionAnnouncementOpen(!sectionAnnouncementOpen)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 16px", background: "linear-gradient(135deg, #1a1a2e, #16213e)", borderRadius: sectionAnnouncementOpen ? "0" : "0 0 10px 10px", cursor: "pointer", userSelect: "none" as const }}>
                    <h2 style={{ fontSize: 18, fontWeight: 700, color: "#fff", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 17H2a3 3 0 0 0 3-3V9a7 7 0 0 1 14 0v5a3 3 0 0 0 3 3z"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                      全体連絡 <span style={{ fontSize: 12, color: "#ff4444", fontWeight: 600 }}>※追加・更新は本日日付選択後、保存</span>
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

                  <div style={{ marginTop: 16 }}>
                    <button onClick={saveAnnouncements} disabled={savingSection === "announcements" || isSaveDatePast} style={{
                      width: "100%", padding: "14px 24px", background: isSaveDatePast ? "#888" : "linear-gradient(135deg, #0077b6, #00b4d8)", color: "#fff",
                      border: "none", borderRadius: 8, fontSize: 16, fontWeight: 700, cursor: (savingSection === "announcements" || isSaveDatePast) ? "not-allowed" : "pointer", opacity: (savingSection === "announcements" || isSaveDatePast) ? 0.7 : 1,
                    }}>
                      {isSaveDatePast ? "過去日付のため更新不可" : savingSection === "announcements" ? "保存中..." : "全体連絡を保存"}
                    </button>
                  </div>

                    </div>
                  )}
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

// ===== 共通スタイル =====
const thStyle: React.CSSProperties = { textAlign: "left", padding: "8px 0", color: "#999", fontWeight: 600 };
const calBtnStyle: React.CSSProperties = { width: 32, height: 32, border: "1px solid #ddd", borderRadius: 8, background: "#fff", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" };
const focusInputStyle: React.CSSProperties = { width: "100%", padding: "7px 10px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", boxSizing: "border-box" };
const focusSelectStyle: React.CSSProperties = { width: "100%", padding: "7px 8px", border: "1px solid #ddd", borderRadius: 6, fontSize: 13, outline: "none", background: "#fff", cursor: "pointer" };
const removeBtnStyle: React.CSSProperties = { width: 28, height: 28, border: "none", background: "#fee", color: "#e63946", borderRadius: 6, cursor: "pointer", fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const addBtnStyle: React.CSSProperties = { padding: "8px 16px", fontSize: 13, fontWeight: 600, color: "#0077b6", background: "#e8f4fd", border: "1px dashed #0077b6", borderRadius: 8, cursor: "pointer", width: "100%", marginTop: 8 };
