import { postLoginPathForRole } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { workspacePath } from "@/lib/paths";
import { getActiveWorkspaceId, setActiveWorkspace } from "@/lib/workspace-session";

type WorkspaceRow = {
  id: string;
  name: string;
};

/** Chọn workspace đang dùng (nếu còn quyền), hoặc workspace đầu tiên sau khi tenant đăng nhập. */
export async function resolvePostLoginPath(role: string | null | undefined, token: string): Promise<string> {
  const defaultPath = postLoginPathForRole(role);
  if (defaultPath !== "/app/workspaces") return defaultPath;

  try {
    const workspaces = await comviaFetch<WorkspaceRow[]>("/workspaces", { token });
    const activeWorkspaceId = getActiveWorkspaceId();
    const workspace = workspaces.find((item) => item.id === activeWorkspaceId) ?? workspaces[0];
    if (!workspace) return defaultPath;

    try {
      await comviaFetch(`/workspaces/${workspace.id}/switch`, { method: "POST", token });
    } catch {
      // Giữ điều hướng local khi API switch chưa sẵn sàng, cùng hành vi màn danh sách workspace.
    }
    setActiveWorkspace(workspace.id, workspace.name);
    return workspacePath(workspace.id, "dashboard");
  } catch {
    return defaultPath;
  }
}
