"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/components/ui/toast";
import { LibraryBrowser } from "@/components/template-library/library-browser";
import { formatComviaError } from "@/lib/api-message";
import { getAccessToken } from "@/lib/auth";
import { ComviaApiError, comviaFetch } from "@/lib/comviaFetch";
import { USER_LIBRARY_API, useStoredRole, type LibraryItem, type LibraryItemType } from "@/lib/template-library";

type Source = "manual" | "library";

/**
 * Select "Tạo thủ công / Tạo từ thư viện" cho popup tạo/sửa mẫu tin (chỉ role USER; ADMIN/STAFF không hiện).
 * Chọn "Tạo từ thư viện" → mở popup thư viện chồng lên; "Sử dụng" gọi `onApply(item)` với bản chi tiết mới nhất.
 * Đóng bằng X thì không đổi gì và select về "Tạo thủ công".
 */
export function LibrarySourceSelect({
  onApply,
  isDirty,
  lockedType,
  disabled,
}: {
  onApply: (item: LibraryItem) => void;
  /** Form đang có dữ liệu user đã nhập → hỏi xác nhận ghi đè trước khi điền. */
  isDirty: boolean;
  /** Sửa mẫu tin có loại cố định → chỉ liệt kê mẫu thư viện cùng loại. */
  lockedType?: LibraryItemType;
  disabled?: boolean;
}) {
  const role = useStoredRole();
  const { showToast } = useToast();
  const [source, setSource] = useState<Source>("manual");
  const [busyId, setBusyId] = useState<string | null>(null);

  if (role !== "USER") return null;

  async function applyItem(item: LibraryItem, refresh: () => void) {
    if (isDirty && !window.confirm("Nội dung hiện tại sẽ bị thay thế bằng mẫu tin từ thư viện. Tiếp tục?")) return;
    const token = getAccessToken();
    if (!token) return;
    setBusyId(item.id);
    try {
      const latest = await comviaFetch<LibraryItem>(`${USER_LIBRARY_API}/items/${item.id}`, { token });
      setSource("manual");
      onApply(latest);
    } catch (error) {
      if (error instanceof ComviaApiError && error.statusCode === 404) {
        showToast({ type: "error", message: "Mẫu tin không còn tồn tại" });
        refresh();
      } else {
        showToast({ type: "error", message: formatComviaError(error, "Không tải được mẫu tin từ thư viện.") });
      }
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Cách tạo mẫu tin
      </label>
      <Select value={source} disabled={disabled} onChange={(event) => setSource(event.target.value as Source)}>
        <option value="manual">Tạo thủ công</option>
        <option value="library">Tạo từ thư viện</option>
      </Select>
      <Modal
        stacked
        size="full"
        open={source === "library"}
        title="Chọn mẫu tin từ thư viện"
        onClose={() => setSource("manual")}
      >
        <LibraryBrowser
          apiBase={USER_LIBRARY_API}
          limit={3}
          lockedType={lockedType}
          gridClassName="grid gap-4 md:grid-cols-3"
          renderActions={(item, refresh) => (
            <Button size="sm" disabled={busyId !== null} onClick={() => void applyItem(item, refresh)}>
              {busyId === item.id ? "Đang tải…" : "Sử dụng"}
            </Button>
          )}
        />
      </Modal>
    </div>
  );
}
