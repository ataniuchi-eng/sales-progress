"use client";

import { useState } from "react";
import { parseAmount, formatAmount } from "../../utils/numbers";

/**
 * 小数第一位まで入力可能な金額入力コンポーネント
 * 編集中は生の文字列を保持し、"5." のような中間状態でもピリオドが消えない
 */
export function AmountInput({
  value,
  onChange,
  readOnly,
  placeholder = "0",
  style,
}: {
  value: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
  placeholder?: string;
  style?: React.CSSProperties;
}) {
  const [raw, setRaw] = useState<string | null>(null);
  const displayValue = raw !== null ? raw : formatAmount(value);

  return (
    <input
      type="text"
      inputMode="decimal"
      readOnly={readOnly}
      value={displayValue}
      onFocus={() => setRaw(formatAmount(value))}
      onChange={(e) => {
        if (readOnly) return;
        const v = e.target.value;
        // 整数4桁 + 小数1桁まで許可（"5." のような中間状態も許可）
        if (/^\d{0,4}(\.\d{0,1})?$/.test(v) || v === "" || /^\d{0,4}\.$/.test(v)) {
          setRaw(v);
          // ピリオドで終わっていない場合のみ数値を更新
          if (!v.endsWith(".")) {
            onChange(parseAmount(v));
          }
        }
      }}
      onBlur={() => {
        if (raw !== null) {
          onChange(parseAmount(raw));
          setRaw(null);
        }
      }}
      placeholder={placeholder}
      style={style}
    />
  );
}
