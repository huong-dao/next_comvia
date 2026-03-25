"use client";

import { PageHeader } from "@/components/app/page-header";
import { Card } from "@/components/ui/card";

export default function WorkspaceAnalyticsPage() {
  return (
    <div>
      <PageHeader
        eyebrow="Analytics"
        title="Analytics"
        description="Màn analytics theo layout gốc — bổ sung biểu đồ & API khi có số liệu workspace."
      />
      <Card>
        <p className="text-sm text-muted-foreground">
          Chưa có endpoint tổng hợp analytics trong tài liệu API hiện tại. Tạm thời dùng Dashboard và nhật ký tin để theo dõi hoạt động.
        </p>
      </Card>
    </div>
  );
}
