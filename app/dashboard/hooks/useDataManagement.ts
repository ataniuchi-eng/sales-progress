"use client";

import { useState, useEffect, useCallback } from "react";
import { AllData, DayData } from "../types/index";
import { isBusinessDay, getPrevBusinessDay, todayKey, getLatestDataForDate, getNextBusinessDay } from "../utils/dates";
import { emptyData } from "../utils/numbers";

export function useDataManagement() {
  const initialDate = (() => {
    const t = todayKey();
    return isBusinessDay(t) ? t : getNextBusinessDay(t);
  })();

  const [allData, setAllData] = useState<AllData>({});
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [saveDate, setSaveDate] = useState(initialDate);
  const [loading, setLoading] = useState(true);

  // データが実質空かどうか判定
  const isDataEmpty = useCallback((d: DayData): boolean => {
    const p = d.proper || { target: 0, progress: 0, forecast: 0 };
    const b = d.bp || { target: 0, progress: 0, forecast: 0 };
    const f = d.fl || { target: 0, progress: 0, forecast: 0 };
    const c = d.co || { target: 0, forecast: 0 };
    const numbersEmpty = p.target === 0 && p.progress === 0 && p.forecast === 0
      && b.target === 0 && b.progress === 0 && b.forecast === 0
      && f.target === 0 && f.progress === 0 && f.forecast === 0
      && (c.target || 0) === 0 && (c.forecast || 0) === 0;
    const peopleEmpty = !d.focusPeople || d.focusPeople.length === 0;
    const projectsEmpty = !d.focusProjects || d.focusProjects.length === 0;
    const ra = d.ra;
    const raEmpty = !ra || (
      (ra.acquisitionTarget || 0) === 0 && (ra.acquisitionProgress || 0) === 0
      && (ra.joinTarget || 0) === 0 && (ra.joinProgress || 0) === 0
      && (!ra.acquisitionCompanies || ra.acquisitionCompanies.length === 0)
      && (!ra.joinCompanies || ra.joinCompanies.length === 0)
    );
    const announcementsEmpty = !d.announcements || d.announcements.length === 0 || d.announcements.every(a => !a || !a.trim());
    return numbersEmpty && peopleEmpty && projectsEmpty && raEmpty && announcementsEmpty;
  }, []);

  // 初回ロード時のみ当日データを前営業日から継承
  const inheritOnce = useCallback(async (targetKey: string, currentAllData: AllData) => {
    const existing = currentAllData[targetKey];
    const hasBudget = existing && (
      (existing.proper?.target || 0) > 0 || (existing.proper?.forecast || 0) > 0
      || (existing.bp?.target || 0) > 0 || (existing.bp?.forecast || 0) > 0
      || (existing.fl?.target || 0) > 0 || (existing.fl?.forecast || 0) > 0
      || (existing.co?.target || 0) > 0 || (existing.co?.forecast || 0) > 0
    );
    const hasFocus = existing && (
      (existing.focusPeople?.length || 0) > 0 || (existing.focusProjects?.length || 0) > 0
    );
    const hasRA = existing?.ra && (
      (existing.ra.acquisitionTarget || 0) > 0 || (existing.ra.acquisitionProgress || 0) > 0
      || (existing.ra.joinTarget || 0) > 0 || (existing.ra.joinProgress || 0) > 0
      || (existing.ra.acquisitionCompanies?.length || 0) > 0
      || (existing.ra.joinCompanies?.length || 0) > 0
    );
    const hasAnnouncements = existing && (
      (existing.announcements?.length || 0) > 0 && existing.announcements!.some(a => a && a.trim())
    );
    if (hasBudget && hasFocus && hasRA && hasAnnouncements) return;
    const prevBizDay = getPrevBusinessDay(targetKey);
    let prevData: DayData | null = null;
    const keys = Object.keys(currentAllData).sort().reverse();
    for (const k of keys) {
      if (k <= prevBizDay && isBusinessDay(k) && !isDataEmpty(currentAllData[k])) {
        prevData = currentAllData[k];
        break;
      }
    }
    if (!prevData) return;
    const merged: DayData = JSON.parse(JSON.stringify(existing || {}));
    let needsSave = false;
    if (!hasBudget) {
      if (prevData.proper) { merged.proper = JSON.parse(JSON.stringify(prevData.proper)); needsSave = true; }
      if (prevData.bp) { merged.bp = JSON.parse(JSON.stringify(prevData.bp)); needsSave = true; }
      if (prevData.fl) { merged.fl = JSON.parse(JSON.stringify(prevData.fl)); needsSave = true; }
      if (prevData.co) { merged.co = JSON.parse(JSON.stringify(prevData.co)); needsSave = true; }
    }
    if (!hasFocus) {
      if (prevData.focusPeople?.length) { merged.focusPeople = JSON.parse(JSON.stringify(prevData.focusPeople)); needsSave = true; }
      if (prevData.focusProjects?.length) { merged.focusProjects = JSON.parse(JSON.stringify(prevData.focusProjects)); needsSave = true; }
    }
    if (!hasRA && prevData.ra) {
      merged.ra = JSON.parse(JSON.stringify(prevData.ra)); needsSave = true;
    }
    if (!hasAnnouncements && prevData.announcements?.length) {
      merged.announcements = JSON.parse(JSON.stringify(prevData.announcements)); needsSave = true;
    }
    if (!merged.staffActivities) merged.staffActivities = [];
    if (!needsSave) return;
    try {
      const res = await fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ dateKey: targetKey, data: merged }) });
      if (res.ok) {
        setAllData((prev) => ({ ...prev, [targetKey]: merged }));
      }
    } catch { }
  }, [isDataEmpty]);

  // データロード
  const fetchAllData = useCallback(async (router: any) => {
    try {
      const r = await fetch("/api/data");
      if (r.status === 401) { router.push("/login"); return null; }
      const data = await r.json();
      if (data) {
        setAllData(data);
        const today = todayKey();
        const todayData = data[today];
        const hasBudget = todayData && (
          (todayData.proper?.target || 0) > 0 || (todayData.proper?.forecast || 0) > 0
          || (todayData.bp?.target || 0) > 0 || (todayData.bp?.forecast || 0) > 0
          || (todayData.fl?.target || 0) > 0 || (todayData.fl?.forecast || 0) > 0
          || (todayData.co?.target || 0) > 0 || (todayData.co?.forecast || 0) > 0
        );
        const hasFocus = todayData && (
          (todayData.focusPeople?.length || 0) > 0 || (todayData.focusProjects?.length || 0) > 0
        );
        const hasRA = todayData?.ra && (
          (todayData.ra.acquisitionTarget || 0) > 0 || (todayData.ra.acquisitionProgress || 0) > 0
          || (todayData.ra.joinTarget || 0) > 0 || (todayData.ra.joinProgress || 0) > 0
          || (todayData.ra.acquisitionCompanies?.length || 0) > 0
          || (todayData.ra.joinCompanies?.length || 0) > 0
        );
        const hasAnnouncements = todayData && (
          (todayData.announcements?.length || 0) > 0 && todayData.announcements!.some((a: string) => a && a.trim())
        );
        if (!todayData || !hasBudget || !hasFocus || !hasRA || !hasAnnouncements) {
          await inheritOnce(today, data);
        }
      }
      setLoading(false);
    } catch {
      setLoading(false);
    }
  }, [inheritOnce]);

  return {
    allData,
    setAllData,
    selectedDate,
    setSelectedDate,
    saveDate,
    setSaveDate,
    loading,
    setLoading,
    isDataEmpty,
    inheritOnce,
    fetchAllData,
  };
}
