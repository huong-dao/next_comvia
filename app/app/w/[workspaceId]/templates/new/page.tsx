"use client";

import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { TemplateForm } from "@/components/template/template-form";
import { workspacePath } from "@/lib/paths";

export default function NewTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Tạo mẫu tin nhắn mới"
      />

      <TemplateForm
        workspaceId={workspaceId}
        onCreated={(tpl, { submitted }) => {
          router.push(
            submitted
              ? workspacePath(workspaceId, "templates", tpl.id)
              : workspacePath(workspaceId, "templates"),
          );
        }}
        onCancel={() => router.push(workspacePath(workspaceId, "templates"))}
      />
    </div>
  );
}
