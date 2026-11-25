"use client";

import { useState } from "react";
import { HiMiniPlus, HiOutlinePencilSquare, HiOutlineRectangleStack, HiOutlineTrash } from "react-icons/hi2";
import { AdminRoleGate } from "@/components/admin/role-gate";
import { PageHeader } from "@/components/app/page-header";
import { LibraryBrowser } from "@/components/template-library/library-browser";
import { LibraryCategoryManager } from "@/components/template-library/library-category-manager";
import { LibraryItemForm } from "@/components/template-library/library-item-form";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { ADMIN_LIBRARY_API, type LibraryItem } from "@/lib/template-library";

/** Admin quản lý thư viện mẫu tin (TPLLIB-01): thêm/sửa/xóa mẫu tin + danh mục. */
export default function AdminTemplateLibraryPage() {
  return (
    <AdminRoleGate>
      <Content />
    </AdminRoleGate>
  );
}

type FormState = { open: boolean; item: LibraryItem | null };

function Content() {
  const { showToast } = useToast();
  const [reloadToken, setReloadToken] = useState(0);
  const [form, setForm] = useState<FormState>({ open: false, item: null });
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [deleting, setDeleting] = useState<LibraryItem | null>(null);
  const [busy, setBusy] = useState(false);

  const reload = () => setReloadToken((value) => value + 1);

  /** "Sửa": lấy bản mới nhất; 404 (vừa bị xóa) → toast + tải lại. */
  async function openEdit(item: LibraryItem) {
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      const latest = await comviaFetch<LibraryItem>(`${ADMIN_LIBRARY_API}/items/${item.id}`, { token });
      setForm({ open: true, item: latest });
    } catch (error) {
      if (error instanceof ComviaApiError && error.statusCode === 404) {
        showToast({ type: "error", message: "Mẫu tin không còn tồn tại" });
        reload();
      } else {
        showToast({ type: "error", message: formatComviaError(error, "Không tải được mẫu tin.") });
      }
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await comviaFetch(`${ADMIN_LIBRARY_API}/items/${deleting.id}`, { method: "DELETE", token });
      showToast({ type: "success", message: "Đã xóa mẫu tin." });
      setDeleting(null);
      reload();
    } catch (error) {
      if (error instanceof ComviaApiError && error.statusCode === 404) {
        showToast({ type: "error", message: "Mẫu tin không còn tồn tại" });
        setDeleting(null);
        reload();
      } else {
        showToast({ type: "error", message: formatComviaError(error, "Không xóa được mẫu tin.") });
      }
    } finally {
      setBusy(false);
    }
  }

  const addButton = (
    <Button icon={<HiMiniPlus className="size-4" />} onClick={() => setForm({ open: true, item: null })}>
      Thêm mẫu tin
    </Button>
  );

  return (
    <div>
      <PageHeader
        eyebrow="Admin"
        title="Thư viện mẫu tin"
        description="Quản lý mẫu tin tham khảo dùng chung cho mọi workspace. Sửa/xóa mẫu không ảnh hưởng mẫu tin user đã tạo."
        actions={
          <>
            <Button variant="outline" icon={<HiOutlineRectangleStack className="size-4" />} onClick={() => setCategoriesOpen(true)}>
              Quản lý danh mục
            </Button>
            {addButton}
          </>
        }
      />

      <LibraryBrowser
        apiBase={ADMIN_LIBRARY_API}
        limit={12}
        reloadToken={reloadToken}
        emptyAction={addButton}
        renderActions={(item) => (
          <>
            <Button size="sm" variant="outline" icon={<HiOutlinePencilSquare className="size-4" />} disabled={busy} onClick={() => void openEdit(item)}>
              Sửa
            </Button>
            <Button size="sm" variant="outline" className="hover:text-danger" icon={<HiOutlineTrash className="size-4" />} disabled={busy} onClick={() => setDeleting(item)}>
              Xóa
            </Button>
          </>
        )}
      />

      <Modal
        size="full"
        open={form.open}
        title={form.item ? "Sửa mẫu tin thư viện" : "Thêm mẫu tin thư viện"}
        onClose={() => setForm({ open: false, item: null })}
        footer={<span />}
      >
        {form.open ? (
          <LibraryItemForm
            key={form.item?.id ?? "new"}
            item={form.item}
            onCancel={() => setForm({ open: false, item: null })}
            onSaved={() => {
              showToast({ type: "success", message: form.item ? "Đã cập nhật mẫu tin." : "Đã thêm mẫu tin." });
              setForm({ open: false, item: null });
              reload();
            }}
          />
        ) : null}
      </Modal>

      <Modal size="xl" open={categoriesOpen} title="Quản lý danh mục" onClose={() => setCategoriesOpen(false)}>
        <LibraryCategoryManager onChanged={reload} />
      </Modal>

      <Modal
        open={deleting !== null}
        title="Xóa mẫu tin"
        onClose={() => (busy ? undefined : setDeleting(null))}
        footer={
          <>
            <Button variant="ghost" disabled={busy} onClick={() => setDeleting(null)}>
              Hủy
            </Button>
            <Button variant="accent" disabled={busy} onClick={() => void confirmDelete()}>
              {busy ? "Đang xóa…" : "Xóa"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-foreground">Bạn có chắc muốn xóa mẫu tin này?</p>
        {deleting ? <p className="text-sm text-muted-foreground">“{deleting.name}” sẽ bị xóa hẳn khỏi thư viện.</p> : null}
      </Modal>
    </div>
  );
}
