import type { DayData } from "../types/index";

export function parseNum(str: string): number {
  return parseInt(str.replace(/[^0-9]/g, ""), 10) || 0;
}

export function parseAmount(str: string): number {
  const cleaned = str.replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : Math.round(num * 10) / 10;
}

export function formatAmount(num: number): string {
  if (!num) return "";
  return num % 1 === 0 ? num.toString() : num.toFixed(1);
}

export function formatNumStr(num: number): string {
  return num ? num.toLocaleString("ja-JP") : "";
}

export function formatYen(num: number): string {
  return "¥" + num.toLocaleString("ja-JP");
}

export function calcRate(progress: number, target: number): number {
  return target === 0 ? 0 : Math.round((progress / target) * 100);
}

export function getTitle(): string {
  let month = new Date().getMonth() + 2;
  if (month > 12) month = 1;
  return `${month}月稼働`;
}

export function emptyData(): DayData {
  return {
    proper: { target: 0, progress: 0, forecast: 0, standby: 0 },
    bp: { target: 0, progress: 0, forecast: 0 },
    fl: { target: 0, progress: 0, forecast: 0 },
    co: { target: 0, progress: 0, forecast: 0 },
    focusPeople: [],
    focusProjects: [],
    announcements: [],
    ra: {
      acquisitionTarget: 0,
      acquisitionProgress: 0,
      acquisitionCompanies: [],
      joinTarget: 0,
      joinProgress: 0,
      joinCompanies: [],
    },
    staffActivities: [],
  };
}
