"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { TemplatesReviewPanel } from "@/components/admin/templates-review-panel";

export default function StaffTemplatesReviewRejectedPage() {
  return (
    <StaffRoleGate>
      <TemplatesReviewPanel title="Templates Rejected" status="REJECTED" />
    </StaffRoleGate>
  );
}
