"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" | "quiet"; children: ReactNode };

export function Button({ variant = "ghost", className = "", children, ...rest }: BtnProps) {
  const base =
    "inline-flex items-center justify-center gap-2 min-h-[40px] px-4 rounded-[8px] text-[15px] font-medium transition-colors duration-150 disabled:opacity-40 disabled:cursor-not-allowed";
  const styles =
    variant === "primary"
      ? "bg-copper text-[#0B1016] hover:bg-[#d68b66]"
      : variant === "quiet"
        ? "text-muted hover:text-ink"
        : "border border-hairline bg-surface/90 text-ink hover:border-[#3d4a57]";
  return (
    <button type="button" className={`${base} ${styles} ${className}`} {...rest}>
      {children}
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "md",
}: {
  value: T;
  options: { value: T; label: string; title?: string }[];
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-[8px] border border-hairline bg-surface/90 p-[3px]">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            title={o.title}
            onClick={() => onChange(o.value)}
            className={`rounded-[6px] ${size === "sm" ? "px-3 min-h-[32px] text-[14px]" : "px-4 min-h-[36px] text-[15px]"} font-medium transition-colors duration-150 ${
              on ? "bg-[#2a3540] text-ink shadow-[inset_0_0_0_1px_#C97951]" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "copper" | "earth" }) {
  const c = tone === "copper" ? "border-copper/70 text-[#e3a585]" : tone === "earth" ? "border-earth/70 text-[#9cc3d1]" : "border-hairline text-muted";
  return <span className={`inline-flex items-center rounded-[6px] border px-2 py-[2px] text-[14px] leading-tight ${c}`}>{children}</span>;
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[8px] border border-hairline bg-surface/92 backdrop-blur-[2px] ${className}`}>{children}</div>;
}

export function NotAvailable({ what, detail }: { what: string; detail?: string }) {
  return (
    <div className="rounded-[8px] border border-dashed border-hairline p-4 text-[15px] text-muted">
      <p className="text-ink">{what} not available yet.</p>
      <p className="mt-1">{detail ?? "The science pipeline has not published this file. Nothing is shown in its place."}</p>
    </div>
  );
}
