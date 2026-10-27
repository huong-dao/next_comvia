# TICKET-012: Popup tạo/sửa record OA (UI tĩnh theo hình 3)

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** ADR-001; `docs/architecture/coding-convention.md` mục "Khối OA trên dashboard + popup tạo/sửa OA"
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-004

## Mục tiêu
Có popup form tạo/sửa record OA (tên OA, mã code, hình đại diện, logo sáng/tối 400x96) dựng theo hình 3, UI đầy đủ; submit chưa gọi API thật (chờ BR-03/04).

## Chỉ dẫn code
- **Tạo `components/oa/oa-record-modal.tsx`** (Client Component) dùng `components/ui/modal.tsx`:
  - Props gợi ý: `{ open; onClose; mode: "create" | "edit"; initialValue?; workspaceId; onSaved }`.
  - Field theo hình 3: `name` (Tên OA), `code` (Mã code — nhãn nội bộ, string tự do), Hình đại diện (avatar, không ràng buộc), Logo sáng (400x96), Logo tối (400x96). Ba ảnh dùng `components/oa/image-upload-field.tsx` (TICKET-004) với `requiredWidth/Height` cho logo.
  - Panel checklist + nút Hủy/Tạo OA theo layout hình 3.
  - Validate client: `name`/`code` bắt buộc; logo đúng 400x96 (field tự chặn).
  - **Dữ liệu tạm (chờ BR-03/04):** submit CHƯA gọi `POST`/`PATCH /oa` thật và CHƯA upload multipart — nối API thật ở TICKET-019. Khai báo type `OaRecord`/`OaRecordInput` dự kiến theo ADR-001 gắn `// PROVISIONAL (BR-03/04)`. Giai đoạn này `onSaved` trả value nhập tay (mock) để `oa-info-box` cập nhật UI cục bộ.

## Acceptance Criteria (cấp code)
- [ ] `components/oa/oa-record-modal.tsx` render form đúng field hình 3 (name, code, avatar, logo sáng/tối).
- [ ] Logo sáng/tối chặn ảnh sai 400x96; avatar tự do.
- [ ] Mode create/edit (edit prefill `initialValue`).
- [ ] Submit chưa gọi API thật; type gắn `// PROVISIONAL (BR-03/04)`.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — mở popup, nhập field, kiểm ràng buộc logo.)
