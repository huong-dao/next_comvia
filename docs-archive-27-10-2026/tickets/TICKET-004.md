# TICKET-004: Component upload ảnh có ràng buộc kích thước `components/oa/image-upload-field.tsx`

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Upload ảnh có ràng buộc kích thước"; ADR-001
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** —

## Mục tiêu
Có field chọn ảnh client-side có preview + validate kích thước (400x96 cho logo, tự do cho avatar), giữ `File` để nơi gọi gửi multipart sau.

## Chỉ dẫn code
- **Tạo `components/oa/image-upload-field.tsx`** (Client Component):
  - Props: `{ label: string; value: File | null; onChange: (file: File | null) => void; requiredWidth?: number; requiredHeight?: number; accept?: string }`.
  - `<input type="file">` + preview ảnh đã chọn (dùng `URL.createObjectURL`, revoke khi đổi/unmount).
  - Khi có `requiredWidth`/`requiredHeight`: đọc kích thước bằng `new Image()` trước khi chấp nhận; nếu sai kích thước → hiện lỗi inline tại field và KHÔNG gọi `onChange` với file sai (hoặc báo invalid để nơi gọi chặn submit).
  - Chỉ giữ `File` + preview — KHÔNG tự gọi API. Upload multipart thật (`comviaMultipartFetch`) do `oa-record-modal.tsx` xử lý ở ticket tích hợp (TICKET-019).
  - Style Tailwind, `cn()`.
- Đây là component UI thuần, chưa gọi backend → không chờ BR.

## Acceptance Criteria (cấp code)
- [ ] `components/oa/image-upload-field.tsx` export component đúng props.
- [ ] Chọn ảnh → hiện preview.
- [ ] Với `requiredWidth=400, requiredHeight=96`: ảnh sai kích thước bị từ chối + báo lỗi inline; ảnh đúng được chấp nhận.
- [ ] Avatar (không ràng buộc kích thước) chấp nhận mọi ảnh hợp lệ.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — thử ảnh đúng/sai 400x96.)
