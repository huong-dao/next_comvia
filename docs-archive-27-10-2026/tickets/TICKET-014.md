# TICKET-014: Dashboard — section OA (box thông tin OA + box danh sách template + popup tạo mẫu tin)

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-003 (dùng ISSUE-004)
**Rule/Thiết kế liên quan:** ADR-001; `docs/architecture/coding-convention.md` mục "Khối OA", "Form + preview template dùng chung"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §7.2
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-013, TICKET-006

## Mục tiêu
Dashboard có section OA 2 box: trái = box thông tin OA; phải = danh sách template + nút "Tạo mẫu tin" mở popup + "Xem tất cả".

## Chỉ dẫn code
- **Sửa `app/app/w/[workspaceId]/dashboard/page.tsx`**: thêm section OA (dưới section "Tổng quan hoạt động", trên section ví).
  - **Box trái:** render `components/oa/oa-info-box.tsx` (TICKET-013).
  - **Box phải — danh sách template:**
    - Lấy template qua `GET /workspaces/:id/templates` (§7.2, đã dùng ở `dashboard/page.tsx:38`). Hiển thị danh sách rút gọn (tên + trạng thái) theo hình 2.
    - Nút "Tạo mẫu tin" → mở `components/ui/modal.tsx` chứa `<TemplateForm workspaceId={...} onCreated={...} />` (TICKET-006). Sau tạo thành công refetch list.
    - Nút "Xem tất cả" → link `workspacePath(workspaceId, "templates")`.
  - Giữ các section khác (tổng quan, ví) nguyên.
- Template list + create popup dùng endpoint thật đã có → phần này không blocked. (Logic record OA trong box trái vẫn mock tới TICKET-019; gửi field template mới vẫn chặn tới TICKET-018.)

## Acceptance Criteria (cấp code)
- [ ] Section OA 2 box trên dashboard.
- [ ] Box phải hiện danh sách template thật + "Xem tất cả" link đúng.
- [ ] Nút "Tạo mẫu tin" mở popup `TemplateForm`; tạo xong refetch list.
- [ ] Box trái render `oa-info-box` với 3 trạng thái.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — section OA hiển thị, popup tạo mẫu tin hoạt động, danh sách template đúng.)
