# TICKET-015: Tích hợp — workspace billing cá nhân (BR-01) + PATCH theo trạng thái (BR-09)

**Issue:** ISSUE-001, ISSUE-007
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-01/BR-09 (cập nhật 2026-10-03); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.1, §4.4
**Độ ưu tiên:** High
**Phụ thuộc vào:** TICKET-005, TICKET-008
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

> **Cập nhật 2026-10-03:** phần prefill billing (BR-10) đã tách sang **TICKET-024** (BR-10 code xong). Guard nút Sửa cho `DELETED` tách sang **TICKET-023** (BR-09 đính chính: `DELETED` → 403). Ticket này chỉ còn verify BR-01 + BR-09.

## Mục tiêu
Xác nhận sau deploy: tạo/sửa workspace cá nhân KHÔNG kèm `taxCode` không bị 400 (BR-01); Owner PATCH được ở `ACTIVE`/`DISABLED`/`SUSPENDED` (BR-09).

## Chỉ dẫn code
- Hợp đồng đã rõ, chỉ verify thật **sau khi backend deploy server live**.
- **BR-01:** `POST /workspaces` + `PATCH /workspaces/:workspaceId` với `billingType=INDIVIDUAL` KHÔNG gửi `taxCode` → backend không còn 400 (`taxCode` optional, vẫn lưu nếu gửi). Tổ chức thiếu `taxCode` vẫn 400. Form đã bỏ gửi `taxCode` cho cá nhân từ TICKET-005 — chỉ verify. Field billing cá nhân: `fullName`, `citizenId`, `address`, `invoiceEmail`, `phone` (BR-01).
- **BR-09 (đính chính 2026-10-03):** Owner PATCH được workspace `ACTIVE`/`DISABLED`/`SUSPENDED` → 200. Workspace `DELETED` → **403** ("Workspace is not active (DELETED)"). FE **không mở popup Sửa cho `DELETED`** (guard ở TICKET-023). Verify các status 200 chạy được; `DELETED` được guard ở UI nên không gọi PATCH.
  - **Lưu ý trước deploy:** bản backend hiện tại (trước deploy bản mới) `DISABLED`/`SUSPENDED` vẫn 403 — chỉ verify đầy đủ sau khi deploy bản BR-09 mới.
- Giữ nới-validate billing tạm ở `mode="edit"` (`components/workspace/workspace-form.tsx`) cho tới khi prefill thật (TICKET-024) bỏ nó.

## Acceptance Criteria (cấp code)
- [ ] Tạo + sửa workspace cá nhân không `taxCode` thành công trên backend thật (verify sau deploy).
- [ ] Owner PATCH workspace `ACTIVE`/`DISABLED`/`SUSPENDED` → 200; `DELETED` không gọi PATCH (guard TICKET-023).
- [ ] Không còn giả định PROVISIONAL cho billing cá nhân / PATCH.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công end-to-end sau khi backend deploy BR-01/09.)
