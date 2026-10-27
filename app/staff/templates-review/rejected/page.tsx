"use client";

import { redirect } from "next/navigation";

export default function StaffTemplatesReviewRejectedPage() {
  redirect("/staff/templates-review/submitted");
}
