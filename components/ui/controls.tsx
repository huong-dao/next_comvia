import * as React from "react";
import { cn } from "@/lib/cn";

export function Switch({
  checked,
  onCheckedChange,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border border-transparent transition",
        checked ? "bg-primary" : "bg-surface-muted border-border",
      )}
      aria-pressed={checked}
    >
      <span
        className={cn(
          "inline-block size-5 rounded-full bg-white transition",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

export function Checkbox({
  checked,
  onCheckedChange,
  label,
  allowWrap = false,
}: {
  checked: boolean;
  onCheckedChange: (value: boolean) => void;
  label: string;
  allowWrap?: boolean;
}) {
  return (
    <label
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 text-sm text-foreground",
        allowWrap ? "whitespace-normal leading-6" : "whitespace-nowrap leading-none",
      )}
    >
      <button
        type="button"
        aria-pressed={checked}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition",
          checked ? "border-primary bg-primary text-slate-950" : "border-border bg-transparent",
        )}
      >
        <svg
          viewBox="0 0 20 20"
          className={cn("size-3.5 transition-opacity", checked ? "opacity-100" : "opacity-0")}
          fill="none"
          aria-hidden="true"
        >
          <path
            d="m4.5 10.5 3.4 3.4 7.6-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
      <span>{label}</span>
    </label>
  );
}

export function Radio({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: () => void;
  label: string;
}) {
  return (
    <label className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap text-sm leading-none text-foreground">
      <button
        type="button"
        onClick={onCheckedChange}
        className={cn(
          "inline-flex size-5 shrink-0 items-center justify-center rounded-full border transition",
          checked ? "border-primary" : "border-border",
        )}
      >
        <span className={cn("size-2.5 rounded-full transition-colors", checked ? "bg-primary" : "bg-transparent")} />
      </button>
      <span>{label}</span>
    </label>
  );
}
