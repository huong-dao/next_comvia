# TICKET-018: Tích hợp — gửi field template mới + map enum loại tin (BR-05)

**Issue:** ISSUE-004
**Rule/Thiết kế liên quan:** `backend-responses.md` BR-05; `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §7.1
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-006
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
Gửi các field template mới lên API theo tên field thật backend chốt, map enum loại tin, và bỏ khoá nút Lưu cho loại OTP.

## Chỉ dẫn code
- Hợp đồng đã chốt tên field (BR-05). Chỉ nối API thật **sau khi backend deploy server live** (có migration cộng cột — template cũ tự nhận `type=TEXT`).
- **Sửa `components/template/template-form.tsx`** (TICKET-006):
  - **Map enum loại tin FE ↔ backend:** `bang` ↔ **`TABLE`**, `van_ban` ↔ **`TEXT`**, `otp` ↔ **`OTP`**. Backend mặc định `type=TEXT` nếu không gửi.
  - **Gửi field mới** vào body `POST /workspaces/:workspaceId/templates` theo tên chuẩn backend:
    - `name` (string ≥2, bắt buộc), `type` (enum trên), `title` (string, optional), `trackingId` (string, optional).
    - `content` (string ≥1) — bắt buộc khi `TEXT`/`TABLE`, **bỏ khi `OTP`**.
    - `secondaryContent` (string) — **chỉ khi `type=TABLE`** ("nội dung phụ").
    - `otpExpiryMinutes` (int ≥1) — **bắt buộc khi `type=OTP`** ("số phút hết hạn"); OTP không gửi `content`/`placeholdersJson` (backend lưu null).
    - `placeholdersJson` theo content (TEXT/TABLE).
  - **Bỏ khoá nút** "Lưu template" + "Lưu và gửi duyệt" cho loại OTP (gỡ disable + ghi chú tạm đã thêm ở TICKET-006; xoá comment `// TODO TICKET-018`).
  - Gỡ type request `// PROVISIONAL (BR-05)`, đổi tên field cho khớp backend.
  - Lưu ý: template đã `APPROVED` là read-only — sửa field nội dung sẽ bị backend chặn (không phải lỗi FE).
- Kiểm cả 2 nơi dùng form: trang `app/app/w/[workspaceId]/templates/new/page.tsx` + popup dashboard (TICKET-014).

## Acceptance Criteria (cấp code)
- [ ] Enum loại tin map đúng `bang↔TABLE / van_ban↔TEXT / otp↔OTP`.
- [ ] Tạo template 3 loại gửi đúng field (`type/title/trackingId/content/secondaryContent/otpExpiryMinutes`) theo tên backend, không bị ValidationPipe loại.
- [ ] Dạng OTP: không gửi content/placeholders, gửi `otpExpiryMinutes`; nút Lưu KHÔNG còn bị khoá.
- [ ] Dạng bảng: gửi `secondaryContent`.
- [ ] Không còn type PROVISIONAL (BR-05).

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công sau khi backend deploy — tạo 3 loại template và kiểm field lưu đúng.)
