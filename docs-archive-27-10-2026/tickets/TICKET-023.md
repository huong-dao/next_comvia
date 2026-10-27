# TICKET-023: Ẩn nút "Sửa Workspace" khi workspace `DELETED` (BR-09 đính chính)

**Issue:** ISSUE-007
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-09 (cập nhật 2026-10-03); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.4
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-008
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
Nút "Sửa Workspace" không hiện (không mở popup) cho workspace trạng thái `DELETED`; các trạng thái khác giữ nguyên cho Owner.

## Bối cảnh
BR-09 **đính chính**: backend trả **403** cho `DELETED` ở cả `PATCH /workspaces/:id` và `GET /workspaces/:id` (detail); `ACTIVE`/`DISABLED`/`SUSPENDED` → 200. Trước đây FE chốt "DELETED không chặn" — nay đảo lại. Ghi chú cũ "DELETED không chặn" trong TICKET-015/board đã được sửa.

## Chỉ dẫn code
- **Sửa `app/app/workspaces/page.tsx`** (điều kiện render nút "Sửa Workspace", TICKET-008 — hiện ở khoảng `workspaces/page.tsx:137`):
  - Giữ điều kiện `ws.role === "OWNER"`, **thêm** `ws.status !== "DELETED"`. Workspace `DELETED` → không render nút (và không mở popup Sửa/không gọi GET detail).
  - `ACTIVE`/`DISABLED`/`SUSPENDED` vẫn hiện nút cho Owner như hiện tại.
- Chỉ chạm `app/app/workspaces/page.tsx` — KHÔNG đụng `components/workspace/workspace-form.tsx`.

> **Thứ tự với TICKET-024:** TICKET-024 (prefill billing) cũng chạm `app/app/workspaces/page.tsx` → 023 và 024 **không chạy song song**. Làm 023 trước (nhỏ, chỉ thêm điều kiện), rồi 024.

## Acceptance Criteria (cấp code)
- [ ] Workspace `DELETED`: không hiện nút "Sửa Workspace", không mở popup.
- [ ] Workspace `ACTIVE`/`DISABLED`/`SUSPENDED` của Owner: vẫn hiện nút.
- [ ] Member: vẫn không thấy nút (giữ điều kiện role).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — giả lập item `DELETED` và các status khác, kiểm nút ẩn/hiện đúng.)
