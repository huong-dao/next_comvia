import { WorkspaceRedirect } from "@/components/workspace/workspace-redirect";

/** Đích link email "ví sắp hết" (guide 9B.7). */
export default function WalletRedirectPage() {
  return <WorkspaceRedirect segment="wallet" />;
}
