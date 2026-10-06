import React from "react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label?: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  sub?: React.ReactNode;
  header?: React.ReactNode;
  accent?: boolean;
  variant?: "default" | "primary-border";
  align?: "left" | "center";
  labelPosition?: "top" | "bottom";
}

export default function StatCard({
  label,
  value,
  icon: Icon,
  sub,
  header,
  accent,
  variant = "default",
  align = "left",
  labelPosition = "top",
}: StatCardProps) {
  const isCenter = align === "center";
  const labelNode = label ? (
    <p
      className={`text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500 ${labelPosition === "top" ? "mb-2" : "mt-1"}`}
    >
      {label}
    </p>
  ) : null;

  return (
    <div
      className={
        "bg-white p-4 rounded-2xl " +
        (variant === "primary-border"
          ? "border border-[var(--color-primary)]/10"
          : "border border-slate-200 shadow-sm") +
        (isCenter
          ? " flex flex-col items-center justify-center text-center"
          : "")
      }
    >
      {Icon && <Icon className="w-5 h-5 text-[var(--color-primary)] mb-1" />}
      {header}
      {labelPosition === "top" && labelNode}
      <div
        className={
          "text-2xl font-bold font-display " +
          (accent
            ? "text-[var(--color-primary)]"
            : "text-[var(--color-text-main)]")
        }
      >
        {value}
      </div>
      {labelPosition === "bottom" && labelNode}
      {sub && <p className="text-[9px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}
