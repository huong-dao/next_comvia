# Phản hồi Backend cho danh sách yêu cầu FE (BR-01 → BR-11)

Chào team FE. Dưới đây là phản hồi cho cả 11 mục trong `backend-requests.md`. **Cả 11 mục BR-01 → BR-11 đã hoàn tất phần code** (một số là xác nhận hành vi sẵn có); BR-10: endpoint chi tiết workspace chỉ Owner; BR-11: giao dịch ví có field `status`. Tất cả chờ deploy.

> **Lưu ý chung về thời điểm:** toàn bộ code đã viết xong nhưng **chưa commit, chưa deploy** (môi trường local chưa có Postgres nên chưa kiểm chứng end-to-end). Vui lòng **chỉ nối API thật sau khi backend deploy lên server live và báo lại**. Mỗi mục bên dưới ghi rõ mốc.
>
> Field tiền (`amount`, `balance`, `totalTopup`, ...) là kiểu Decimal — qua JSON thường về **chuỗi số** (ví dụ `"1000000"`); FE nên parse number khi hiển thị. Các mốc thời gian (`createdAt`, `sentAt`, `paidAt`, ...) là ISO 8601 UTC.

---

## BR-01 — Billing cá nhân: bỏ bắt buộc Mã số thuế
**(1) Kết luận:** Đã xong code — cá nhân không còn bắt buộc `taxCode`.
**(2) Path + method:** `POST /workspaces` và `PATCH /workspaces/:workspaceId`.
**(3) Field cuối cùng:**
- `billingType = INDIVIDUAL`: bắt buộc `fullName`, `citizenId`, `address`, `invoiceEmail`, `phone`. `taxCode` **optional** (vẫn lưu nếu gửi).
- `billingType = ORGANIZATION`: vẫn bắt buộc `companyName`, `taxCode`, `address`, `invoiceEmail`.
```json
{ "name": "WS", "billing": { "billingType": "INDIVIDUAL",
  "fullName": "Nguyen Van B", "citizenId": "079123456789",
  "address": "...", "invoiceEmail": "a@b.com", "phone": "0901234567" } }
```
**(4) Lưu ý:** FE không gửi `taxCode` cho cá nhân sẽ **không còn bị 400**. Tổ chức thiếu `taxCode` vẫn 400.
**(5) Mốc:** Code xong, chờ deploy.

---

## BR-02 — Analytics overview cho dashboard
**(1) Kết luận:** Đã xong code — endpoint mới, 3 chỉ số theo kỳ + % so kỳ trước.
**(2) Path + method:** `GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year` (mặc định `7d`). Quyền: Owner + Member active.
**(3) Response:**
```json
{
  "period": "7d",
  "range": { "current": {"start":"...","end":"..."}, "previous": {"start":"...","end":"..."} },
  "messagesSent":   { "value": 1200, "changePercent": 12.5 },
  "successRate":    { "value": 98.3, "changePercent": -1.2 },
  "activeTemplates":{ "value": 8,    "changePercent": null }
}
```
- `messagesSent.value`: number. `successRate.value`: number **hoặc null**. `activeTemplates.value`: number.
- `changePercent`: number **hoặc null** (null khi kỳ trước = 0 hoặc thiếu dữ liệu — FE ẩn badge khi null).
**(4) Lưu ý:**
- "Tin nhắn đã gửi" = số MessageLog **có `sentAt`** trong kỳ — **tính cả tin gửi lỗi** (FAILED vẫn có `sentAt`); bản ghi PENDING chưa gửi (`sentAt = null`) tự loại.
- "Tỷ lệ gửi thành công" = `SUCCESS / (SUCCESS + FAILED) * 100`; khi không có tin nào (mẫu số 0) → `successRate.value = null` (FE hiển thị "—").
- "Mẫu tin đang hoạt động" = số template `APPROVED` tại thời điểm gọi (snapshot), nên `changePercent` **luôn null**.
- **Cách so kỳ (CẬP NHẬT — PO chốt):**
  - `period=7d`: kỳ hiện tại = 7 ngày gần nhất tới hiện tại; kỳ trước = 7 ngày kề ngay trước đó.
  - `period=month`: kỳ hiện tại = từ **đầu tháng** tới hiện tại; kỳ trước = đoạn **cùng độ dài đã trôi qua** bắt đầu từ đầu tháng liền trước, **clamp** không vượt quá hết tháng trước. Ví dụ hôm nay 31/3: kỳ hiện tại 1/3→31/3, kỳ trước 1/2→hết tháng 2 (tháng 2 không có ngày 31).
  - `period=year`: tương tự `month` nhưng theo năm (từ đầu năm tới hiện tại; kỳ trước là đoạn cùng độ dài đã trôi qua từ đầu năm liền trước, clamp không vượt hết năm trước).
