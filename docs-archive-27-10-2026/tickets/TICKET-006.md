# TICKET-006: Tách form + preview template dùng chung, field động theo loại tin

**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

**Issue:** ISSUE-004 (dùng ở ISSUE-003)
**Rule/Thiết kế liên quan:** `docs/architecture/coding-convention.md` mục "Form + preview template dùng chung"; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §7.1
**Độ ưu tiên:** High
**Phụ thuộc vào:** —

## Mục tiêu
Có `template-form.tsx` dùng chung cho trang `templates/new` và popup tạo mẫu tin trên dashboard, với field đổi theo "Loại tin" + preview trực quan 3 loại.

## Chỉ dẫn code
- **Tạo `components/template/template-form.tsx`** (Client Component): rút logic form hiện ở `app/app/w/[workspaceId]/templates/new/page.tsx:28-294` (state name/content/placeholderRows, chèn placeholder, validate, submit create/submit).
  - Props gợi ý: `{ workspaceId: string; onCreated: (tpl) => void; onCancel?: () => void }` (dùng được cả trong trang và popup).
  - **Field mới + thứ tự:** Tracking ID → Loại tin (select) → Tựa đề → phần nội dung động. State mới: `trackingId` (string tự do), `type` (`"bang" | "van_ban" | "otp"`), `title`.
  - **Field động theo `type`:**
    - `bang` (dạng bảng): Nội dung + "Các trường thông tin" (placeholders, giữ logic `lib/template-placeholders.ts` hiện có) + **"Nội dung phụ"** (textarea mới).
    - `van_ban` (dạng văn bản): Nội dung + "Các trường thông tin". KHÔNG có "Nội dung phụ".
    - `otp`: KHÔNG có Nội dung/placeholders — chỉ một field số **phút hết hạn** (number).
  - **Preview tách theo loại** trong `components/template/preview/`: tạo `table-preview.tsx`, `text-preview.tsx`, `otp-preview.tsx` + một `TemplatePreview` switch theo `type` (render như hình 4/5/6 trong ISSUE-004). Preview chỉ render client, thay `{{slug}}` bằng giá trị mẫu (tái dùng `previewTemplateContent` ở `lib/template-placeholders.ts` cho bảng/văn bản).
  - **CHẶN gửi field mới (dữ liệu tạm, chờ BR-05):** submit chỉ `POST /workspaces/:id/templates` các field backend đang chấp nhận (`name`, `content`, `placeholdersJson` — như `templates/new/page.tsx:91-99`). Giữ `type`/`trackingId`/`title`/nội dung phụ/phút OTP trong state nội bộ, KHÔNG đưa vào body. Khai báo type request dự kiến gắn `// PROVISIONAL (BR-05)`. Gửi field mới thật ở TICKET-018.
  - Giữ 2 hành động hiện có: "Lưu template" và "Lưu và gửi duyệt" (`templates/new/page.tsx:102-142`).
- **Sửa `app/app/w/[workspaceId]/templates/new/page.tsx`**: thay form inline bằng `<TemplateForm workspaceId={...} onCreated={...} />`, giữ điều hướng sau tạo.

## Acceptance Criteria (cấp code)
- [ ] `components/template/template-form.tsx` + `components/template/preview/{table,text,otp}-preview.tsx` + `TemplatePreview` tồn tại.
- [ ] Đổi "Loại tin" đổi đúng bộ field (bảng/văn bản/OTP) theo spec.
- [ ] Preview đổi trực quan theo loại.
- [ ] Submit chỉ gửi `name`/`content`/`placeholdersJson`; field mới KHÔNG lên API; type request gắn `// PROVISIONAL (BR-05)`.
- [ ] Trang `templates/new` dùng form chung, tạo + submit template vẫn hoạt động như trước.

## Quyết định PO (2026-10-02) — submit loại "Dạng OTP"
PO chọn phương án (b) cho điểm escalate OTP: khi loại tin là "Dạng OTP", tạm **vô hiệu hóa** nút "Lưu template" + "Lưu và gửi duyệt" trong `components/template/template-form.tsx`, kèm ghi chú cạnh nút ("Dạng OTP chờ backend hỗ trợ, tạm thời chưa lưu được") và comment `// TODO TICKET-018: bỏ disable khi BR-05 xong`. Bỏ disable khi backend hỗ trợ field OTP (BR-05 / TICKET-018). Loại bảng/văn bản lưu bình thường.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công — đổi 3 loại tin, kiểm field + preview + tạo template thành công. Loại OTP: nút lưu/gửi duyệt bị disable + hiện ghi chú theo quyết định PO.)
