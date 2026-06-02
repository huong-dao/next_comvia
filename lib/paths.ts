/** App Router paths under `/app/w/:workspaceId` */
export function workspacePath(workspaceId: string, ...segments: string[]) {
  const clean = segments.map((s) => s.replace(/^\/+|\/+$/g, "")).filter(Boolean);
  return `/app/w/${workspaceId}${clean.length ? `/${clean.join("/")}` : ""}`;
}

export const APP_PATHS = {
  workspaces: "/app/workspaces",
  workspacesNew: "/app/workspaces/new",
  profile: "/app/profile",
  settingsSecurity: "/app/settings/security",
  /** Trang nhận redirect sau Zalo OAuth (`ZALO_OAUTH_SUCCESS_REDIRECT_URL`). */
  settingsOa: "/app/settings/oa",
  admin: "/admin",
  staff: "/staff",
} as const;
