# TICKET-005: Tách form workspace dùng chung + áp quy tắc billing + canh giữa trang tạo

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-001, ISSUE-007
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Form workspace dùng chung"; `docs/MAIN_RULES.mdc` §5.2.3.B (đã cập nhật); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.1, §4.4
**Độ ưu tiên:** High
**Phụ thuộc vào:** —

## Mục tiêu
Có component `workspace-form.tsx` dùng chung cho tạo + sửa workspace, chứa quy tắc ẩn Mã số thuế cho cá nhân; trang tạo dùng form này và được canh giữa.

## Chỉ dẫn code
- **Tạo `components/workspace/workspace-form.tsx`** (Client Component): rút logic form hiện ở `app/app/workspaces/new/page.tsx:25-243` (state field billing, validate, submit).
  - Props: `{ mode: "create" | "edit"; initialValue?: WorkspaceFormValue; onSubmitted: (ws) => void }`.
  - `mode="create"` → `POST /workspaces` (§4.1); `mode="edit"` → `PATCH /workspaces/:id` (§4.4). Dùng `comviaFetch`, token qua `getAccessToken()`.
  - **Quy tắc billing (ISSUE-001), áp cho cả 2 mode:** khi `billingType === "INDIVIDUAL"` → ẩn field "Mã số thuế" (hiện ở `new/page.tsx:207-212`), KHÔNG validate bắt buộc `taxCode` (sửa điều kiện `new/page.tsx:55` để `taxCode` không nằm trong nhóm bắt buộc khi cá nhân), KHÔNG gửi `taxCode` trong body nhánh INDIVIDUAL (bỏ `taxCode` ở `new/page.tsx:98`). `ORGANIZATION` giữ bắt buộc + gửi `taxCode`.
  - Validation còn lại giữ như hiện tại (tên workspace, email hóa đơn, companyName cho tổ chức, fullName/citizenId cho cá nhân).
  - Lỗi API hiển thị inline trong form (`formError`), giữ pattern hiện có; không thay bằng toast.
- **Sửa `app/app/workspaces/new/page.tsx`**: thay form inline bằng `<WorkspaceForm mode="create" onSubmitted={...} />`. Giữ hành vi sau tạo: `setActiveWorkspace`, `notifyWorkspacesListChanged()`, `router.push(workspacePath(id, "dashboard"))` (hiện `new/page.tsx:106-114`). **Canh giữa form**: bọc `Card` trong wrapper `mx-auto` (vd `max-w-3xl mx-auto`) — việc của trang, không của form (quyết định SA).
- **Lưu ý backend (dữ liệu tạm, chờ BR-01):** nếu backend chưa bỏ `@IsNotEmpty()` cho `taxCode` khi INDIVIDUAL, submit cá nhân sẽ 400. Việc xác nhận end-to-end nằm ở TICKET-015 (Blocked BR-01). Ticket này vẫn ship được phần FE.

## Acceptance Criteria (cấp code)
- [ ] `components/workspace/workspace-form.tsx` export form với props `{ mode, initialValue?, onSubmitted }`.
- [ ] Billing cá nhân: field Mã số thuế ẩn, không validate bắt buộc, không có trong body gửi đi.
- [ ] Billing tổ chức: Mã số thuế hiện + bắt buộc + gửi đi.
- [ ] Trang `workspaces/new` dùng form mode create, form canh giữa ngang, tạo workspace thành công điều hướng về dashboard như trước.
- [ ] `mode="edit"` gọi `PATCH /workspaces/:id` (được dùng thực tế ở TICKET-008).

## Quyết định PO (2026-10-02) — nới validate billing cho mode="edit"
Phát sinh từ TICKET-008: thiếu `GET /workspaces/:id` (BR-10) nên popup edit không prefill billing. PO chốt: ở `mode="edit"`, billing được phép để trống — field trống KHÔNG gửi trong body PATCH (giữ giá trị cũ ở backend qua PATCH từng phần, §4.4); chỉ validate định dạng (email) khi người dùng có nhập. `mode="create"` GIỮ NGUYÊN (billing bắt buộc đầy đủ; quy tắc ẩn/không gửi taxCode cho cá nhân giữ nguyên). Đã thêm `// TODO BR-10` tại chỗ prefill (`app/app/workspaces/page.tsx`). Thực hiện: Dev 2026-10-02 (chỉ sửa `components/workspace/workspace-form.tsx` + `app/app/workspaces/page.tsx`).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — tạo workspace tổ chức & cá nhân, kiểm field Mã số thuế ẩn/hiện đúng.)
