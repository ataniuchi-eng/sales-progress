// ===== 担当者リスト =====
export const STAFF_LIST = [
  "麻生", "羽鳥", "五十嵐", "島津", "山田", "黄", "上杉", "杉俣",
  "栗山", "松浦", "佐久間", "関", "今村", "平川", "池田", "竹内", "柿島",
];

// ===== ポジションリスト =====
export const POSITION_LIST = ["AE", "Infra", "DD", "PMO", "PL", "PM", "Consultant"];

// ===== 日本の祝日（2026-2028） =====
export const JAPAN_HOLIDAYS: Record<string, string> = {
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
export type ActivityFieldType = {
  key: keyof import("../types/index").StaffActivity;
  label: string;
  color: string;
  targetType: "monthly" | "daily";
};

export const ACTIVITY_FIELDS: ActivityFieldType[] = [
  { key: "ordersRA", label: "RA受注数", color: "#e74c3c", targetType: "monthly" },
  { key: "ordersCA", label: "CA受注数", color: "#9b59b6", targetType: "monthly" },
  { key: "interviewSetups", label: "面談設定数", color: "#0077b6", targetType: "daily" },
  { key: "interviewsConducted", label: "面談実施数", color: "#e67e22", targetType: "monthly" },
  { key: "appointmentAcquisitions", label: "RA開拓アポ獲得", color: "#2ecc71", targetType: "monthly" },
];

// ===== 金額フィールド定義 =====
export type ActivityAmountFieldType = {
  key: string;
  label: string;
  rankLabel: string;
  tableLabel: string;
  color: string;
};

export const ACTIVITY_AMOUNT_FIELDS: ActivityAmountFieldType[] = [
  { key: "amountRA", label: "RA受注金額", rankLabel: "今月RA受注", tableLabel: "RA粗利", color: "#e74c3c" },
  { key: "amountCA", label: "CA受注金額", rankLabel: "今月CA受注", tableLabel: "CA粗利", color: "#9b59b6" },
];

// ===== 勤務場所リスト =====
export const LOCATION_LIST = ["出社", "リモート", "ハイブリッド"];
