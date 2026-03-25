"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { TemplatesReviewPanel } from "@/components/admin/templates-review-panel";

export default function StaffTemplatesReviewApprovedPage() {
  return (
    <StaffRoleGate>
      <TemplatesReviewPanel title="Templates Approved" status="APPROVED" />
    </StaffRoleGate>
  );
}
