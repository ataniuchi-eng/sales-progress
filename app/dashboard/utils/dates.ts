import { JAPAN_HOLIDAYS } from "../constants/data";
import type { AllData } from "../types/index";

export function dateKey(d: Date): string {
  return `${d.getFullYear()}-${("0" + (d.getMonth() + 1)).slice(-2)}-${("0" + d.getDate()).slice(-2)}`;
}

export function todayKey(): string {
  return dateKey(new Date());
}

export function parseDate(key: string): Date {
  const p = key.split("-");
  return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
}

export function formatDateJP(key: string): string {
  const d = parseDate(key);
  const dow = ["日", "月", "火", "水", "木", "金", "土"];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow[d.getDay()]}）`;
}

// 営業日判定（土日祝以外）
export function isBusinessDay(key: string): boolean {
  const d = parseDate(key);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  if (JAPAN_HOLIDAYS[key]) return false;
  return true;
}

// 翌営業日を取得
export function getNextBusinessDay(fromKey: string): string {
  const d = parseDate(fromKey);
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() + 1);
    const k = dateKey(d);
    if (isBusinessDay(k)) return k;
  }
  return dateKey(d);
}

// 前営業日を取得
export function getPrevBusinessDay(fromKey: string): string {
  const d = parseDate(fromKey);
  for (let i = 0; i < 10; i++) {
    d.setDate(d.getDate() - 1);
    const k = dateKey(d);
    if (isBusinessDay(k)) return k;
  }
  return dateKey(d);
}

export function getLatestDataForDate(allData: AllData, targetKey: string) {
  if (allData[targetKey]) return { data: allData[targetKey], sourceKey: targetKey, isExact: true };
  const keys = Object.keys(allData).sort().reverse();
  for (const k of keys) {
    if (k <= targetKey) return { data: allData[k], sourceKey: k, isExact: false };
  }
  return null;
}
