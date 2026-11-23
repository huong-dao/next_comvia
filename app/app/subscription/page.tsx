import { WorkspaceRedirect } from "@/components/workspace/workspace-redirect";

/** Đích link email nhắc hết hạn (guide 9B.7). */
export default function SubscriptionRedirectPage() {
  return <WorkspaceRedirect segment="subscription" />;
}
