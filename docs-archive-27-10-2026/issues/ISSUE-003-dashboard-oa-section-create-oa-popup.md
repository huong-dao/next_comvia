# ISSUE-003: OA trên Comvia — tách "Tạo OA" (record nội bộ) khỏi "Kết nối Zalo thật" (OAuth); section OA trên dashboard

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (nghiệp vụ đã đủ rõ cho SA bắt đầu thiết kế FE — chỉ còn chờ backend chốt model/endpoint BR-03/04 trước khi SA chốt interface spec)
**Phân loại:** Change Request (thay đổi mô hình dữ liệu — không phải sửa UI đơn thuần)
**Màn hình/route liên quan:** `app/app/w/[workspaceId]/dashboard/page.tsx`; `app/app/w/[workspaceId]/oa/page.tsx` (`OaPageContent` — luồng OAuth hiện tại); danh sách template `app/app/w/[workspaceId]/templates/`

## Mô tả gốc từ khách hàng/PO
> - Bên dưới section tổng quan sẽ là section thông tin về OA làm như hình 2. Section này có 2 box.
>   - Bên trái là thông tin OA: bỏ "Danh mục", "Trạng thái" sẽ là "đang kết nối" hoặc "chưa kết nối" (như code hiện tại). Nếu chưa có OA nào cho workspace hiện tại thì có nút "Tạo OA", bấm vào mở popup tạo OA, giao diện popup này hoàn toàn giống hình 3 (Hình đại diện, Logo sáng/tối phải có kích thước 400x96 pixel).
>   - Bên phải lấy ra danh sách template (mẫu tin nhắn), có nút tạo mẫu tin mở popup tạo mẫu tin. (chi tiết popup tạo mẫu tin tách sang ISSUE-004.)

### Làm rõ bổ sung từ PO (2026-10-02)
Hiện tại nút chỉ dùng để **kết nối** một OA đã có sẵn trên Zalo (qua OAuth). PO muốn tách thành **2 hành động riêng biệt**:
1. **"Tạo OA"**: tạo một bản ghi OA mới trên hệ thống Comvia (lưu DB) với đầy đủ thông tin nhập tay qua popup (tên OA, mã code, hình đại diện, logo sáng, logo tối — đúng hình 3), **KHÔNG cần kết nối Zalo thật ngay lúc này**.
2. **"Kết nối"**: một nút riêng (xuất hiện sau khi đã có bản ghi OA) để chạy luồng OAuth hiện tại, liên kết bản ghi OA đó với một Zalo OA thật.

Mục đích nghiệp vụ: mỗi workspace trên Comvia có **đúng 1 OA** (quan hệ 1-1 Workspace↔OA) với đầy đủ thông tin lưu sẵn trong DB, phục vụ các mục đích khác sau này — không phụ thuộc hoàn toàn vào việc đã kết nối Zalo thật hay chưa.

(Hình 2 = `4.png` box OA info + list template "ZBS Template" + "Xem tất cả". Hình 3 = `5.webp` popup "Tạo thông tin Zalo OA": Tên OA, Mã code, Hình đại diện upload, Logo sáng 400x96, Logo tối 400x96, panel checklist, nút Hủy/Tạo OA.)

## Rule/API hiện tại
- `docs/MAIN_RULES.mdc` §11 "Zalo OA Connection": §11.2 "Mỗi workspace tối đa 1 OA"; §11.3 Flow kết nối qua Zalo OAuth; §28 "Mỗi workspace kết nối tối đa 1 Zalo OA ở phase hiện tại".
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §6: chỉ có `GET /oa/status`, `POST /oa/connect` (trả `authorizationUrl`), `POST /oa/disconnect`. **Không có** endpoint tạo/sửa record OA bằng form, không có upload avatar/logo.
- `OaConnectionStatus` (Phụ lục A): `NOT_CONNECTED`, `CONNECTED`, `TOKEN_EXPIRED`, `CONNECTION_ERROR`, `RECONNECT_REQUIRED`, `DISCONNECTED`.
- `GET /oa/status` response (§6.3): `oaName`, `oaId`, `oaAvatarLight/Dark` (null), `connectedAt`, `status` — **không** có "danh mục", "người tạo", "ngày tạo", "mô tả".

