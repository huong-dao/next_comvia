"use client";

import { StaffRoleGate } from "@/components/admin/role-gate";
import { TemplatesReviewPanel } from "@/components/admin/templates-review-panel";

export default function StaffTemplatesReviewDisabledPage() {
  return (
    <StaffRoleGate>
      <TemplatesReviewPanel title="Templates Disabled" status="DISABLED" />
    </StaffRoleGate>
  );
}
