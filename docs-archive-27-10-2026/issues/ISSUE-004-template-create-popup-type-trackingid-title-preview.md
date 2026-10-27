# ISSUE-004: Popup tạo mẫu tin — bổ sung Tracking ID, Loại tin, Tựa đề, preview theo loại

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO đã chốt spec form động theo loại tin + vai trò field — chờ backend BR-05, SA có thể thiết kế song song)
**Phân loại:** Change Request + Missing Spec (field mới chưa có trong spec/API)
**Màn hình/route liên quan:** `app/app/w/[workspaceId]/templates/new/page.tsx` (`NewTemplatePage`) — là tham chiếu giao diện cho popup tạo mẫu tin mở từ dashboard (ISSUE-003); `lib/template-placeholders.ts`

## Mô tả gốc từ khách hàng/PO
> Giao diện popup tạo mẫu tin tham khảo màn hình hiện có `https://app.comvia.cloud/app/w/{workspaceId}/templates/new`. Khi tạo mới mẫu tin cần bổ sung:
> - Select field "Loại tin": "Dạng bảng" / "Dạng văn bản" / "Dạng OTP".
> - Field "Tựa đề" nằm trên field nội dung.
> - Field "Tracking ID" nằm trên "Loại tin".
> - Mẫu tin "Dạng bảng" có phần preview bên phải trực quan giống hình 4. "Dạng văn bản" giống hình 5. "Dạng OTP" giống hình 6.

(Hình 4 = `6.png` ZNS dạng bảng key-value + CTA; Hình 5 = `7.png` dạng văn bản tự do + CTA; Hình 6 = `8.png` dạng OTP: mã lớn + icon copy + cảnh báo bảo mật + thời hạn.)

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §7.1 Create template: body chỉ gồm `name`, `content`, `placeholdersJson`. Backend tự sinh `code`.
- `TemplateStatus` (Phụ lục A): `DRAFT`, `SUBMITTED`, `PENDING_ZALO_APPROVAL`, `APPROVED`, `REJECTED`, `DISABLED`.
- **Không có** field `type` (loại tin), `trackingId`, `title` trong DTO tạo template ở API guide.

## Hành vi thực tế đã verify
- Form tạo template hiện có các field: Tên mẫu (`name`), Nội dung (`content` textarea), danh sách "Các trường thông tin" (placeholder slug + giá trị mẫu) (`templates/new/page.tsx:164-281`).
- Body gửi lên đúng 3 field: `name`, `content`, `placeholdersJson` (`templates/new/page.tsx:91-99`).
- Preview bên phải là `<pre>` text thay thế `{{slug}}` bằng giá trị mẫu (`templates/new/page.tsx:296-305`) — **không** có preview trực quan theo loại (bảng/văn bản/OTP).
- **Không có** field Tựa đề, Tracking ID, Loại tin.

## Hành vi mong đợi (PO chốt spec 2026-10-02)
Thứ tự field: "Tracking ID" (trên "Loại tin") → "Loại tin" (select 3 giá trị) → "Tựa đề" (trên "Nội dung") → phần nội dung động theo loại.

**"Tracking ID"**: user nhập tự do, chỉ lưu lại, **không có logic nghiệp vụ** nào xử lý trong hệ thống.

**"Loại tin"**: lựa chọn **thuần nội bộ Comvia** (KHÔNG map với loại ZNS thật của Zalo). Mục đích duy nhất: đổi các field hiển thị trong form:
- **Dạng bảng**: hiển thị field "Nội dung" + "Các trường thông tin" (placeholders) + **"Nội dung phụ"** (field mới, chỉ có ở dạng bảng).
- **Dạng văn bản**: chỉ hiển thị "Nội dung" + "Các trường thông tin" (KHÔNG có "Nội dung phụ").
- **Dạng OTP**: KHÔNG có "Nội dung" và "Các trường thông tin" tự nhập — thay bằng **một field fix cứng duy nhất là "minutes"** (số phút hết hạn mã OTP).

**Preview** bên phải render trực quan theo loại đã chọn (bảng key-value như hình 4 / văn bản + CTA như hình 5 / OTP + copy + thời hạn như hình 6).

## Phân tích tác động
- Áp dụng cho cả màn `templates/new` hiện có **và** popup tạo mẫu tin trên dashboard (ISSUE-003) — phải nhất quán. SA cân nhắc tách form template thành component dùng chung để màn và popup dùng lại.
- Có thể ảnh hưởng màn gửi tin / chi tiết template nếu `type`/`title` trở thành thuộc tính template được hiển thị nơi khác (`templates/[templateId]`, `messages/send-single`, staff review).
- Preview 3 loại là UI mới, không có component sẵn.

