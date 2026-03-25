import { redirect } from "next/navigation";

/** Duyệt template chỉ STAFF + API internal — `FRONTEND_SITEMAP_ADMIN_STAFF.mdc` §1, §6. */
export default function AdminTemplatesReviewRedirectPage() {
  return redirect("/staff/templates-review/submitted");
}
