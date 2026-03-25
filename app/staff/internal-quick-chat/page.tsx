"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { InternalQuickChatPlayground } from "@/components/admin/internal-quick-chat-playground";

export default function StaffInternalQuickChatPage() {
  return (
    <StaffRoleGate>
      <InternalQuickChatPlayground roleLabel="STAFF" />
    </StaffRoleGate>
  );
}
