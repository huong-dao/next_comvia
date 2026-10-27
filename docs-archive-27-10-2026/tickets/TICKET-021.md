# TICKET-021: Mở rộng `image-upload-field.tsx` — preview ảnh cũ (existingUrl) + validate ≤2MB + PNG/JPEG

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Upload ảnh"; ADR-001; open-items (SA chốt 2026-10-02, PO ủy quyền); `backend-responses.md` BR-03/04 (ảnh PNG/JPEG ≤2MB)
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-004
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
`image-upload-field.tsx` hiện được ảnh cũ ở mode edit và chặn file sai định dạng/quá nặng trước khi gửi.

## Chỉ dẫn code
- **Sửa `components/oa/image-upload-field.tsx`** (TICKET-004):
  - Thêm prop `existingUrl?: string | null`: khi chưa chọn file mới (`value === null`) mà có `existingUrl` → hiện ảnh cũ làm preview. Nơi gọi hiểu `value === null` = "giữ ảnh cũ, không upload lại"; chỉ upload ảnh user thực sự chọn mới (dùng ở TICKET-019).
  - **Validate client-side bổ sung** (theo hợp đồng backend BR-03/04): chỉ chấp nhận **PNG/JPEG**; dung lượng **≤ 2MB**. Sai định dạng/quá nặng → báo lỗi inline + không nhận file.
  - Giữ validate kích thước 400×96 cho logo (TICKET-004); avatar không ép kích thước.
  - Ghép base URL khi `existingUrl` là path tương đối (backend trả dạng `/public/oa/<wsId>/<file>`) — dùng helper base URL hiện có (`getComviaApiBaseUrl` / cách app đang ghép ảnh public), KHÔNG tự hardcode host.
- `accept` của `<input type="file">` đặt `image/png,image/jpeg`.

## Acceptance Criteria (cấp code)
- [ ] Prop `existingUrl` hiện ảnh cũ khi chưa chọn file mới; chọn file mới thì preview đổi sang file mới.
- [ ] File không phải PNG/JPEG hoặc > 2MB bị từ chối + báo lỗi inline.
- [ ] Validate 400×96 cho logo vẫn hoạt động; avatar tự do.
- [ ] `existingUrl` dạng path tương đối được ghép base URL đúng, không hardcode host.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — thử ảnh PNG/JPEG đúng/sai kích thước, ảnh >2MB, file không phải ảnh, và existingUrl hiện ảnh cũ.)
