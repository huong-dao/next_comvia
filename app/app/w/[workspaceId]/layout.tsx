import { WorkspaceGate } from "@/components/workspace/workspace-gate";

export default function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceGate>{children}</WorkspaceGate>;
}
