# TICKET-019: Tích hợp — CRUD record OA + orchestrate upload ảnh + refactor trang OA (BR-03/04)

**Issue:** ISSUE-003
**Rule/Thiết kế liên quan:** ADR-001 (đã cập nhật theo hợp đồng thật); `backend-responses.md` BR-03/BR-04; `docs/architecture/coding-convention.md` mục "Upload ảnh", "Modal dùng chung"; open-items (SA đối chiếu 2026-10-02)
**Độ ưu tiên:** Medium
**Phụ thuộc vào:** TICKET-012, TICKET-013, TICKET-014, TICKET-020, TICKET-021
**Trạng thái (audit 26/10/2026):** Có triển khai trong source; chưa nghiệm thu E2E. Xem bảng 25 ticket trong [audit repo](../audits/2026-10-26-repo-audit.md).

## Mục tiêu
Thay record OA mock bằng CRUD thật + upload ảnh thật (orchestrate tuần tự theo hợp đồng); tái cấu trúc trang OA theo 3 trạng thái với dữ liệu thật; hợp nhất `connection` nhúng trong `GET /oa`.

## Chỉ dẫn code
- Hợp đồng đã chốt (BR-03/04). Chỉ nối API thật **sau khi backend deploy server live** (upload cần verify đường dẫn `/public/` trên server).
- Component phụ trợ đã sẵn ở TICKET-020 (`Modal` prop `size`) + TICKET-021 (`image-upload-field` `existingUrl` + validate 2MB/PNG-JPEG) — phải xong trước.

### 1. Orchestrate submit record + upload ảnh (`components/oa/oa-record-modal.tsx`, TICKET-012)
- Thứ tự backend ép: **POST record trước, rồi mới upload ảnh / connect**. Upload/connect khi chưa có record → 400; tạo lần 2 → 400 (1-1 cứng).
- Luồng submit mode create:
  1. `POST /workspaces/:workspaceId/oa` body `{ name, code, description? }`.
  2. Nếu OK, lần lượt upload từng ảnh user đã chọn: `POST /oa/avatar` → `/oa/logo-light` → `/oa/logo-dark` (multipart field `file`, qua `comviaMultipartFetch`, KHÔNG tự set `Content-Type`).
- Mode edit: `PATCH /workspaces/:workspaceId/oa` body `{ name?, code?, description? }`; chỉ upload ảnh user **thực sự chọn mới** (ảnh giữ nguyên = `value` null + `existingUrl` → không gọi upload).

### 2. Xử lý lỗi từng bước (KHÔNG rollback toàn bộ)
- Nếu POST record OK nhưng một bước upload lỗi → **KHÔNG mất record**; báo rõ "record đã tạo, ảnh X chưa tải lên — thử lại upload". Chuyển modal về **mode edit** (ảnh đã OK giữ preview từ URL qua `existingUrl`, ảnh lỗi cho chọn lại).
- Đảm bảo retry **không double-create** record (sau khi đã tạo thì mọi thao tác tiếp theo là PATCH/upload, không POST lại).

### 3. Đổi type theo hợp đồng (gỡ PROVISIONAL)
- `OaRecord`: `id, workspaceId, name, code, description|null, avatarUrl|null, logoLightUrl|null, logoDarkUrl|null, createdByUserId|null, createdAt, updatedAt, connection`. `connection` **nhúng** trong response `GET /oa` (`{ status, connectedAt|null, oaId|null }`).
- `connection.status` enum: `NOT_CONNECTED|CONNECTED|TOKEN_EXPIRED|CONNECTION_ERROR|RECONNECT_REQUIRED|DISCONNECTED`.
- Gỡ nhãn `// PROVISIONAL (BR-03/04)` trong domain `components/oa/`.

### 4. `oa-info-box.tsx` (TICKET-013) + dashboard
- Đọc record thật qua `GET /workspaces/:workspaceId/oa`; suy 3 trạng thái từ `record` + `connection` **nhúng** — **bỏ gọi `/oa/status` song song** cho box dashboard (dùng `connection` trong `GET /oa`).
- Ghép base URL cho `avatarUrl/logoLightUrl/logoDarkUrl` (`/public/oa/<wsId>/<file>`).
- Giữ: box ẩn dòng "Người tạo" (chỉ có `createdByUserId`, không tên — PO ủy quyền chốt); "Tạo OA" ẩn khi đã có record.

### 5. Tái cấu trúc `app/app/w/[workspaceId]/oa/page.tsx`
- Chuyển từ mô hình chỉ-kết-nối (hiện dùng `GET /oa/status`) sang phản ánh record + connection theo 3 trạng thái ADR-001 (tái dùng `oa-info-box` + `oa-record-modal`).
- Giữ tiền đề gửi ZNS chỉ khi `connection.status === CONNECTED`. Nút Kết nối/Ngắt dùng OAuth hiện có (`POST /oa/connect`/`disconnect`).

## Acceptance Criteria (cấp code)
- [ ] Tạo record OA: POST record → upload avatar/logo-light/logo-dark tuần tự thành công (logo 400×96, ≤2MB, PNG/JPEG).
- [ ] Upload lỗi một bước không mất record; modal chuyển edit, retry không double-create.
- [ ] 3 trạng thái OA suy từ `record` + `connection` nhúng (`GET /oa`); không còn gọi `/oa/status` song song cho box dashboard.
- [ ] `oa/page.tsx` phản ánh record + connection; gửi ZNS vẫn yêu cầu `CONNECTED`.
- [ ] Ảnh public ghép base URL đúng; box ẩn dòng "Người tạo".
- [ ] Không còn type PROVISIONAL (BR-03/04) trong `components/oa/`.

## Definition of Done
(Theo `docs/tickets/conventions.md`: build + lint xanh; verify thủ công sau khi backend deploy — tạo/sửa/đọc record, upload ảnh, kết nối/ngắt, kiểm 3 trạng thái + đường dẫn `/public/`.)
