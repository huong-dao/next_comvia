# TICKET-008: Nút "Sửa Workspace" + popup edit trên danh sách workspace

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-007
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Form workspace dùng chung"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.2, §4.4
**Độ ưu tiên:** High
**Phụ thuộc vào:** TICKET-005

## Mục tiêu
Mỗi item workspace (chỉ Owner) có nút "Sửa Workspace" mở popup chứa `workspace-form` mode edit, prefill dữ liệu, submit `PATCH`.

## Chỉ dẫn code
- **Sửa `app/app/workspaces/page.tsx`** (`WorkspacesListPage`):
  - Mỗi Card workspace (`workspaces/page.tsx:108-133`): thêm nút "Sửa Workspace" **chỉ khi `ws.role === "OWNER"`** (field `role` có sẵn trong `WorkspaceRow`, xem §4.2).
  - Bấm nút → mở `components/ui/modal.tsx` chứa `<WorkspaceForm mode="edit" initialValue={...} onSubmitted={...} />` (TICKET-005). State `editingWorkspace` giữ item đang sửa.
  - `initialValue` prefill từ dữ liệu item. Lưu ý: list item (`WorkspaceRow`) hiện chỉ có `id/name/slug/status/role` — nếu cần billing info đầy đủ để prefill, gọi `GET /workspaces/:id` khi mở popup (xem API guide §4.3 nếu có; nếu endpoint chi tiết chưa rõ field, prefill các field đang có và để trống phần còn lại — KHÔNG tự bịa field).
  - Sau sửa thành công (`onSubmitted`): đóng popup, gọi `notifyWorkspacesListChanged()` + `refetch()` (đã có `refetch` ở `workspaces/page.tsx:36`).
- Popup dùng `components/ui/modal.tsx` (API `{ open, title, children, onClose, footer? }`).

## Acceptance Criteria (cấp code)
- [ ] Nút "Sửa Workspace" chỉ hiện ở item có `role === "OWNER"`.
- [ ] Bấm mở popup form edit, prefill dữ liệu hiện có.
- [ ] Submit gọi `PATCH /workspaces/:id`; thành công đóng popup + refetch danh sách.
- [ ] Quy tắc ẩn Mã số thuế cho cá nhân áp đúng trong popup edit (do dùng chung form TICKET-005).

## Quyết định PO (2026-10-02) — prefill billing & nới validate edit
- Thiếu `GET /workspaces/:id` trả billing (API guide §4.0–4.5 không có; §4.3 là "switch") → popup edit chỉ prefill `id/name/slug` từ `WorkspaceRow`, KHÔNG bịa field. Backend sẽ bổ sung GET workspace detail = **BR-10** (chờ) để prefill billing thật.
- Trong lúc chờ BR-10: PO chốt nới validate billing ở `mode="edit"` của `workspace-form.tsx` (billing để trống được, field trống không gửi trong PATCH, giữ giá trị cũ) — chi tiết ở TICKET-005 mục "Quyết định PO". Nhờ vậy Owner sửa chỉ tên không còn bị chặn.
- Đã thêm `// TODO BR-10` tại chỗ prefill. Thực hiện: Dev 2026-10-02.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — Owner thấy nút & sửa được; Member không thấy nút. Chạy thật PATCH ở mọi status chờ xác nhận BR-09 ở TICKET-015.)
