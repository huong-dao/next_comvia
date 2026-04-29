"use client";

import * as React from "react";
import { HiOutlineChevronUpDown, HiOutlineXMark } from "react-icons/hi2";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";

export type SearchableSelectOption = {
  value: string;
  label: string;
  description?: string;
};

export type SearchableSelectProps = {
  id?: string;
  options: SearchableSelectOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  "aria-label"?: string;
};

function normalize(s: string) {
  return s.trim().toLowerCase();
}

export function SearchableSelect({
  id,
  options,
  value,
  onValueChange,
  placeholder = "Chọn…",
  emptyText = "Không có mục phù hợp.",
  disabled = false,
  className,
  "aria-label": ariaLabel,
}: SearchableSelectProps) {
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [highlight, setHighlight] = React.useState(0);

  const selected = React.useMemo(() => options.find((o) => o.value === value), [options, value]);

  const filtered = React.useMemo(() => {
    const q = normalize(query);
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.description ?? ""} ${o.value}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  React.useEffect(() => {
    if (!open) return;
    setHighlight(0);
  }, [open, query, filtered.length]);

  React.useEffect(() => {
    function onDocPointerDown(e: MouseEvent) {
      const el = rootRef.current;
      if (!el || !open) return;
      if (e.target instanceof Node && !el.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("pointerdown", onDocPointerDown);
    return () => document.removeEventListener("pointerdown", onDocPointerDown);
  }, [open]);

  function pick(next: string) {
    onValueChange(next);
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        setOpen(true);
      }
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      setQuery("");
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(filtered.length - 1, h + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(0, h - 1));
      return;
    }
    if (e.key === "Enter" && filtered[highlight]) {
      e.preventDefault();
      pick(filtered[highlight].value);
    }
  }

  return (
    <div ref={rootRef} className={cn("relative w-full", className)}>
      <div
        className={cn(
          "flex min-h-11 w-full items-center gap-1 rounded-xl border border-border bg-surface-muted px-2 transition focus-within:!border-primary dark:focus-within:!border-primary",
          disabled && "cursor-not-allowed opacity-60",
        )}
      >
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          aria-expanded={open}
          aria-controls={id ? `${id}-listbox` : undefined}
          aria-label={ariaLabel}
          aria-autocomplete="list"
          disabled={disabled}
          placeholder={open ? "Gõ để tìm…" : selected ? selected.label : placeholder}
          value={open ? query : selected ? selected.label : ""}
          readOnly={!open}
          onChange={(e) => {
            if (!open) return;
            setQuery(e.target.value);
          }}
          onFocus={() => {
            if (disabled) return;
            setOpen(true);
            setQuery("");
          }}
          onKeyDown={onKeyDown}
          className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-2 text-sm text-foreground outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
        />
        {value && !disabled ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="shrink-0 px-1 text-muted-foreground hover:text-foreground"
            title="Bỏ chọn"
            aria-label="Bỏ chọn"
            icon={<HiOutlineXMark className="size-4" />}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onValueChange("")}
          />
        ) : null}
        <span className="pointer-events-none shrink-0 text-muted-foreground" aria-hidden>
          <HiOutlineChevronUpDown className="size-4" />
        </span>
      </div>

      {open && !disabled ? (
        <ul
          id={id ? `${id}-listbox` : undefined}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          {filtered.length === 0 ? (
            <li className="px-3 py-2 text-sm text-muted-foreground">{emptyText}</li>
          ) : (
            filtered.map((opt, i) => (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={opt.value === value}
                  className={cn(
                    "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition hover:bg-surface-muted",
                    i === highlight && "bg-surface-muted",
                    opt.value === value && "font-medium",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => pick(opt.value)}
                >
                  <span className="text-foreground">{opt.label}</span>
                  {opt.description ? (
                    <span className="text-xs text-muted-foreground">{opt.description}</span>
                  ) : null}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
