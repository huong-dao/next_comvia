"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";
import { WorkspaceForm, type WorkspaceFormResult } from "@/components/workspace/workspace-form";
import { comviaFetch } from "@/lib/comviaFetch";
import { getAccessToken } from "@/lib/auth";
import { workspacePath } from "@/lib/paths";
import { notifyWorkspacesListChanged, setActiveWorkspace } from "@/lib/workspace-session";

export default function NewWorkspacePage() {
  const router = useRouter();

  async function handleCreated(ws: WorkspaceFormResult) {
    const token = getAccessToken();
    if (token) {
      try {
        await comviaFetch(`/workspaces/${ws.id}/switch`, { method: "POST", token });
      } catch {
        /* vẫn điều hướng nếu switch lỗi */
      }
    }

    setActiveWorkspace(ws.id, ws.name ?? "");
    notifyWorkspacesListChanged();
    router.push(workspacePath(ws.id, "dashboard"));
  }

  return (
    <div>
      <PageHeader
        eyebrow="Workspace"
        title="Tạo workspace mới"
        description="Tạo workspace và khai báo billing info ngay từ đầu để sẵn sàng topup và xuất hóa đơn."
      />

      <div className="mx-auto max-w-3xl">
        <Card>
          <WorkspaceForm mode="create" onSubmitted={handleCreated} />
        </Card>
      </div>
    </div>
  );
}
