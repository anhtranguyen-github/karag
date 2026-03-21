"use client";

import { cn } from "@/lib/utils";

type PrimaryButtonProps = Readonly<{
  variant?: "primary" | "secondary" | "ghost" | "danger";
  children: React.ReactNode;
  className?: string;
}> &
  React.ButtonHTMLAttributes<HTMLButtonElement>;

const variantStyles: Record<string, string> = {
  primary:
    "bg-orange-500 text-[#e5e5e5] hover:bg-orange-600",
  secondary:
    "border border-[#2a2a2a] bg-[#1a1a1a] text-[#9ca3af] hover:text-[#e5e5e5]",
  ghost:
    "text-[#9ca3af] hover:bg-[#1f1f1f] hover:text-[#e5e5e5]",
  danger:
    "border border-red-800 bg-red-950/50 text-red-400 hover:bg-red-900/50",
};

export function PrimaryButton({
  variant = "primary",
  children,
  className,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={cn(
        "h-8 rounded-lg px-3.5 text-sm font-medium transition-colors",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
