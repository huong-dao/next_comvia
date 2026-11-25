"use client";

import { useCallback, useState } from "react";
import { HiOutlinePencilSquare, HiOutlinePlus, HiOutlineTrash } from "react-icons/hi2";
import { PageError, PageLoading } from "@/components/app/page-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SimpleTable } from "@/components/ui/simple-table";
import { useToast } from "@/components/ui/toast";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { comviaFetch } from "@/lib/comviaFetch";
import { ADMIN_LIBRARY_API, buildLibraryQuery, type LibraryCategory, type LibraryList } from "@/lib/template-library";
import { useComviaQuery } from "@/lib/use-comvia-query";

type Draft = { id: string | null; name: string; description: string; sortOrder: string };
const emptyDraft = (): Draft => ({ id: null, name: "", description: "", sortOrder: "0" });

/** Quản lý danh mục thư viện (Admin): danh sách + thêm/sửa/xóa. Xóa chỉ được khi danh mục không còn mẫu tin. */
export function LibraryCategoryManager({ onChanged }: { onChanged: () => void }) {
  const { showToast } = useToast();
  const [reload, setReload] = useState(0);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const fetcher = useCallback(
    (token: string) =>
      comviaFetch<LibraryList<LibraryCategory>>(`${ADMIN_LIBRARY_API}/categories${buildLibraryQuery({ limit: 200 })}`, { token }),
    // reload chỉ để đổi identity → tải lại danh sách.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reload],
  );
  const { data, loading, error, refetch } = useComviaQuery(true, fetcher);

  function changed() {
    setReload((value) => value + 1);
    onChanged();
  }

  async function save() {
    if (!draft) return;
    const name = draft.name.trim();
    const description = draft.description.trim();
    const sortOrder = Number(draft.sortOrder || 0);
    if (!name || name.length > 100) return setFormError("Tên danh mục phải từ 1 đến 100 ký tự.");
    if (description.length > 500) return setFormError("Mô tả tối đa 500 ký tự.");
    if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 100000) {
      return setFormError("Thứ tự phải là số nguyên từ 0 đến 100000.");
    }
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    setFormError(null);
    try {
      const editing = draft.id !== null;
      await comviaFetch(editing ? `${ADMIN_LIBRARY_API}/categories/${draft.id}` : `${ADMIN_LIBRARY_API}/categories`, {
        method: editing ? "PATCH" : "POST",
        token,
        body: JSON.stringify(editing ? { name, description: description || null, sortOrder } : { name, ...(description ? { description } : {}), sortOrder }),
      });
      showToast({ type: "success", message: editing ? "Đã cập nhật danh mục." : "Đã thêm danh mục." });
      setDraft(null);
      changed();
    } catch (saveError) {
      setFormError(formatComviaError(saveError, "Không lưu được danh mục."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(category: LibraryCategory) {
    if (!window.confirm(`Bạn có chắc muốn xóa danh mục "${category.name}"?`)) return;
    const token = getAccessToken();
    if (!token) return;
    setBusy(true);
    try {
      await comviaFetch(`${ADMIN_LIBRARY_API}/categories/${category.id}`, { method: "DELETE", token });
      showToast({ type: "success", message: "Đã xóa danh mục." });
      changed();
    } catch (deleteError) {
      showToast({
        type: "error",
        message: /still has \d+ template/i.test(formatComviaError(deleteError, ""))
          ? "Danh mục còn mẫu tin, hãy chuyển hoặc xóa các mẫu tin trước"
          : formatComviaError(deleteError, "Không xóa được danh mục."),
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {draft ? (
        <div className="space-y-3 rounded-xl border border-border/60 bg-surface-muted/40 p-4">
          <p className="text-sm font-semibold text-foreground">{draft.id ? "Sửa danh mục" : "Thêm danh mục"}</p>
          <div className="grid gap-3 sm:grid-cols-[2fr_3fr_1fr]">
            <Input placeholder="Tên danh mục" maxLength={100} value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <Input placeholder="Mô tả (tùy chọn)" maxLength={500} value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} />
            <Input type="number" min={0} max={100000} placeholder="Thứ tự" value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: event.target.value })} />
          </div>
          {formError ? <p className="text-sm text-danger">{formError}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" disabled={busy} onClick={() => void save()}>
              {busy ? "Đang lưu…" : "Lưu"}
            </Button>
            <Button size="sm" variant="outline" disabled={busy} onClick={() => setDraft(null)}>
              Hủy
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" icon={<HiOutlinePlus className="size-4" />} onClick={() => { setFormError(null); setDraft(emptyDraft()); }}>
          Thêm danh mục
        </Button>
      )}

      {loading && !data ? (
        <PageLoading message="Đang tải danh mục…" />
      ) : error && !data ? (
        <PageError message={error} onRetry={() => void refetch()} />
      ) : (
        <SimpleTable
          rows={data?.data ?? []}
          getRowKey={(row) => row.id}
          emptyMessage="Chưa có danh mục nào"
          columns={[
            { key: "name", header: "Danh mục", cell: (row) => <span className="font-medium">{row.name}</span> },
            { key: "description", header: "Mô tả", cell: (row) => row.description || "—" },
            { key: "sortOrder", header: "Thứ tự", className: "w-20", cell: (row) => row.sortOrder },
            { key: "itemCount", header: "Số mẫu", className: "w-20", cell: (row) => row.itemCount ?? 0 },
            {
              key: "actions",
              header: "",
              className: "w-44 text-right",
              cell: (row) => (
                <div className="flex justify-end gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon={<HiOutlinePencilSquare className="size-4" />}
                    disabled={busy}
                    onClick={() => {
                      setFormError(null);
                      setDraft({ id: row.id, name: row.name, description: row.description ?? "", sortOrder: String(row.sortOrder) });
                    }}
                  >
                    Sửa
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hover:text-danger"
                    icon={<HiOutlineTrash className="size-4" />}
                    disabled={busy || (row.itemCount ?? 0) > 0}
                    title={(row.itemCount ?? 0) > 0 ? "Danh mục còn mẫu tin, hãy chuyển hoặc xóa các mẫu tin trước" : undefined}
                    onClick={() => void remove(row)}
                  >
                    Xóa
                  </Button>
                </div>
              ),
            },
          ]}
        />
      )}
    </div>
  );
}
