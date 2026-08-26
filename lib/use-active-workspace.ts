"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  ACTIVE_WORKSPACE_CHANGED_EVENT,
  getActiveWorkspaceId,
  getActiveWorkspaceName,
  resolveWorkspaceIdFromPath,
} from "@/lib/workspace-session";

export function useActiveWorkspace() {
  const pathname = usePathname();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState("");
  const [activeWorkspaceName, setActiveWorkspaceName] = useState("");

  useEffect(() => {
    function syncActiveWorkspace() {
      const workspaceFromUrl = resolveWorkspaceIdFromPath(pathname);
      if (workspaceFromUrl) {
        setActiveWorkspaceId(workspaceFromUrl);
        setActiveWorkspaceName(getActiveWorkspaceName() ?? "");
        return;
      }

      setActiveWorkspaceId(getActiveWorkspaceId() ?? "");
      setActiveWorkspaceName(getActiveWorkspaceName() ?? "");
    }

    syncActiveWorkspace();
    window.addEventListener(ACTIVE_WORKSPACE_CHANGED_EVENT, syncActiveWorkspace);
    return () => {
      window.removeEventListener(ACTIVE_WORKSPACE_CHANGED_EVENT, syncActiveWorkspace);
    };
  }, [pathname]);

  return { activeWorkspaceId, activeWorkspaceName };
}
