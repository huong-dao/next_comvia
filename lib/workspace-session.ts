export const COMVIA_ACTIVE_WORKSPACE_ID_KEY = "comvia_active_workspace_id";
export const COMVIA_ACTIVE_WORKSPACE_NAME_KEY = "comvia_active_workspace_name";

export const ACTIVE_WORKSPACE_CHANGED_EVENT = "comvia:active-workspace-changed";
export const WORKSPACES_LIST_CHANGED_EVENT = "comvia:workspaces-list-changed";

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getActiveWorkspaceId() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(COMVIA_ACTIVE_WORKSPACE_ID_KEY);
}

export function getActiveWorkspaceName() {
  if (!canUseStorage()) return null;
  return window.localStorage.getItem(COMVIA_ACTIVE_WORKSPACE_NAME_KEY);
}

export function setActiveWorkspace(workspaceId: string, workspaceName?: string) {
  if (!canUseStorage()) return;

  window.localStorage.setItem(COMVIA_ACTIVE_WORKSPACE_ID_KEY, workspaceId);
  if (workspaceName) {
    window.localStorage.setItem(COMVIA_ACTIVE_WORKSPACE_NAME_KEY, workspaceName);
  }

  window.dispatchEvent(new Event(ACTIVE_WORKSPACE_CHANGED_EVENT));
}

export function clearActiveWorkspace() {
  if (!canUseStorage()) return;

  window.localStorage.removeItem(COMVIA_ACTIVE_WORKSPACE_ID_KEY);
  window.localStorage.removeItem(COMVIA_ACTIVE_WORKSPACE_NAME_KEY);
  window.dispatchEvent(new Event(ACTIVE_WORKSPACE_CHANGED_EVENT));
}

export function notifyWorkspacesListChanged() {
  if (!canUseStorage()) return;
  window.dispatchEvent(new Event(WORKSPACES_LIST_CHANGED_EVENT));
}

export function resolveWorkspaceIdFromPath(pathname: string) {
  return pathname.match(/\/app\/w\/([^/]+)/)?.[1] ?? "";
}