- `changePercent` = number hoặc `null` (null khi kỳ trước = 0 / thiếu dữ liệu).
- Chỉ số **"Khách hàng tương tác" backend KHÔNG tính** — FE tự hiển thị số demo tĩnh giai đoạn này.
- Mốc kỳ tính theo giờ Việt Nam (Asia/Ho_Chi_Minh).
**(5) Mốc:** Dev đang chỉnh code so kỳ cùng số ngày theo quy tắc trên; chờ deploy.

---

## BR-03 + BR-04 — Model OA mới (record nội bộ 1-1 workspace) + CRUD + upload ảnh + field box "Thông tin OA"
**(1) Kết luận:** Đã xong code — tách record OA nội bộ khỏi kết nối Zalo, có CRUD + 3 endpoint upload ảnh.
**(2) Path + method:**
- `GET  /workspaces/:workspaceId/oa` — đọc record OA (Owner + Member).
- `POST /workspaces/:workspaceId/oa` — "Tạo OA" (Owner). Body: `{ name, code, description? }`.
- `PATCH /workspaces/:workspaceId/oa` — sửa (Owner). Body: `{ name?, code?, description? }`.
- `POST /workspaces/:workspaceId/oa/avatar` — upload avatar (Owner, multipart field `file`).
- `POST /workspaces/:workspaceId/oa/logo-light` — upload logo nền sáng (Owner, `file`).
- `POST /workspaces/:workspaceId/oa/logo-dark` — upload logo nền tối (Owner, `file`).
- Kết nối/ngắt Zalo giữ nguyên ở §6: `GET .../oa/status`, `POST .../oa/connect`, `.../oa/disconnect`.
**(3) Response chung của CRUD + upload (shape thống nhất):**
```json
{
  "id": "OA_ID",
  "workspaceId": "WS_ID",
  "name": "OA Demo",
  "code": "oa-noi-bo-01",
  "description": null,
  "avatarUrl": null,
  "logoLightUrl": null,
  "logoDarkUrl": null,
  "createdByUserId": "USER_ID",
  "createdAt": "...",
  "updatedAt": "...",
  "connection": { "status": "NOT_CONNECTED", "connectedAt": null, "oaId": null }
}
```
- `description`, `avatarUrl`, `logoLightUrl`, `logoDarkUrl`, `createdByUserId` có thể **null**.
- `connection.status`: enum `NOT_CONNECTED` | `CONNECTED` | `TOKEN_EXPIRED` | `CONNECTION_ERROR` | `RECONNECT_REQUIRED` | `DISCONNECTED`. `connection.connectedAt`/`oaId` null khi chưa kết nối.
- Response **không bao giờ** trả access/refresh token.
**(4) Lưu ý hành vi:**
- Thứ tự bắt buộc: **"Tạo OA" (POST) trước, rồi mới "Kết nối" (OAuth)**. Gọi connect hoặc upload ảnh khi chưa tạo OA → `400`.
- **1-1 cứng:** mỗi workspace chỉ 1 OA. Tạo OA lần 2 → `400 "Workspace already has an OA"`.
- Ảnh: chỉ **PNG/JPEG**, **≤ 2MB**. `logo-light`/`logo-dark` bắt buộc **đúng 400×96 px** (sai kích thước → 400). `avatar` không ép kích thước.
- Ảnh lưu trên server, URL dạng `/public/oa/<workspaceId>/<file>` — FE ghép base URL để hiển thị.
- Kết nối OAuth Zalo thành công **KHÔNG ghi đè** `name`/`code`/`avatar`/`logo` (nguồn do user tự quản lý, không đồng bộ 2 chiều). `code` là nhãn nội bộ, không map/đối soát với `oaId` Zalo.
**(5) Mốc:** Code xong, chờ deploy. (Ảnh upload cần verify đường dẫn `/public/` trên server live.)

---

