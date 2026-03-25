import type { ReactNode } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/cn";

export function PageLoading({ message = "Đang tải…" }: { message?: string }) {
  return (
    <Card className="flex min-h-[200px] flex-col items-center justify-center gap-3">
      <div
        className="size-9 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary"
        aria-hidden
      />
      <p className="text-sm text-muted-foreground">{message}</p>
    </Card>
  );
}

export function PageError({
  message,
  onRetry,
  className,
}: {
  message: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <Card className={cn("border-danger/40 bg-danger/5", className)}>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {onRetry ? (
        <div className="mt-4">
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Thử lại
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export function PageEmpty({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Card className="flex flex-col items-center justify-center py-12 text-center">
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description ? <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </Card>
  );
}

export function PageForbidden({
  message = "Bạn không đủ quyền xem nội dung này.",
  backHref,
}: {
  message?: string;
  backHref?: string;
}) {
  return (
    <Card className="border-border">
      <p className="text-sm font-medium text-foreground">{message}</p>
      {backHref ? (
        <div className="mt-4">
          <Link
            href={backHref}
            className="inline-flex h-9 items-center justify-center rounded-xl bg-secondary px-3 text-sm font-medium text-slate-800 transition-all hover:brightness-110 dark:text-slate-950"
          >
            Quay lại
          </Link>
        </div>
      ) : null}
    </Card>
  );
}
