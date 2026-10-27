# TICKET-024: Prefill billing cho popup Sửa Workspace (BR-10)

**Issue:** ISSUE-007, ISSUE-001
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-10 (cập nhật 2026-10-03); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4 (GET detail); `docs/architecture/coding-convention.md` mục "Form workspace dùng chung"
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-008, TICKET-023
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md). Cần kiểm chứng nhánh billing null/validate partial.

## Mục tiêu
Popup Sửa Workspace prefill đầy đủ billing từ endpoint chi tiết (chỉ Owner), thay cho nới-validate tạm.

## Bối cảnh
BR-10 **đã code** (trước đây Blocked): `GET /workspaces/:workspaceId` trả `{ id, name, slug, status, role, billingProfile|null }`, **chỉ Owner** (Member/ngoài workspace → 403). Tách khỏi TICKET-015 (nay TICKET-015 chỉ còn verify BR-01/09).

## Chỉ dẫn code
- Chỉ nối API thật **sau khi backend deploy server live**.
- **Sửa `app/app/workspaces/page.tsx`** (popup Sửa, TICKET-008):
  - Khi mở popup Sửa (chỉ Owner, chỉ khi `ws.status !== "DELETED"` theo TICKET-023), gọi `GET /workspaces/:workspaceId` qua `comviaFetch` lấy `billingProfile`.
  - Đổ `billingProfile` làm `initialValue` cho `<WorkspaceForm mode="edit" .../>`. Field theo `billingType` (field không thuộc loại = null).
  - Xử lý `billingProfile = null` (workspace chưa có billing): prefill rỗng, form cho nhập mới.
  - Xử lý trạng thái tải (loading khi gọi GET detail) + lỗi 403 (hiếm, do race) báo rõ.
- **Sửa `components/workspace/workspace-form.tsx`:** khi đã có prefill billing (mode edit nhận `initialValue` đầy đủ), **bỏ nới-validate tạm** (validate edit về như create cho billing đã prefill); xoá comment `// TODO BR-10`.

> **Thứ tự với TICKET-023:** cùng chạm `app/app/workspaces/page.tsx` → làm **sau** TICKET-023 (không song song).

## Acceptance Criteria (cấp code)
- [ ] Mở popup Sửa (Owner) gọi `GET /workspaces/:id`, prefill `billingProfile` vào form đúng theo `billingType`.
- [ ] `billingProfile = null` → form rỗng, nhập mới được.
- [ ] Bỏ nới-validate tạm + comment `// TODO BR-10` trong `workspace-form.tsx`.
- [ ] Không gọi GET detail cho workspace `DELETED` (đã guard ở TICKET-023).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công sau khi backend deploy — Owner sửa workspace, billing prefill đúng; workspace chưa có billing prefill rỗng.)