## Hành vi thực tế đã verify
- Dashboard hiện **không** có section OA (`dashboard/page.tsx` chỉ có 4 stat card + hàng nút).
- Trang OA riêng (`oa/page.tsx`) chỉ có **một mô hình**: OA = kết nối Zalo qua OAuth. Nút "Kết nối Zalo OA" gọi `POST /oa/connect` → redirect `authorizationUrl` sang Zalo (`oa/page.tsx:83-104`). Không tồn tại khái niệm "record OA nội bộ" tách khỏi "kết nối Zalo".
- **Không tồn tại** bất kỳ form nhập Tên OA / Mã code / upload Hình đại diện / Logo sáng / Logo tối nào trong codebase; cũng chưa có component upload ảnh.

## Hành vi mong đợi (theo mô hình mới PO chốt)
Tách rõ 2 khái niệm:
1. **OA record (Comvia)** — entity do user tự quản lý, lưu DB, quan hệ **1-1 với Workspace** (1-1 cứng, không ngoại lệ — PO chốt). Field tối thiểu:
   - `name` (tên OA), `code` (mã code nhập tay), `avatar` (hình đại diện), `logoLight` (logo sáng 400x96), `logoDark` (logo tối 400x96)
   - `workspaceId` (1-1)
   - trạng thái kết nối Zalo + liên kết tới Zalo OA thật (nếu đã kết nối)
   - **Các field nhập tay (`name`/`avatar`/`logoLight`/`logoDark`) là nguồn dữ liệu ĐỘC LẬP:** khi kết nối OAuth Zalo thành công, dữ liệu Zalo thật **KHÔNG ghi đè** các field này (PO chốt). Kết nối Zalo chỉ bổ sung trạng thái/liên kết (oaId Zalo, token...), không đồng bộ 2 chiều vào field nhập tay.
   - **`code` chỉ là mã/nhãn nội bộ Comvia** (string tự do), **không có vai trò nghiệp vụ** đối soát/map với `oaId` thật của Zalo (PO chốt — có thể dùng sau này).
2. **Kết nối Zalo thật** — giữ nguyên luồng OAuth hiện tại (`POST /oa/connect`/`disconnect`), nhưng gắn kết quả vào OA record đã tạo.

UI:
- Box trái OA info: **bỏ "Danh mục"**; Trạng thái chỉ "đang kết nối" (`CONNECTED`) / "chưa kết nối" (còn lại).
- Nếu workspace **chưa có** OA record: hiện nút "Tạo OA" → popup form (hình 3) → tạo record (không chạy OAuth).
- Nếu **đã có** OA record: **ẩn hẳn "Tạo OA"** (do 1-1 cứng); chỉ còn nút "Sửa" (sửa thông tin record) và "Kết nối" (chạy OAuth nếu chưa kết nối) / trạng thái kết nối.
- Box phải: danh sách template (`GET /templates`) + nút tạo mẫu tin (ISSUE-004) + "Xem tất cả".

## Phân tích tác động
- **Đây là thay đổi mô hình dữ liệu backend đáng kể**, không phải field nhỏ: cần entity OA mới (hoặc mở rộng bảng OA hiện tại) tách bạch "thông tin OA do user quản lý" vs "trạng thái/dữ liệu kết nối Zalo thật".
- **FE phải biểu diễn 2 trạng thái tách biệt**: "đã có OA record" vs "đã kết nối Zalo thật" — 4 tổ hợp (chưa có record / có record-chưa kết nối / có record-đã kết nối / kết nối lỗi). Logic chuyển nút Tạo OA ↔ Sửa ↔ Kết nối. Đây là phần SA cần đánh giá kỹ nhất đợt này.
- Ảnh hưởng `oa/page.tsx` hiện tại (chỉ có mô hình kết nối) — cần tái cấu trúc để phản ánh 2 action.
- Ảnh hưởng điều kiện tiền đề template/messaging: hiện yêu cầu `oa.status === CONNECTED`. Có record OA nhưng chưa kết nối Zalo thì vẫn **không** gửi ZNS được — cần giữ ràng buộc này.
- Popup dùng `components/ui/modal.tsx` (đã có); cần thêm component upload ảnh (chưa có) + validate kích thước 400x96.

## Giả định / Câu hỏi mở
PO đã chốt (2026-10-02) cả 3 câu hỏi mở trước đây — xem mục "Hành vi mong đợi" và "Xử lý":
1. Kết nối OAuth xong **không ghi đè** field nhập tay (độc lập).
2. Mã `code` chỉ là nhãn nội bộ, không đối soát Zalo.
3. 1-1 cứng Workspace↔OA — có record thì ẩn nút "Tạo OA".
- `GIẢ ĐỊNH:` "Trạng thái đang kết nối" = `CONNECTED`; "chưa kết nối" = mọi trạng thái khác. (Chi tiết nhỏ về gộp nhãn, SA có thể chốt khi thiết kế; không chặn.)
- `CÂU HỎI MỞ:` (phát sinh từ hợp đồng thật) Box "Thông tin OA" (hình 2) có dòng "Người tạo" nhưng `GET /oa` chỉ trả `createdByUserId` (không có tên). Hiển thị gì: (a) ẩn dòng "Người tạo"; (b) backend bổ sung tên người tạo; (c) FE gọi thêm API user để map tên? Cần PO/backend quyết.