## BR-05 — Bổ sung field template
**(1) Kết luận:** Đã xong code — thêm `type`, `title`, `trackingId`, `secondaryContent`, `otpExpiryMinutes`.
**(2) Path + method:** `POST /workspaces/:workspaceId/templates` (và trả lại ở list/get).
**(3) Field cuối cùng (tên chuẩn backend):**
| Field | Kiểu | Bắt buộc |
|-------|------|----------|
| `name` | string (≥2) | Có |
| `type` | enum `TEXT` \| `TABLE` \| `OTP` | Không — **mặc định `TEXT`** |
| `title` | string | Không |
| `trackingId` | string | Không |
| `content` | string (≥1) | Bắt buộc khi `TEXT`/`TABLE`; bỏ khi `OTP` |
| `secondaryContent` | string | Chỉ dùng khi `type = TABLE` |
| `otpExpiryMinutes` | int (≥1) | Bắt buộc khi `type = OTP` |
| `placeholdersJson` | object | Theo content (TEXT/TABLE) |
**(4) Lưu ý:**
- "Nội dung phụ" → tên chuẩn **`secondaryContent`**. "Số phút hết hạn OTP" → **`otpExpiryMinutes`**.
- `type` và `trackingId` là **giá trị lưu trữ thuần nội bộ** (không map/đối chiếu loại ZNS Zalo, không logic đối soát), nhưng `type` **điều khiển cấu trúc nội dung**: `OTP` thì không nhập `content`/`placeholder` (backend lưu null) mà nhập `otpExpiryMinutes`; `TABLE` thì có thêm `secondaryContent`.
- Template đã `APPROVED` là read-only — sửa field nội dung sẽ bị chặn.
**(5) Mốc:** Code xong, chờ deploy (có migration cộng cột — template cũ tự nhận `type = TEXT`).

---

## BR-06 — Số liệu ví theo tháng
**(1) Kết luận:** Đã xong code — `GET balance` trả thêm khối `monthly`.
**(2) Path + method:** `GET /workspaces/:workspaceId/wallet/balance`.
**(3) Response:**
```json
{
  "ownerUserId": "USER_ID",
  "balance": "500000",
  "totalTopup": "2000000",
  "totalSpent": "1500000",
  "totalRefund": "0",
  "monthly": {
    "toppedUp": { "value": 1000000, "changePercent": 12.0 },
    "used":     { "value": 800000,  "changePercent": -8.0 }
  }
}
```
- `monthly.toppedUp.value` / `monthly.used.value`: number. `changePercent`: number **hoặc null** (null khi tháng trước = 0).
**(4) Lưu ý:**
- `toppedUp` = tổng nạp (`TOPUP_CREDIT`) trong tháng này (giờ VN).
- `used` = tổng chi gửi tin (`MESSAGE_DEBIT`) **trừ** hoàn (`CAMPAIGN_REFUND`) trong tháng; khoản `CAMPAIGN_HOLD` **không** tính (và không phải khoản giữ tạm — trừ thẳng khi chạy lô).
- **Cách so kỳ (CẬP NHẬT — PO chốt):** `changePercent` của "tháng này" dùng **cùng quy tắc so kỳ như analytics `period=month`**: kỳ hiện tại từ đầu tháng tới hiện tại; kỳ trước là đoạn cùng độ dài đã trôi qua từ đầu tháng liền trước, clamp không vượt quá hết tháng trước. `changePercent` = `null` khi tháng trước = 0.
- Nếu workspace chưa có ví → toàn bộ response = `null`.
- Badge ↑12% / ↓8% lấy từ `changePercent` (ẩn khi null).
**(5) Mốc:** Dev đang chỉnh code so kỳ cùng số ngày; chờ deploy.

---

## BR-07 — Lọc transactions theo ngày + nhóm loại
**(1) Kết luận:** Đã xong code — thêm `fromDate`/`toDate`/`types` (và đã sửa luôn lỗi phân trang trước đó không chạy).
**(2) Path + method:** `GET /workspaces/:workspaceId/wallet/transactions`.
**(3) Query params cuối cùng:**
| Param | Kiểu | Mặc định |
|-------|------|----------|
| `offset` | int ≥ 0 | 0 |
| `limit` | int 1–100 | 20 |
| `type` | 1 enum `WalletTransactionType` | — |
| `types` | nhiều enum, gửi `?types=A&types=B` | — |
| `fromDate` | ISO hoặc `YYYY-MM-DD` | — |
| `toDate` | ISO hoặc `YYYY-MM-DD` | — |
**(4) Lưu ý:**
- `types` (lọc nhóm) **ưu tiên hơn** `type` đơn khi gửi cả hai.
- Nếu gửi dạng ngày trần `YYYY-MM-DD`: `fromDate` neo về **00:00:00 giờ VN**, `toDate` về **23:59:59.999 giờ VN** (khớp biên ngày VND). Gửi timestamp ISO đầy đủ thì dùng nguyên.
- **Phân trang nay đã thực sự áp dụng** `offset`/`limit` (trước đây bị cố định 50 bản ghi — đã khắc phục).
**(5) Mốc:** Code xong, chờ deploy.

