"use client";

import { PageHeader } from "@/components/app/page-header";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { Card } from "@/components/ui/card";

export default function AdminSystemHealthPage() {
  return (
    <AdminRoleGate>
      <PageHeader title="System health" description="Placeholder theo sitemap — chưa có API health check." />
      <Card>
        <p className="text-sm text-muted-foreground">
          Kết nối backend qua biến môi trường NEXT_PUBLIC_API_BASE_URL. Bổ sung probe khi có endpoint health.
        </p>
      </Card>
    </AdminRoleGate>
  );
}