## Hướng xử lý đề xuất
- **Phụ thuộc backend trước:** backend thiết kế model/endpoint OA mới (xem Cần Backend team) → sau đó SA thiết kế FE (2 action, 4 tổ hợp trạng thái) → Dev.
- Box trái/phải + list template có thể dựng trước phần UI tĩnh, nhưng logic nút Tạo/Sửa/Kết nối chờ model backend.

## Cần Backend team (ưu tiên cao — thay đổi kiến trúc dữ liệu, KHÔNG phải việc nhỏ)
- Thiết kế **model/entity OA mới** (hoặc mở rộng bảng OA hiện có) tách bạch:
  - (a) Thông tin OA do user tự quản lý trên Comvia: `name`, `code`, `avatar`, `logoLight` (400x96), `logoDark` (400x96), quan hệ **1-1 với Workspace**.
  - (b) Trạng thái/dữ liệu kết nối Zalo thật: `oaId` Zalo, token, `connectedAt`, `OaConnectionStatus` — giữ cơ chế OAuth hiện tại.
- **2 nhóm endpoint riêng:**
  - CRUD thông tin OA: `POST`/`PATCH`/`GET /workspaces/:workspaceId/oa` (tạo/sửa/đọc record), + endpoint lưu ảnh avatar/logo (ràng buộc 400x96).
  - Kết nối/ngắt kết nối Zalo: giữ nguyên `POST /oa/connect` / `disconnect` (§6), nhưng gắn kết quả vào OA record.
- Bổ sung field OA info cho `GET /oa` (hoặc status): mô tả, người tạo, ngày tạo, URL avatar/logo (hiện §6.3 không có).
- (Chi tiết: `backend-requests.md` BR-03, BR-04.)

## Xử lý
- **2026-10-02 — PO làm rõ mô hình:** tách "Tạo OA" (record nội bộ, lưu DB, không cần OAuth) khỏi "Kết nối" (OAuth Zalo thật); quan hệ 1-1 Workspace↔OA. Issue report viết lại theo mô hình này.
- **2026-10-02 — PO chốt 3 câu hỏi mở:** (1) kết nối OAuth xong KHÔNG ghi đè field nhập tay — dữ liệu nhập tay độc lập, kết nối Zalo chỉ bổ sung trạng thái/liên kết; (2) mã `code` chỉ là nhãn nội bộ Comvia, không có vai trò nghiệp vụ/đối soát với `oaId` Zalo; (3) 1-1 cứng Workspace↔OA — có record thì ẩn nút "Tạo OA", chỉ còn "Sửa"/"Kết nối".
- **Nghiệp vụ đã đủ rõ cho SA bắt đầu thiết kế FE.** Chỉ còn phụ thuộc backend chốt model/endpoint (BR-03/04) trước khi SA chốt interface spec cuối cùng.
- **2026-10-02 — Backend code xong BR-03/04 (chờ deploy).** Hợp đồng thật (API guide §6.5 OA record, `GET/POST/PATCH /workspaces/:workspaceId/oa` + `POST .../oa/avatar|logo-light|logo-dark`). Mô hình khớp ADR-001 (Phương án B). **Điểm lệch so với thiết kế SA/PROVISIONAL cần SA xem lại trước TICKET-019:**
  1. **Upload ảnh = 3 endpoint multipart riêng** (field `file`), KHÔNG nằm trong body POST/PATCH; và **bắt buộc Tạo OA (POST) TRƯỚC rồi mới upload** (upload/connect khi chưa có record → 400). `oa-record-modal.tsx` hiện gom name/code + 3 ảnh vào 1 lần `onSaved` (mock) → khi nối thật phải orchestrate tuần tự: POST record → 3 lần upload. ADR-001 đã lường trước upload multipart nhưng chưa mô tả thứ tự bắt buộc này.
  2. `createdByUserId` (thật) ≠ `createdByName` (FE provisional/ADR) → box "Người tạo" (hình 2) hiện chỉ có **userId**, không có tên. Cần quyết hiển thị gì (xem Câu hỏi mở).
  3. `connection` đã **nhúng trong response `GET /oa`** (không cần gọi riêng `/oa/status` cho record) — ADR đã dự phòng; FE hợp nhất, giữ 3 trạng thái UI.
  4. Ràng buộc ảnh thật: **PNG/JPEG, ≤2MB**, logo đúng 400×96. `image-upload-field.tsx` hiện validate 400×96 nhưng **chưa chặn ≤2MB và chưa giới hạn PNG/JPEG** → cần bổ sung để tránh backend trả 400.

