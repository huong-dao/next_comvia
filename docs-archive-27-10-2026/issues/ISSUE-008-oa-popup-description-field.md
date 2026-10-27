# ISSUE-008: Popup Tạo/Sửa OA — thêm field "Mô tả" (description)

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO yêu cầu trực tiếp → coi như đã duyệt CR)
**Phân loại:** Change Request
**Màn hình/route liên quan:** `components/oa/oa-record-modal.tsx` (popup Tạo/Sửa OA); `components/oa/oa-info-box.tsx` (box "Thông tin OA" trên dashboard + trang OA); liên quan ISSUE-003, ADR-001

## Mô tả gốc từ khách hàng/PO
> khi sửa hoặc thêm OA trên popup tôi cần một field là Mô tả

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §6.5 (bản backend): "Tạo OA" = record nội bộ nhập tay (`name`/`code`/**`description`**/ảnh). POST body `{ name, code, description }` — **`description` optional**; PATCH body "các field optional". Response (GET/POST/PATCH/upload) có field **`description`** (có thể `null`).
- `docs/handoff/backend-responses.md` BR-03/04: xác nhận `description` nhận ở POST/PATCH và trả lại ở response, nullable.
- **Không tài liệu hóa:** độ dài tối đa của `description`; PATCH có cho **xoá/để trống** (gửi chuỗi rỗng hay `null`) để clear không; message lỗi validate nếu có.

## Hành vi thực tế đã verify (code thật)
- `components/oa/oa-record-modal.tsx`: type `OaRecord` CÓ `description?: string | null`, nhưng **form KHÔNG có field "Mô tả"**; `OaRecordInput` chỉ gồm `name`, `code`; khi tạo/sửa **không gửi `description`** (Dev ghi chú form chưa có field). Các mục trong popup chỉ: Tên OA, Mã code, Hình đại diện, Logo sáng, Logo tối.
- `components/oa/oa-info-box.tsx:245-247`: box "Thông tin OA" hiển thị câu **cố định** "Official Account trên hệ thống Comvia" thay vì `record.description`.

## Hành vi mong đợi
- Popup Tạo/Sửa OA có field "Mô tả" (description): mode create prefill rỗng, mode edit prefill `record.description`.
- Khi tạo/sửa, gửi `description` trong body POST/PATCH `/workspaces/:id/oa`.
- Box "Thông tin OA" hiển thị `record.description` (fallback câu cố định cũ hoặc ẩn dòng khi `description` rỗng/null — Team Lead/Dev chốt khi chẻ ticket).

## Phân tích tác động
- Thuần FE, cục bộ: thêm 1 field vào form có sẵn (`oa-record-modal.tsx`) + wire gửi description ở ticket tích hợp OA (cùng luồng TICKET-019) + đổi 1 dòng hiển thị ở `oa-info-box.tsx`.
- Không chạm khuôn khổ/khối dùng chung → **không cần SA** (trừ khi Team Lead thấy khác).
- Backend đã hỗ trợ sẵn → không chặn, chỉ chờ backend deploy để verify end-to-end như các field OA khác.

## Giả định / Câu hỏi mở
- `CÂU HỎI MỞ (backend — BR-12):` (1) độ dài tối đa của `description`? (2) PATCH có chấp nhận chuỗi rỗng/`null` để **xoá** mô tả không, và trả gì nếu vượt độ dài? Cần để FE validate đúng + cho phép clear. (Không phải yêu cầu backend build thêm chức năng — chỉ xác nhận quy tắc.)
- `GIẢ ĐỊNH:` `description` **không bắt buộc** (optional) — khớp §6.5. Form để trống được.

## Hướng xử lý đề xuất (đã PO duyệt CR)
- Thêm field "Mô tả" (textarea) vào `oa-record-modal.tsx`; gửi `description` khi tạo/sửa; hiển thị trong `oa-info-box.tsx`. Áp mức validate độ dài theo xác nhận BR-12 (nếu backend có giới hạn).

## Cần Backend team
- **KHÔNG cần backend build thêm** — `description` đã được hỗ trợ ở POST/PATCH/response (§6.5, BR-03/04).
- Chỉ cần **xác nhận** 2 quy tắc (BR-12): max length + cho clear bằng rỗng/null ở PATCH.

## Xử lý
- **2026-10-05 — PO yêu cầu trực tiếp (coi như duyệt CR).** Backend đã hỗ trợ `description`; FE chỉ cần thêm field + wire + hiển thị. Đã thêm BR-12 (xác nhận max length + clear). Chuyển Team Lead chẻ ticket FE (không cần SA). Verify end-to-end sau khi backend deploy.
