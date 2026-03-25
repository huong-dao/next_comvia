"use client";

import { useParams } from "next/navigation";
import { StaffRoleGate } from "@/components/admin/role-gate";
import { StaffTemplateReviewDetail } from "@/components/admin/staff-template-review-detail";

export default function StaffTemplateReviewOaPage() {
  const params = useParams();
  const templateId = params.templateId as string;

  return (
    <StaffRoleGate>
      <StaffTemplateReviewDetail templateId={templateId} section="oa" />
    </StaffRoleGate>
  );
}