## Thiết kế SA (2026-10-02)
- **Quyết định kiến trúc lớn → có ADR: `docs/architecture/adr/adr-001.md` (Accepted — PO duyệt 2026-10-02).** Tách FE thành 2 trục độc lập (record OA Comvia vs kết nối Zalo thật) → 3 trạng thái UI: (1) chưa có record → "Tạo OA"; (2) có record, chưa/lỗi kết nối → info + "Sửa" + "Kết nối"/"Kết nối lại", ẩn hẳn "Tạo OA"; (3) có record, đã kết nối → info + "Đang kết nối" + "Sửa" + "Ngắt kết nối". Tiền đề gửi ZNS giữ `status === CONNECTED`.
- **Interface spec DỰ KIẾN** (2 nhóm endpoint CRUD record + OAuth connect) nằm trong ADR-001, đánh dấu PROVISIONAL (BR-03/04) — Dev chỉ đối chiếu/sửa tên field khi backend xong.
- **Domain component mới `components/oa/`:** `oa-info-box.tsx`, `oa-record-modal.tsx`, `image-upload-field.tsx`. Tái cấu trúc `app/app/w/[workspaceId]/oa/page.tsx` theo 3 trạng thái.
- **Upload ảnh (avatar + logo 400x96):** codebase ĐÃ có pattern upload — `<input type="file">` + `FormData` + `comviaMultipartFetch` (dùng ở `components/admin/issue-invoice-pdf-modal.tsx` và import CSV campaign). Tái dùng, KHÔNG phát minh tầng mới; chỉ thêm component `image-upload-field.tsx` có validate kích thước 400x96 client-side + preview. Ghi ở `coding-convention.md`.
- **Thứ tự còn lại:** UI tĩnh (box trái/phải, list template, layout popup) dựng được ngay. Logic nút Tạo/Sửa/Kết nối + CRUD + upload chờ backend chốt BR-03/04 trước khi chốt tên field/path. Team Lead có thể chẻ ticket phần UI tĩnh; ticket logic/API để sau backend.

### Đối chiếu hợp đồng backend BR-03/04 (2026-10-02) — SA cập nhật ADR-001
Hợp đồng thật (`backend-responses.md`) đã về; SA đối chiếu với thiết kế FE. Quyết định kiến trúc ADR-001 (Accepted) **giữ nguyên** (2 trục → 3 trạng thái UI); chỉ cập nhật phần interface + orchestration theo hợp đồng thật:
- **Upload ảnh tách 3 endpoint** (`/oa/avatar`, `/oa/logo-light`, `/oa/logo-dark`, field `file`), phải **sau** POST record (`{name, code, description?}`); upload/connect trước khi có record → 400; tạo lần 2 → 400 (1-1 cứng). Orchestration tuần tự + rollback/thông báo khi record đã tạo nhưng upload lỗi → chẻ ở TICKET-019.
- **`connection` nhúng trong `GET /oa`** → dashboard box đọc trạng thái kết nối từ record, không cần gọi `/oa/status` song song (ADR đã dự phòng). 3 trạng thái UI không đổi.
- **Ảnh:** bổ sung validate client ≤2MB + PNG/JPEG (ngoài 400×96) vào `image-upload-field.tsx`.
- **Prefill ảnh edit:** backend trả URL, không phải File → `image-upload-field` nhận thêm `existingUrl` (hiện ảnh cũ), chỉ upload ảnh user chọn mới. PO ủy quyền SA chốt.
- **"Người tạo":** `GET /oa` chỉ trả `createdByUserId`, không có tên → **ẩn dòng "Người tạo"** đến khi backend thêm tên (PO ủy quyền SA chốt). Box hiện đã không render dòng này.
- **Modal rộng:** thêm prop `size` cho `components/ui/modal.tsx` để popup Tạo OA khớp layout 2 cột (PO ủy quyền SA chốt). Ghi ở `coding-convention.md`.
- **Sẵn sàng:** TICKET-019 (và sửa `modal.tsx`/`image-upload-field.tsx`) đủ thông tin để Team Lead cập nhật; chỉ chờ backend deploy live trước khi Dev nối API thật.
