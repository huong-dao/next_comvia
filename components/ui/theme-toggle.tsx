"use client";

import { useEffect, useState } from "react";
import { HiMoon, HiSun } from "react-icons/hi2";
import { cn } from "@/lib/cn";

type ThemeMode = "light" | "dark";

function setTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.toggle("dark", mode === "dark");
  localStorage.setItem("comvia-theme", mode);
}

export function ThemeToggle({
  className,
  iconOnly = false,
}: {
  className?: string;
  iconOnly?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [mode, setMode] = useState<ThemeMode>("light");

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(isDark ? "dark" : "light");
    setMounted(true);
  }, []);

  const toggle = () => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
    setTheme(next);
  };

  if (!mounted) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-surface/70 px-3 text-foreground",
          "pointer-events-none opacity-0",
          iconOnly && "size-13 min-w-10 justify-center p-0",
          className,
        )}
        aria-hidden
        tabIndex={-1}
      >
        <HiMoon className={cn("size-5 text-indigo-400", !iconOnly && "size-4")} aria-hidden />
        {!iconOnly ? <span className="text-sm font-medium">Dark</span> : null}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className={cn(
        "inline-flex h-10 items-center gap-2 rounded-xl border border-border/80 bg-surface/70 px-3 text-foreground transition hover:bg-surface-muted",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        iconOnly && "size-13 min-w-10 justify-center p-0",
        className,
      )}
      aria-label={mode === "dark" ? "Chuyển sang light mode" : "Chuyển sang dark mode"}
      title={mode === "dark" ? "Light mode" : "Dark mode"}
    >
      {mode === "dark" ? (
        <HiMoon className={cn("size-5 text-indigo-400", !iconOnly && "size-4")} aria-hidden="true" />
      ) : (
        <HiSun className={cn("size-5 text-amber-400", !iconOnly && "size-4")} aria-hidden="true" />
      )}
      {!iconOnly ? <span className="text-sm font-medium">{mode === "dark" ? "Dark" : "Light"}</span> : null}
    </button>
  );
}