---

## BR-08 — Poll trạng thái topup
**(1) Kết luận:** Chỉ xác nhận — endpoint đã có và hoạt động cho Owner.
**(2) Path + method:** `GET /topups/:topupCode/status` — **gửi header `x-workspace-id`** (module topup dùng header, không lấy workspace từ path). Quyền: Owner.
**(3) Response:**
```json
{ "id": "...", "topupCode": "TOPUP_xxx", "status": "PENDING",
  "paidAt": null, "amountExclVat": "1000000", "vatAmount": "100000", "amountInclVat": "1100000" }
```
- `status`: enum `TopupStatus` (`PENDING` | `PAID` | ...). `paidAt`: nullable.
**(4) Lưu ý:** FE poll tới khi `status = PAID` rồi gọi lại `GET .../wallet/balance` để số dư tự cập nhật. Không cần WebSocket.
**(5) Mốc:** Đã có sẵn trên code hiện tại — xác nhận lại sau khi deploy bản mới.

---

## BR-09 — PATCH workspace không chặn theo trạng thái
**(1) Kết luận:** Chỉ xác nhận — code **chỉ** chặn theo quyền Owner, **không** chặn theo trạng thái workspace.
**(2) Path + method:** `PATCH /workspaces/:workspaceId` (Owner).
**(3) Field:** như §4.4 (name?/slug?/billing?).
**(4) Lưu ý (ĐÍNH CHÍNH — hành vi HTTP cuối):** Trước đây tài liệu nói "code không chặn theo trạng thái" — **sai ở tầng HTTP**: `WorkspaceContextGuard` chặn mọi workspace non-ACTIVE (403). Dev đã sửa bằng decorator `@AllowWorkspaceStatuses` cho **PATCH + GET detail** chấp nhận `ACTIVE`/`DISABLED`/`SUSPENDED` → 200. Workspace `DELETED` → **HTTP 403**, message **"Workspace is not active (DELETED)"**. MEMBER → 403. FE không mở popup sửa workspace đã xóa.
**(5) Mốc:** Đã code xong, chờ deploy. **Trước khi deploy bản này, PATCH/GET trên `DISABLED`/`SUSPENDED` vẫn trả 403.**

---

## BR-10 — Endpoint chi tiết workspace kèm billing đầy đủ
**(1) Kết luận:** **Đã code xong** (chờ deploy) — endpoint `GET /workspaces/:workspaceId`, **chỉ Owner**.
**(2) Path + method:** `GET /workspaces/:workspaceId`.
**(3) Response (tên field đã chốt):**
```json
{
  "id": "WS_ID", "name": "...", "slug": "...", "status": "ACTIVE", "role": "OWNER",
  "billingProfile": {
    "billingType": "INDIVIDUAL",
    "fullName": "...", "citizenId": "...", "taxCode": null,
    "address": "...", "invoiceEmail": "...", "phone": "...",
    "companyName": null, "representativeName": null
  }
}
```
- `billingProfile` các field theo `billingType` (field không thuộc loại đó = null).
**(4) Lưu ý:** billing chứa dữ liệu nhạy cảm (CCCD, MST). PO đã chốt: **chỉ Owner** gọi được; **Member và người ngoài workspace nhận 403**. `billingProfile` là `null` nếu workspace chưa có billing. GET detail cho phép `ACTIVE`/`DISABLED`/`SUSPENDED` (qua `@AllowWorkspaceStatuses`); workspace `DELETED` → **HTTP 403**, message **"Workspace is not active (DELETED)"**.
**(5) Mốc:** Code xong (gồm chặn `DELETED` qua guard), chờ deploy. Trước deploy, GET detail trên `DISABLED`/`SUSPENDED` vẫn 403.

---

