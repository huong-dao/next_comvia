"use client";

import { AdminRoleGate } from "@/components/admin/role-gate";
import { InternalQuickChatPlayground } from "@/components/admin/internal-quick-chat-playground";

export default function AdminInternalQuickChatPage() {
  return (
    <AdminRoleGate>
      <InternalQuickChatPlayground roleLabel="ADMIN" />
    </AdminRoleGate>
  );
}
