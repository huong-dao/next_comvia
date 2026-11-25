"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { PageHeader } from "@/components/app/page-header";
import { PageForbidden, PageLoading } from "@/components/app/page-state";
import { LibraryBrowser } from "@/components/template-library/library-browser";
import { TemplateForm } from "@/components/template/template-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { APP_PATHS } from "@/lib/paths";
import { USER_LIBRARY_API, isLibraryUserRole, useStoredRole, type LibraryItem } from "@/lib/template-library";

/**
 * Thư viện mẫu tin (TPLLIB-01) cho USER: xem lưới card + "Sử dụng" → popup "Tạo mẫu tin" điền sẵn.
 * Admin được chuyển sang giao diện quản lý; STAFF không có quyền.
 */
export default function TemplateLibraryPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const role = useStoredRole();
  const { showToast } = useToast();
  const [selected, setSelected] = useState<LibraryItem | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    if (role === "ADMIN") router.replace("/admin/template-library");
  }, [role, router]);

  if (role === null || role === "ADMIN") return <PageLoading />;
  if (!isLibraryUserRole(role)) {
    return <PageForbidden message="Tài khoản của bạn không có quyền dùng thư viện mẫu tin." backHref={APP_PATHS.workspaces} />;
  }

  /** Lấy bản mới nhất của mẫu (popup có thể mở lâu / Admin vừa xóa) rồi mở popup tạo mẫu tin. */
  async function applyItem(item: LibraryItem, refresh: () => void) {
    const token = getAccessToken();
    if (!token) return;
    setBusyId(item.id);
    try {
      setSelected(await comviaFetch<LibraryItem>(`${USER_LIBRARY_API}/items/${item.id}`, { token }));
    } catch (error) {
      if (error instanceof ComviaApiError && error.statusCode === 404) {
        showToast({ type: "error", message: "Mẫu tin không còn tồn tại" });
        refresh();
      } else {
        showToast({ type: "error", message: formatComviaError(error, "Không tải được mẫu tin.") });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        eyebrow="Templates"
        title="Thư viện mẫu tin"
        description="Chọn một mẫu có sẵn để điền vào form tạo mẫu tin, sau đó chỉnh sửa và lưu theo ý bạn."
      />
      <LibraryBrowser
        apiBase={USER_LIBRARY_API}
        workspaceId={workspaceId}
        limit={12}
        renderActions={(item, refresh) => (
          <Button size="sm" disabled={busyId !== null} onClick={() => void applyItem(item, refresh)}>
            {busyId === item.id ? "Đang tải…" : "Sử dụng"}
          </Button>
        )}
      />
      <Modal size="full" open={selected !== null} title="Tạo mẫu tin" onClose={() => setSelected(null)}>
        {selected ? (
          <TemplateForm
            key={selected.id}
            workspaceId={workspaceId}
            initialLibraryItem={selected}
            onCreated={(_, { submitted }) => {
              showToast({ type: "success", message: submitted ? "Đã gửi mẫu tin để Staff xử lý." : "Đã lưu mẫu tin." });
              if (submitted) setSelected(null);
            }}
            onCancel={() => setSelected(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