## BR-11 — Giao dịch ví có trường trạng thái không?
**(1) Kết luận (CẬP NHẬT — PO đã đổi quyết định):** **CÓ** — mỗi giao dịch ví **có** field `status`. (Kết luận cũ "không có trạng thái, FE bỏ cột" đã bị PO bác: giao dịch ví không chỉ là topup mà còn trừ tiền gửi tin và các hoạt động khác, nên cần trạng thái hiển thị.) **Đã code xong, chờ deploy; FE GIỮ cột "Trạng thái".**
**(2) Path + method:** `GET /workspaces/:workspaceId/wallet/transactions`.
**(3) Response — shape mỗi giao dịch (sau khi implement):**
```json
{
  "id": "...",
  "transactionCode": "TX_xxx",
  "ownerUserId": "USER_ID",
  "workspaceId": "WS_ID",
  "type": "MESSAGE_DEBIT",
  "status": "SUCCESS",
  "amount": "-500",
  "balanceBefore": "500000",
  "balanceAfter": "499500",
  "sourceType": "message_log",
  "sourceId": "...",
  "createdBy": null,
  "note": null,
  "createdAt": "..."
}
```
Endpoint trả **mảng** các object trên. `createdBy`, `note` nullable.
- `status` ∈ `SUCCESS` | `PENDING` | `FAILED` → nhãn FE: **Thành công** / **Đang xử lý** / **Thất bại**.
- `type` ∈ `TOPUP_CREDIT` | `MESSAGE_DEBIT` | `CAMPAIGN_HOLD` | `CAMPAIGN_REFUND` | `MANUAL_ADJUSTMENT` | `REVERSAL` (đây là **loại** giao dịch, khác với `status`).
**(4) Lưu ý:**
- Thực tế hiện tại: mọi giao dịch ví chỉ được ghi SAU khi hành động nền hoàn tất, nên sau khi thêm field thì **100% bản ghi hiện có và mới đều là `SUCCESS`**. `PENDING`/`FAILED` là giá trị **dành sẵn** cho mở rộng tương lai — trước mắt FE map đủ 3 nhãn nhưng dữ liệu sẽ toàn `SUCCESS`.
- **PO đã chốt (không mở rộng ngữ nghĩa):** (a) topup đang chờ thanh toán **KHÔNG** đổ vào bảng giao dịch ví; (b) `CAMPAIGN_HOLD` **KHÔNG** thành giữ-tạm-thật (trừ thẳng, ghi `SUCCESS`); (c) gửi tin lỗi **KHÔNG** tạo dòng ví `FAILED` (chỉ ghi `MessageLog`).
- Vòng đời "Đang xử lý" của **nạp tiền** vẫn xem ở `GET /topups/:topupCode/status` (BR-08); không đổ vào bảng giao dịch ví.
Có thêm query tùy chọn `status=SUCCESS|PENDING|FAILED` (sai giá trị → 400), dùng chung với `type`, `types`, `fromDate`, `toDate`, `offset`, `limit`. Số liệu "đã nạp/đã dùng tháng này" chỉ tính giao dịch `SUCCESS`.
**(5) Mốc:** Code xong (cột `status` + migration, dữ liệu cũ mặc định `SUCCESS`), chờ deploy. FE giữ cột "Trạng thái", map 3 nhãn trên.

---

## Câu hỏi / việc cần FE (và PO) xác nhận lại
1. **BR-10 — phân quyền billing:** ĐÃ CHỐT chỉ Owner (Member 403). FE không cần xác nhận thêm.
2. **BR-11 — giữ cột trạng thái:** ĐÃ CHỐT + ĐÃ CODE. FE giữ cột, map 3 nhãn. Hiện dữ liệu toàn `SUCCESS`; `PENDING`/`FAILED` là giá trị dành sẵn. PO chốt KHÔNG mở rộng ngữ nghĩa (không đổ topup đang chờ, `CAMPAIGN_HOLD` không giữ-tạm, gửi lỗi không tạo dòng FAILED).
3. **BR-09 — workspace DELETED:** ĐÃ CHỐT — workspace `DELETED` KHÔNG sửa được (PATCH) và KHÔNG đọc chi tiết được (GET), trả **403** "Workspace is not active (DELETED)". ACTIVE/DISABLED/SUSPENDED → 200. FE không mở popup sửa/xem chi tiết cho workspace đã xóa. (Trước deploy bản này, DISABLED/SUSPENDED vẫn 403.)
4. **BR-02 / BR-06 — cách so kỳ (MỚI):** analytics (`7d`/`month`/`year`) và số liệu ví theo tháng dùng quy tắc so kỳ **cùng độ dài đã trôi qua, clamp** (xem BR-02/BR-06). Dev đang chỉnh code so kỳ cùng số ngày; FE không cần đổi shape, chỉ lưu ý ý nghĩa `changePercent`.
5. **Thời điểm nối API:** tất cả mục "code xong" sẽ chỉ chạy đúng **sau khi backend deploy lên server live**. Backend sẽ báo lại khi deploy xong; đề nghị FE nối API thật sau mốc đó.
