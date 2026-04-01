"use client";

import React from "react";
import { useTheme } from "../../../theme-provider";

export function FieldWrap({ label, children, grow, w, className }: { label: string; children: React.ReactNode; grow?: boolean; w?: number; className?: string }) {
  const { t: tc } = useTheme();
  return (
    <div className={className} style={{ flex: grow ? 1 : "none", width: w, minWidth: 0 }}>
      <span style={{ fontSize: 10, color: tc.textSecondary, display: "block" }}>{label}</span>
      {children}
    </div>
  );
}
