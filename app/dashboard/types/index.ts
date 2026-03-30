export interface CategoryData {
  target: number;
  progress: number;
  forecast: number;
  standby?: number;
  standbyCost?: number;    // 待機費用（プロパー用）
  supportCost?: number;    // 支援費等（BP・フリーランス・協業用）
}

export interface FocusPerson {
  name: string;
  affiliation: string;
  cost: number;
  staff: string;
  position: string;
  skill: string;
}

export interface FocusProject {
  company: string;
  title: string;
  price: number;
  contract: string;
  staff: string;
  position: string;
  location: string;
}

export interface RACompany {
  name: string;
  staff: string;
}

export interface RAData {
  acquisitionTarget: number;
  acquisitionProgress: number;
  acquisitionCompanies: RACompany[];
  joinTarget: number;
  joinProgress: number;
  joinCompanies: RACompany[];
}

export interface OrderEntry {
  amount: number;
  revenue: number;
  company: string;
  affiliation: string;
  position: string;
  orderType?: "新規" | "スライド";
}

export interface StaffActivity {
  staff: string;
  interviewSetups: number;
  interviewsConducted: number;
  appointmentAcquisitions: number;
  ordersRA: number;
  ordersCA: number;
  raEntries: OrderEntry[];
  caEntries: OrderEntry[];
  raPriceUpCount: number;
  caPriceUpCount: number;
  raPriceUpEntries: OrderEntry[];
  caPriceUpEntries: OrderEntry[];
}

export interface DayData {
  proper: CategoryData;
  bp: CategoryData;
  fl: CategoryData;
  co: CategoryData;
  focusPeople: FocusPerson[];
  focusProjects: FocusProject[];
  announcements: string[];
  ra: RAData;
  staffActivities: StaffActivity[];
}

export type AllData = Record<string, DayData>;
