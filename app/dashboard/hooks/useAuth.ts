"use client";

import { useState, useEffect } from "react";

export function useAuth() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentStaffName, setCurrentStaffName] = useState<string | null>(null);
  const [subStaffName, setSubStaffName] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<"A" | "B" | "C" | "D">("C");

  // ログインユーザー情報取得
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.isAdmin || data?.role === "A") { setIsAdmin(true); setUserRole("A"); }
        if (data?.staffName) setCurrentStaffName(data.staffName);
        if (data?.subStaff) setSubStaffName(data.subStaff);
        if (data?.role) setUserRole(data.role);
      })
      .catch(() => {});
  }, []);

  return { isAdmin, setIsAdmin, currentStaffName, setCurrentStaffName, subStaffName, setSubStaffName, userRole, setUserRole };
}
