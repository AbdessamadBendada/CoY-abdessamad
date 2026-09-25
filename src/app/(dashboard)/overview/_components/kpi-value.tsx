"use client";

import { useEffect, useRef, useState } from "react";

interface KpiValueProps {
  value: string;
  style?: React.CSSProperties;
}

function initialDisplay(value: string): string {
  const match = value.match(/(\d+(?:\.\d+)?)/);
  if (!match || !parseFloat(match[1])) return value;

  const index = match.index ?? 0;
  const prefix = value.slice(0, index);
  const suffix = value.slice(index + match[1].length);
  return prefix + (match[1].includes(".") ? "0.0" : "0") + suffix;
}

export function KpiValue({ value, style }: KpiValueProps) {
  const [display, setDisplay] = useState(() => initialDisplay(value));
  const didAnimate = useRef(false);

  useEffect(() => {
    if (didAnimate.current || value === "—") return;
    didAnimate.current = true;

    const m = value.match(/(\d+(?:\.\d+)?)/);
    if (!m) return;

    const target = parseFloat(m[1]);
    if (!target) return;

    const idx = m.index ?? 0;
    const pre = value.slice(0, idx);
    const suf = value.slice(idx + m[1].length);
    const decimal = m[1].includes(".");
    const duration = 800;
    const t0 = performance.now();

    const frame = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const cur = target * eased;
      setDisplay(pre + (decimal ? cur.toFixed(1) : String(Math.round(cur))) + suf);
      if (p < 1) requestAnimationFrame(frame);
    };

    requestAnimationFrame(frame);
  }, [value]);

  return (
    <p style={style} suppressHydrationWarning>
      {display}
    </p>
  );
}
