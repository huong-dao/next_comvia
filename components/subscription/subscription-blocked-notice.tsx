import Link from "next/link";
import { Card } from "@/components/ui/card";
import { workspacePath } from "@/lib/paths";

/**
 * Thông báo khi server chặn gửi tin vì `SUBSCRIPTION_REQUIRED` / `SUBSCRIPTION_EXPIRED` (guide 9B.6):
 * hiện nguyên `message` của BE + đường dẫn tới trang gói. Chỉ OWNER mua được nên member chỉ thấy lời nhắc.
 */
export function SubscriptionBlockedNotice({
  message,
  workspaceId,
  owner,
  className,
}: {
  message: string;
  workspaceId: string;
  owner: boolean;
  className?: string;
}) {
  return (
    <Card role="alert" className={`space-y-2 border-danger/40 bg-danger/5 ${className ?? ""}`}>
      <p className="text-sm font-medium text-foreground">{message}</p>
      {owner ? (
        <Link
          href={workspacePath(workspaceId, "subscription")}
          className="inline-flex h-9 items-center justify-center rounded-xl bg-primary px-3 text-sm font-medium text-white transition hover:bg-primary-hover dark:text-slate-950"
        >
          Mua / gia hạn gói
        </Link>
      ) : (
        <p className="text-sm text-muted-foreground">Liên hệ chủ sở hữu workspace để mua hoặc gia hạn gói.</p>
      )}
    </Card>
  );
}
