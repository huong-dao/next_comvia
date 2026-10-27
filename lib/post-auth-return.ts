const INVITATION_ACCEPT_PATH = "/app/invitations/accept";

/** Only allow the invitation URL supplied by BE; never redirect auth flows to an arbitrary URL. */
export function getInvitationReturnPath(value: string | null | undefined): string | null {
  if (!value?.startsWith(`${INVITATION_ACCEPT_PATH}?`)) return null;

  const query = value.slice(INVITATION_ACCEPT_PATH.length + 1);
  const params = new URLSearchParams(query);
  return params.get("workspaceId")?.trim() && params.get("token")?.trim() ? value : null;
}

export function invitationAcceptPath(workspaceId: string, token: string): string {
  const params = new URLSearchParams({ workspaceId, token });
  return `${INVITATION_ACCEPT_PATH}?${params.toString()}`;
}
