export interface CategoryData {
  target: number;
  progress: number;
  forecast: number;
  standby?: number;
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
}

export interface DayData {
  proper: CategoryData;
  bp: CategoryData;
  fl: CategoryData;
  focusPeople: FocusPerson[];
  focusProjects: FocusProject[];
  announcements: string[];
  ra: RAData;
  staffActivities: StaffActivity[];
}

export type AllData = Record<string, DayData>;
