"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HiOutlineExclamationTriangle } from "react-icons/hi2";
import { useOptionalSubscription } from "@/components/subscription/subscription-provider";
import { workspacePath } from "@/lib/paths";
import { EXPIRING_SOON_DAYS, formatDateOnly } from "@/lib/subscription";
import { cn } from "@/lib/cn";

/**
 * Banner theo `status` của `GET /subscriptions/current` (handoff — "Banner gợi ý").
 * Chỉ dựa vào `status`: kỳ `UPCOMING` được `/current` trả `NONE` (ISSUE-010), chưa có UI riêng.
 * Chỉ OWNER mới mua được nên member chỉ thấy lời nhắc liên hệ chủ sở hữu, không có nút.
 */
export function SubscriptionBanner({ workspaceId, owner }: { workspaceId: string; owner: boolean }) {
  const pathname = usePathname();
  const subscription = useOptionalSubscription();
  const current = subscription?.current;

  if (!current) return null;

  const subscriptionPath = workspacePath(workspaceId, "subscription");
  // Trang gói tự hiển thị trạng thái đầy đủ, không lặp banner.
  if (pathname.startsWith(subscriptionPath)) return null;

  let tone: "warning" | "danger" | null = null;
  let message = "";
  let action = "";

  if (current.status === "NONE") {
    tone = "danger";
    message = "Workspace chưa đăng ký gói dịch vụ nên chưa gửi được tin.";
    action = "Mua gói";
  } else if (current.status === "EXPIRED") {
    tone = "danger";
    message = `Gói dịch vụ đã hết hạn${current.expiredAt ? ` từ ${formatDateOnly(current.expiredAt)}` : ""} nên chưa gửi được tin.`;
    action = "Gia hạn";
  } else if (current.status === "ACTIVE" && current.daysRemaining != null && current.daysRemaining <= EXPIRING_SOON_DAYS) {
    tone = "warning";
    message =
      current.daysRemaining <= 0
        ? "Gói dịch vụ hết hạn trong hôm nay."
        : `Gói dịch vụ sắp hết hạn, còn ${current.daysRemaining} ngày.`;
    action = "Gia hạn";
  }

  if (!tone) return null;

  return (
    <div
      role="status"
      className={cn(
        "mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border px-4 py-2.5 text-sm",
        tone === "danger"
          ? "border-danger/40 bg-danger/10 text-foreground"
          : "border-amber-400/60 bg-amber-50 text-amber-900",
      )}
    >
      <p className="flex items-center gap-2">
        <HiOutlineExclamationTriangle className="size-5 shrink-0" aria-hidden />
        <span>
          {message}
          {owner ? null : " Liên hệ chủ sở hữu workspace để mua hoặc gia hạn gói."}
        </span>
      </p>
      {owner ? (
        <Link
          href={subscriptionPath}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-white transition hover:bg-primary-hover dark:text-slate-950"
        >
          {action}
        </Link>
      ) : null}
    </div>
  );
}
