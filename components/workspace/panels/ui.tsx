"use client";

import type { ReactNode } from "react";

// Shared presentation primitives for the workspace panels. No numbers are produced here.

export const ACTIVE_GLOW = "0 0 0 1px #c66a4b, 0 0 18px rgba(198,106,75,0.25)";

type IconName =
  | "bars"
  | "relief"
  | "slope"
  | "elongation"
  | "rank"
  | "check"
  | "spark"
  | "rover"
  | "profile"
  | "link"
  | "info";

/** Small line icons (stroke = currentColor). */
export function Icon({ name, className = "h-4 w-4" }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "bars":
      return (
        <svg {...common}>
          <path d="M4 20h16" />
          <path d="M7 16v-5M12 16V6M17 16v-8" />
        </svg>
      );
    case "relief":
      return (
        <svg {...common}>
          <path d="M3 19l6-9 4 5 3-4 5 8z" />
          <path d="M9 10l1.5 2.2" />
        </svg>
      );
    case "slope":
      return (
        <svg {...common}>
          <path d="M3 19h18L3 7z" />
          <path d="M8 19a5 5 0 00-1.6-3.7" />
        </svg>
      );
    case "elongation":
      return (
        <svg {...common}>
          <path d="M3 8c4-2 8-2 18 0M3 12c5-2 10-2 18 0M3 16c4-2 8-2 18 0" />
        </svg>
      );
    case "rank":
      return (
        <svg {...common}>
          <path d="M4 6h10M4 12h7M4 18h4" />
          <path d="M18 5v14M15 16l3 3 3-3" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <rect x="4" y="4" width="16" height="16" rx="3" />
          <path d="M8 12.5l2.5 2.5L16 9.5" />
        </svg>
      );
    case "spark":
      return (
        <svg {...common}>
          <path d="M12 4v4M12 16v4M4 12h4M16 12h4M6.5 6.5l2.5 2.5M15 15l2.5 2.5M6.5 17.5L9 15M15 9l2.5-2.5" />
        </svg>
      );
    case "rover":
      return (
        <svg {...common}>
          <rect x="5" y="8" width="14" height="6" rx="1.5" />
          <path d="M9 8V5h4" />
          <circle cx="7.5" cy="17.5" r="2" />
          <circle cx="16.5" cy="17.5" r="2" />
          <path d="M12 14v1.5" />
        </svg>
      );
    case "profile":
      return (
        <svg {...common}>
          <path d="M3 17l4-6 4 3 4-7 6 10" />
          <path d="M3 20h18" />
        </svg>
      );
    case "link":
      return (
        <svg {...common}>
          <path d="M9 6h9v9" />
          <path d="M18 6L7 17" />
        </svg>
      );
    case "info":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 11v5M12 8h.01" />
        </svg>
      );
  }
}

export function PanelTitle({ icon, title, sub, right }: { icon: IconName; title: string; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="mt-[3px] text-copper">
        <Icon name={icon} className="h-[18px] w-[18px]" />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="font-display text-[18px] font-semibold uppercase leading-tight tracking-[0.02em] text-ink">{title}</h2>
        {sub ? <p className="mt-1 text-[13px] leading-snug text-muted">{sub}</p> : null}
      </div>
      {right}
    </div>
  );
}

export function MicroLabel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <p className={`text-[11px] font-medium uppercase tracking-[0.14em] text-muted ${className}`}>{children}</p>;
}

export function SectionLabel({ icon, children, right }: { icon?: IconName; children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      {icon ? (
        <span className="text-copper">
          <Icon name={icon} className="h-[15px] w-[15px]" />
        </span>
      ) : null}
      <h3 className="flex-1 font-display text-[14px] font-semibold uppercase tracking-[0.06em] text-ink">{children}</h3>
      {right}
    </div>
  );
}

/** Pill tabs: active item is copper-filled. */
export function PillTabs<T extends string>({
  items,
  value,
  onChange,
  label,
  size = "md",
}: {
  items: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  size?: "sm" | "md";
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex max-w-full gap-1 rounded-full border border-hairline bg-[#0d1218] p-[3px]">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={`whitespace-nowrap rounded-full font-medium uppercase transition-colors duration-200 motion-reduce:transition-none ${
              size === "sm" ? "px-3 py-[5px] text-[11px] tracking-[0.1em]" : "px-3.5 py-[6px] text-[12px] tracking-[0.12em]"
            } ${active ? "bg-copper text-[#140c08]" : "text-muted hover:bg-white/[0.04] hover:text-ink"}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}

/** Segmented control (outline style), used for secondary toggles. */
export function Segmented<T extends string>({
  items,
  value,
  onChange,
  label,
}: {
  items: { id: T; label: string }[];
  value: T | null;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex overflow-hidden rounded-[8px] border border-hairline bg-[#0d1218]">
      {items.map((it, i) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(it.id)}
            className={`whitespace-nowrap px-3 py-[6px] text-[13px] font-medium transition-colors duration-200 motion-reduce:transition-none ${
              i > 0 ? "border-l border-hairline" : ""
            } ${active ? "bg-copper/15 text-copper-light" : "text-muted hover:bg-white/[0.04] hover:text-ink"}`}
          >
            {it.label}
          </button>
        );
      })}
    </div>
  );
}
