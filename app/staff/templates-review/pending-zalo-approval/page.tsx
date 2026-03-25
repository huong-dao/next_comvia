"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { TemplatesReviewPanel } from "@/components/admin/templates-review-panel";

export default function StaffTemplatesReviewPendingPage() {
  return (
    <StaffRoleGate>
      <TemplatesReviewPanel title="Templates Pending Zalo Approval" status="PENDING_ZALO_APPROVAL" />
    </StaffRoleGate>
  );
}
