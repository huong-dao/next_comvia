"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { TemplatesReviewPanel } from "@/components/admin/templates-review-panel";

export default function StaffTemplatesReviewSubmittedPage() {
  return (
    <StaffRoleGate>
      <TemplatesReviewPanel title="Templates Submitted" status="SUBMITTED" />
    </StaffRoleGate>
  );
}
