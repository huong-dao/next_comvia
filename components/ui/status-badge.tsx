import { cn } from "@/lib/cn";

type StatusTone = "active" | "pending" | "error" | "neutral";

const toneClasses: Record<StatusTone, string> = {
  active: "bg-success/20 text-success",
  pending: "bg-accent/25 text-accent",
  error: "bg-danger/20 text-danger",
  neutral: "bg-surface-muted text-muted-foreground",
};

export function StatusBadge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