## Giả định / Câu hỏi mở
PO đã chốt (2026-10-02): `trackingId` user nhập tự do chỉ lưu; `type` thuần nội bộ không map Zalo; form đổi field theo type như mục trên.
- `CÂU HỎI MỞ (cho backend, không phải PO):` Tên field chính xác cho "Nội dung phụ" (đề xuất tạm `secondaryContent`) và field phút OTP (đề xuất tạm `otpExpiryMinutes`) — chờ backend đặt tên chuẩn khi thêm vào DTO/schema.
- `GIẢ ĐỊNH:` Preview chỉ render phía client, không gửi gì thêm ngoài các field dữ liệu thật của template.

## Hướng xử lý đề xuất (đã PO duyệt spec)
- Bổ sung field theo đúng thứ tự + form động theo `type` như mục "Hành vi mong đợi"; preview động theo `type`.
- **Chặn gửi** các field mới lên backend cho tới khi backend xác nhận DTO/schema + tên field (BR-05).

## Cần Backend team (BR-05)
- **Bổ sung field DTO + schema template:**
  - `type` (enum 3 giá trị: dạng bảng / dạng văn bản / dạng OTP) — **chỉ là string lưu trữ**, không cần logic đối chiếu Zalo.
  - `trackingId` (string tự do, chỉ lưu, không logic nghiệp vụ).
  - **"Nội dung phụ"** (chỉ dùng ở dạng bảng) — field mới hoàn toàn chưa có trong DTO; đề xuất tạm tên `secondaryContent`, **backend đặt tên chuẩn**.
  - **Dạng OTP**: cần field số phút hết hạn (đề xuất tạm `otpExpiryMinutes`) **thay cho** `content`/`placeholdersJson`; backend xác nhận tên + cách lưu khi `type = OTP`.
  - Lý do: API guide §7.1 DTO create template hiện chỉ có `name`, `content`, `placeholdersJson`. Các field trên chưa tồn tại → FE không lưu được nếu backend không thêm cột + cho phép trong DTO; ValidationPipe sẽ loại field lạ.

## Xử lý
- **2026-10-02 — PO chốt spec:** form đổi field theo "Loại tin" (bảng: nội dung + placeholders + nội dung phụ; văn bản: nội dung + placeholders; OTP: chỉ field phút hết hạn). `trackingId` nhập tự do chỉ lưu; `type` thuần nội bộ không map Zalo.
- Nghiệp vụ đủ rõ cho SA thiết kế form động + preview. Chờ backend BR-05 (field + tên chuẩn) trước khi Dev gửi field thật lên API.
- **2026-10-02 — Backend code xong BR-05 (có migration, chờ deploy).** Hợp đồng thật (API guide §7.1): field `type`, `title`, `trackingId`, `secondaryContent`, `otpExpiryMinutes` — **tên field khớp** FE `ProvisionalTemplateExtras`. **Điểm lệch duy nhất:** giá trị enum `type` thật là **`TEXT` | `TABLE` | `OTP`** (UPPER), còn FE `TemplateMessageType` dùng `"bang" | "van_ban" | "otp"` → cần map **bang↔TABLE, van_ban↔TEXT, otp↔OTP** ở `template-form.tsx` + preview. `type` mặc định `TEXT`; `content` bắt buộc TEXT/TABLE, bỏ khi OTP; `otpExpiryMinutes` int ≥1 required khi OTP. → TICKET-018 (sau deploy): bỏ disable nút cho OTP, map enum, gửi field mới thật.

## Thiết kế SA (2026-10-02)
- **Chạm cấu trúc dùng chung — tách form template thành component:** PO yêu cầu popup trên dashboard "tham khảo `templates/new`". Để không lệch logic giữa trang và popup, tách logic form hiện ở `app/app/w/[workspaceId]/templates/new/page.tsx` thành `components/template/template-form.tsx`; trang cũ VÀ popup (ISSUE-003) dùng chung. Ghi ở `coding-convention.md` mục "Form + preview template dùng chung".
- **Field động theo `type`:** state `type` điều khiển field hiển thị (bảng: nội dung + placeholders + nội dung phụ; văn bản: nội dung + placeholders; OTP: chỉ field số phút). Thứ tự: Tracking ID → Loại tin → Tựa đề → nội dung động.
- **Preview tách theo loại** trong `components/template/preview/`: `table-preview.tsx`, `text-preview.tsx`, `otp-preview.tsx` + `TemplatePreview` switch theo `type` (theo hình 4/5/6). Chỉ render client.
- **Chặn gửi field mới** (`type`, `trackingId`, `title`, nội dung phụ, phút OTP) lên API tới khi backend chốt tên (BR-05); FE giữ value nội bộ, chỉ POST field backend chấp nhận. Type request đánh dấu `// PROVISIONAL (BR-05)`.
- Không cần ADR (không đổi khuôn khổ gọi API/session; thêm component + tách form).
- **Sẵn sàng Team Lead chẻ ticket** phần form động + preview. Gửi field mới thật chờ BR-05.
