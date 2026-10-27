# TICKET-025: Thêm field "Mô tả" (description) cho popup Tạo/Sửa OA + hiển thị ở box Thông tin OA

**Issue:** ISSUE-008
**Rule/Thiết kế liên quan:** `docs/handoff/backend-responses.md` BR-03/04 (`description` optional/nullable); `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §6.5; BR-12 (xác nhận max length + cách clear — chờ, không chặn FE); ADR-001
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-019 (orchestration submit OA đã có)
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md). BR-12 max length/clear description vẫn mở.

## Mục tiêu
Popup Tạo/Sửa OA có field "Mô tả" (không bắt buộc), gửi `description` khi tạo/sửa, và box "Thông tin OA" hiển thị mô tả thật thay cho câu cố định.

## Bối cảnh
Backend ĐÃ hỗ trợ `description` (POST/PATCH `/workspaces/:id/oa`, response trả lại, nullable) — KHÔNG cần backend build thêm. `OaRecord` đã có `description: string | null` và `OaRecordInput` đã có `description?: string`, nhưng form chưa thu field này và submit chưa gửi.

## Chỉ dẫn code

### 1. `components/oa/oa-record-modal.tsx` — thêm field "Mô tả" (không bắt buộc)
- Thêm state `description` (string), prefill trong effect reset form (`oa-record-modal.tsx:131-143`): `setDescription(record?.description ?? "")`.
- Thêm một mục "Mô tả" (textarea) vào cột trái form (sau "Mã code", giữ đúng thứ tự/khung hình 3 PO). Dùng `Textarea` (`components/ui/input`). **Không bắt buộc** → KHÔNG hiển thị dấu `*`: `FieldSection` hiện hardcode `*` (`:541`) → thêm prop `optional?: boolean` cho `FieldSection` để ẩn asterisk, hoặc tạo biến thể mục không-bắt-buộc. Không đổi hành vi các mục bắt buộc hiện có.
- `maxLength` **tạm 500 ký tự** (an toàn) — ghi comment rõ "tạm, chờ BR-12 chốt max length". Có thể tái dùng kiểu `CountedInput` (đếm ký tự) cho textarea nếu phù hợp.
- **Checklist "Tóm tắt thông tin":** "Mô tả" KHÔNG bắt buộc → KHÔNG thêm vào checklist bắt buộc (`:166-198`), KHÔNG tính vào `ready`. Giữ nguyên 4 mục checklist hiện có.

### 2. Gửi `description` khi submit (`handleSubmit`, `:231-324`)
- **POST (tạo mới):** body `{ name, code, description }` — gửi `description: trimmedDescription` (chuỗi đã trim). Nếu rỗng, gửi chuỗi rỗng `""` (hoặc bỏ field) — xem ghi chú BR-12.
- **PATCH (sửa):** chỉ đưa `description` vào `body` khi **đổi** so với `current.description` (pattern giống `name`/`code` ở `:256-258`). **Cho xoá mô tả bằng chuỗi rỗng `""`**.
  - `// TODO BR-12`: backend chưa chốt clear bằng `""` hay `null`. Tạm dùng `""`; nếu BR-12 chốt `null` thì đổi. Ghi rõ comment.

### 3. `components/oa/oa-info-box.tsx` — hiển thị `record.description`
- Thay câu cố định "Official Account trên hệ thống Comvia" (`oa-info-box.tsx:245-247`) bằng `record.description`.
- Khi `description` rỗng/null → **ẩn dòng** (không render `<p>`), không hiển thị câu cố định cũ.

## Acceptance Criteria (cấp code)
- [ ] Popup Tạo/Sửa OA có field "Mô tả" (textarea, không bắt buộc, không có dấu `*`), đúng khung hình 3.
- [ ] Mode edit prefill `record.description`; mode create rỗng.
- [ ] POST gửi `description`; PATCH chỉ gửi khi đổi, cho xoá bằng `""` (comment `// TODO BR-12`).
- [ ] `OaRecordInput` dùng được `description` (type đã có — xác nhận submit dùng đúng).
- [ ] Checklist bắt buộc KHÔNG gồm "Mô tả"; `ready` không phụ thuộc mô tả.
- [ ] Box "Thông tin OA" hiển thị `record.description`, ẩn dòng khi rỗng/null.
- [ ] `maxLength` tạm 500, comment rõ chờ BR-12.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — tạo/sửa OA có mô tả, để trống, xoá mô tả; box hiển thị/ẩn đúng. Verify end-to-end với backend sau deploy.)
