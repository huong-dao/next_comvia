# Ticket Conventions — Comvia Frontend

Quy ước cấp thực thi cho ticket. Cấu trúc khuôn khổ FE (route/component/hook dùng chung, pattern gọi API, session/auth) do SA sở hữu ở `docs/architecture/coding-convention.md` + ADR — ticket chỉ cụ thể hóa xuống mức thực thi, không định nghĩa lại.

## Cấu trúc một ticket
Theo skill `ticket-format`. Mỗi ticket `docs/tickets/TICKET-{id}.md` gồm:
- Header: `Issue:` (truy vết ngược), `Rule/Thiết kế liên quan:`, `Độ ưu tiên:`, `Phụ thuộc vào:`.
- `## Mục tiêu` — một câu: làm xong thì có gì.
- `## Chỉ dẫ code` — file/route/component/hook thật cần tạo/sửa + trách nhiệm; endpoint API (trích API guide, không bịa); các bước theo thứ tự; convention áp dụng.
- `## Acceptance Criteria (cấp code)` — checklist kiểm được.
- `## Definition of Done` — xem dưới.

## Phân lớp ticket cho issue phụ thuộc backend
Issue phụ thuộc backend (có BR-xx) chẻ 2 lớp:
1. **Ticket UI** — dựng giao diện/state theo thiết kế SA, nguồn dữ liệu là mock/hardcode hoặc type gắn `// PROVISIONAL (BR-xx)`. Làm được ngay, không chờ backend. Ghi rõ "dữ liệu tạm, chờ BR-xx" trong ticket.
2. **Ticket tích hợp API thật** — trạng thái `Blocked — chờ backend BR-xx`. Nội dung chỉ là thay mock bằng `comviaFetch`/`comviaMultipartFetch` thật theo field/endpoint backend chốt; link ngược BR-xx + ticket UI tương ứng.

Issue thuần FE (không có BR) chỉ 1 ticket.

## Ticket nền tảng dùng chung
Component/hook dùng chung (toast, stat-block, workspace-form, template-form, image-upload-field, polling hook) tách thành ticket riêng và là **phụ thuộc** của các ticket dùng chúng — làm trước.

## Định danh / trỏ file
- Mọi chỉ dẫn trỏ đường dẫn thật trong `app/`, `components/`, `lib/`. Không đoán tên file.
- Dựng path qua `lib/paths.ts` (`workspacePath`, `APP_PATHS`), không nối chuỗi.
- Gọi API qua `comviaFetch` / `comviaMultipartFetch` (`lib/comviaFetch.ts`); không `fetch` trực tiếp.
- Type dự kiến chờ backend gắn comment `// PROVISIONAL (BR-xx)`.

## Definition of Done (mặc định cấp ticket)
Repo hiện **chưa có test suite tự động** (`package.json` chỉ có `dev`/`build`/`start`/`lint`, không có `test`). DoD mặc định:
- [ ] `npm run build` xanh.
- [ ] `npm run lint` xanh.
- [ ] Verify thủ công trên trình duyệt (dev server hoặc preview) đúng toàn bộ Acceptance Criteria của ticket.
- [ ] Cập nhật tài liệu liên quan nếu có thay đổi (vd coding-convention khi thêm quy tắc style).

> Nếu PO/SA về sau thiết lập test framework, cập nhật lại DoD này.

— thêm bởi: Team Lead (2026-10-02)
