# Backend Requests — tổng hợp từ loạt yêu cầu PO (dashboard + workspace + template + ví + OA)

Tài liệu này gom toàn bộ điểm cần **backend NestJS (`e-Nest-comvia`)** hỗ trợ phát sinh từ các issue bên dưới. FE không tự sửa `.mdc`; mọi thay đổi rule/DTO/schema cần backend + PO chốt rồi đồng bộ lại `docs/MAIN_RULES.mdc` / `docs/FRONTEND_API_GUIDE_NEXTJS.mdc`.

Trạng thái mỗi mục: **Cần xác nhận** (có thể đã hỗ trợ, chờ backend confirm) / **Cần làm mới** (endpoint/field/schema chưa có).

---

## Trạng thái backend (cập nhật 2026-10-02 theo `backend-responses.md`)

> **Lưu ý thời điểm:** backend đã viết xong code BR-01→BR-09 + BR-11 nhưng **CHƯA deploy** (local chưa có Postgres). FE **chỉ nối API thật sau khi backend báo deploy lên server live**. Hợp đồng API thật đã được backend ghi vào `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` (bản backend đè bản FE) — coi file đó là nguồn thật.

| BR | Trạng thái | Khớp thiết kế FE/PROVISIONAL? |
|----|-----------|------------------------------|
| BR-01 | Code xong, chờ deploy | Khớp — `workspace-form.tsx` đã bỏ `taxCode` cho cá nhân |
| BR-02 | Code xong, chờ deploy | **Lệch tên field:** FE `deltaPercent` → thật `changePercent`; `successRate.value`/`changePercent` **nullable**; `activeTemplates.changePercent` luôn null |
| BR-03/04 | Code xong, chờ deploy | **Lệch:** upload = 3 endpoint riêng (`/oa/avatar`,`/oa/logo-light`,`/oa/logo-dark`); **phải Tạo OA (POST) trước rồi mới upload**; `createdByUserId` (không phải tên); FE chưa validate ≤2MB + PNG/JPEG |
| BR-05 | Code xong (có migration), chờ deploy | **Lệch enum:** FE `bang/van_ban/otp` → thật `TABLE/TEXT/OTP`; tên field khác đều khớp. Mở khoá TICKET-018 (bỏ disable OTP) |
| BR-06 | Code xong, chờ deploy | **Lệch tên field:** FE `topupThisMonth/spentThisMonth`+`deltaPercent` → thật `monthly.toppedUp/used`+`changePercent` (nullable) |
| BR-07 | Code xong, chờ deploy | **Lệch cơ chế:** thật có `offset/limit` (server-side) + `types` + `fromDate/toDate`; FE đang phân trang client-side + filter ngày chưa wire |
| BR-08 | Có sẵn, xác nhận | Khớp — poll `GET /topups/:code/status` (header `x-workspace-id`) |
| BR-09 | **ĐÍNH CHÍNH (2026-10-03):** code xong, chờ deploy | **Lệch:** `DELETED` → **403** "Workspace is not active (DELETED)"; `ACTIVE`/`DISABLED`/`SUSPENDED` → 200 (qua `@AllowWorkspaceStatuses` cho PATCH + GET detail). FE+ISSUE/TICKET trước ghi "DELETED không chặn" → **phải sửa: ẩn/khoá nút Sửa với workspace DELETED**. (Trước deploy, DISABLED/SUSPENDED vẫn 403.) |
| BR-10 | **ĐÃ XONG (2026-10-03)**, chờ deploy | `GET /workspaces/:workspaceId` → `{id,name,slug,status,role,billingProfile\|null}`, **chỉ Owner** (Member/ngoài → 403), billingProfile lồng theo billingType. → **mở khoá TICKET-015 phần B (prefill)** sau deploy |
| BR-11 | **ĐẢO NGƯỢC (2026-10-03):** CÓ field `status`, code xong, chờ deploy | **FE phải KHÔI PHỤC cột "Trạng thái"** (TICKET-017 vừa gỡ). `status` ∈ SUCCESS/PENDING/FAILED → Thành công/Đang xử lý/Thất bại (hiện data toàn SUCCESS); thêm query `status`. |

| BR-12 | Cần xác nhận (không build) | `description` OA đã hỗ trợ; chỉ xác nhận max length + clear ở PATCH. FE thêm field Mô tả vào popup + hiển thị ở box |

> **so-kỳ (BR-02/BR-06, PO chốt 2026-10-03):** `changePercent` so với **kỳ trước cùng độ dài đã trôi qua, clamp** không vượt hết tháng/năm trước (month/year); 7d là 7 ngày kề trước. **Không đổi shape** — FE chỉ lưu ý ý nghĩa `changePercent`. BR-02 thêm: "Tin nhắn đã gửi" tính cả tin `FAILED` (có `sentAt`), loại `PENDING`.

---

## BR-01 — Billing cá nhân: bỏ bắt buộc Mã số thuế (PO ĐÃ DUYỆT — yêu cầu dứt khoát)
- **Issue liên quan:** ISSUE-001, ISSUE-007
- **Loại:** Cần làm (sửa logic validate DTO)
- **Yêu cầu:** Sửa validate DTO `billing` cho `billingType = INDIVIDUAL` ở `POST /workspaces` và `PATCH /workspaces/:id`: `taxCode` **không còn bắt buộc** (bỏ `@IsNotEmpty()`, cho optional). Vẫn **giữ bắt buộc** `taxCode` khi `billingType = ORGANIZATION`.
- **Lý do:** PO đã duyệt CR ISSUE-001 (2026-10-02): đổi rule — billing cá nhân không bắt buộc mã số thuế. `docs/MAIN_RULES.mdc` §5.2.3.B và `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §4.1 đã được cập nhật theo rule mới. Hiện DTO backend đang bắt buộc theo rule cũ → FE bỏ gửi `taxCode` cho cá nhân sẽ bị 400 (ValidationPipe) nếu backend chưa sửa.

## BR-02 — Endpoint analytics/overview cho dashboard (PO đã chốt định nghĩa chỉ số)
- **Issue liên quan:** ISSUE-002
- **Loại:** Cần làm mới
- **Yêu cầu:** Endpoint aggregate theo workspace + kỳ lọc, ví dụ `GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year`. Trả cho mỗi chỉ số: giá trị kỳ hiện tại + % thay đổi so với **kỳ liền trước cùng độ dài** (7 ngày trước đó / tháng trước / năm trước).
- **Backend CẦN tính 3/4 chỉ số:**
  1. **Tin nhắn đã gửi** — số bản ghi tin đã gửi trong kỳ.
  2. **Mẫu tin đang hoạt động** = số template trạng thái `APPROVED`.
  3. **Tỷ lệ gửi thành công** = `SUCCESS / (SUCCESS + FAILED) * 100` dựa trên `MessageLog.status` trong kỳ (`MessageStatus`: PENDING/SUCCESS/FAILED).
- **Chỉ số KHÔNG cần backend:** "Khách hàng tương tác" — FE **hardcode một con số tĩnh tạm (demo)** giai đoạn này, không phải số thật, backend không phải làm gì cho chỉ số này.
- **Lý do:** API guide hiện **không có** endpoint analytics/overview nào. FE đang tự đếm từ `GET /messages/logs?limit=50` → không thể cho số liệu theo kỳ hay % so với kỳ trước.

## BR-03 — Model/entity OA mới: tách "thông tin OA (Comvia)" khỏi "kết nối Zalo thật" (PO đã làm rõ — ƯU TIÊN CAO, thay đổi kiến trúc dữ liệu)
- **Issue liên quan:** ISSUE-003
- **Loại:** Cần làm mới — **thay đổi mô hình dữ liệu đáng kể, KHÔNG phải field nhỏ**
- **Bối cảnh (PO làm rõ 2026-10-02):** tách thành 2 hành động: (1) "Tạo OA" = tạo record OA nội bộ trên Comvia (nhập tay, lưu DB, không cần OAuth ngay); (2) "Kết nối" = chạy OAuth Zalo hiện tại để liên kết record đó với Zalo OA thật. Mỗi workspace có **đúng 1 OA** (quan hệ 1-1).
- **Yêu cầu:**
  - Thiết kế **model/entity OA mới** (hoặc mở rộng bảng OA hiện có) tách bạch:
    - (a) Thông tin OA user tự quản lý: `name`, `code` (mã code nhập tay), `avatar`, `logoLight` (400x96), `logoDark` (400x96); quan hệ **1-1 với Workspace**.
    - (b) Trạng thái/dữ liệu kết nối Zalo thật: `oaId` Zalo, token, `connectedAt`, `OaConnectionStatus` — giữ cơ chế OAuth hiện tại.
  - **2 nhóm endpoint riêng:**
    - CRUD thông tin OA: `POST` / `PATCH` / `GET /workspaces/:workspaceId/oa` (tạo/sửa/đọc record) + endpoint lưu ảnh avatar/logo (ràng buộc 400x96).
    - Kết nối/ngắt kết nối Zalo: giữ nguyên `POST /oa/connect` / `disconnect` (§6), gắn kết quả vào OA record.
- **Lý do:** Hiện backend chỉ có **một** mô hình: OA = kết nối Zalo qua OAuth (`POST /oa/connect`). Không có khái niệm "record OA nội bộ" tách khỏi kết nối, không có CRUD + upload ảnh. API guide §6 và `MAIN_RULES.mdc` §11.3 đều chỉ mô tả OAuth.
- **Quyết định PO đã chốt (2026-10-02) — ràng buộc schema:**
  - Field nhập tay (`name`, `avatar`, `logoLight`, `logoDark`) là **nguồn dữ liệu độc lập**: kết nối OAuth Zalo thành công **KHÔNG ghi đè** các field này; **không đồng bộ 2 chiều** với Zalo. Dữ liệu kết nối (oaId Zalo, token, trạng thái) lưu tách, chỉ bổ sung thêm.
  - `code` là **string tự do, nhãn nội bộ Comvia**, không map/validate/đối soát với `oaId` thật của Zalo (hiện chưa có vai trò nghiệp vụ).
  - Quan hệ **1-1 cứng Workspace↔OA**, không ngoại lệ — backend nên enforce (mỗi workspace tối đa & đúng 1 OA record).

## BR-04 — Field OA info cho box "Thông tin OA" (gắn với model BR-03)
- **Issue liên quan:** ISSUE-003
- **Loại:** Cần làm mới (bổ sung field, cùng với model BR-03)
- **Yêu cầu:** `GET /workspaces/:workspaceId/oa` (record OA) trả: mô tả OA, người tạo, ngày tạo, URL avatar/logoLight/logoDark, trạng thái kết nối.
- **Lý do:** Hình 2 (box OA info) hiển thị các field này nhưng response §6.3 hiện chỉ có `oaName`, `oaId`, `oaAvatarLight/Dark` (null), `connectedAt`, `status`.

## BR-05 — Bổ sung field template: `type`, `trackingId`, `title`, "nội dung phụ", field phút OTP (PO đã chốt vai trò field)
- **Issue liên quan:** ISSUE-004
- **Loại:** Cần làm mới (DTO + schema)
- **Yêu cầu:** Thêm vào template DTO `POST /workspaces/:id/templates` (và trả lại ở list/get):
  - `type` — enum 3 giá trị (dạng bảng / dạng văn bản / dạng OTP). **Chỉ là string lưu trữ, thuần nội bộ Comvia**, KHÔNG cần logic đối chiếu/map với loại ZNS thật của Zalo.
  - `trackingId` — string **user nhập tự do, chỉ lưu**, không có logic nghiệp vụ.
  - `title` (tựa đề).
  - **"Nội dung phụ"** — field **mới hoàn toàn** chưa có trong DTO hiện tại, chỉ dùng khi `type = dạng bảng`. Đề xuất tạm tên `secondaryContent`; **backend đặt tên chuẩn**.
  - **Field phút hết hạn OTP** — khi `type = OTP`, template KHÔNG có `content`/`placeholdersJson` tự nhập, thay bằng một field số phút. Đề xuất tạm `otpExpiryMinutes`; **backend đặt tên chuẩn + xác nhận cách lưu khi type=OTP**.
- **Lý do:** API guide §7.1 DTO create template chỉ có `name`, `content`, `placeholdersJson`. Các field trên chưa tồn tại → FE không lưu được; ValidationPipe sẽ loại field lạ.
- **Cần backend chốt:** tên chính xác của "nội dung phụ" và field phút OTP; xác nhận `type`/`trackingId` chỉ là string lưu trữ (không logic).

## BR-06 — Aggregate ví theo tháng ("Đã nạp tháng này", "Đã sử dụng tháng này", % so với tháng trước)
- **Issue liên quan:** ISSUE-005
- **Loại:** Cần làm mới
- **Yêu cầu:** Số liệu ví theo tháng: tổng đã nạp tháng này, tổng đã dùng (gửi tin) tháng này, và % so với tháng trước.
- **Lý do:** `GET /wallet/balance` §9.1 chỉ trả số **lũy kế** (`totalTopup`, `totalSpent`), không theo kỳ/tháng, không có % so với tháng trước (hình 7 có badge ↑12% / ↓8%).

## BR-07 — Filter transactions theo ngày
- **Issue liên quan:** ISSUE-005
- **Loại:** Cần xác nhận / có thể bổ sung
- **Yêu cầu:** `GET /wallet/transactions` hỗ trợ `fromDate` / `toDate` (và lọc theo nhóm loại giao dịch).
- **Lý do:** API guide §9.2 hiện chỉ tài liệu hóa tham số `?type=`; hình 7 yêu cầu lọc Từ ngày/Đến ngày.

## BR-08 — Xác nhận poll trạng thái topup cho cập nhật số dư không reload
- **Issue liên quan:** ISSUE-005
- **Loại:** Cần xác nhận (có thể đã hỗ trợ)
- **Yêu cầu:** Xác nhận FE có thể poll `GET /topups/:topupCode/status` (header `x-workspace-id`) tới khi `status = PAID`, rồi refetch `GET /wallet/balance` để số dư tự tăng.
- **Lý do:** API guide §9.5 đã nêu "FE nên poll endpoint này"; chỉ cần backend đảm bảo endpoint hoạt động ổn cho OWNER. (Không cần WebSocket.)

## BR-09 — Xác nhận PATCH workspace không chặn theo trạng thái
- **Issue liên quan:** ISSUE-007
- **Loại:** Cần xác nhận
- **Yêu cầu:** Xác nhận `PATCH /workspaces/:workspaceId` cho Owner sửa được ở **mọi** trạng thái (`ACTIVE`, `DISABLED`, `SUSPENDED`).
- **Lý do:** PO yêu cầu "không giới hạn trạng thái, miễn là Owner". API guide §4.4 không nêu chặn theo status nhưng cần backend confirm code thực tế không chặn.
- **ĐÍNH CHÍNH backend (2026-10-03):** phản hồi trước ("code không chặn theo status") **sai ở tầng HTTP** — `WorkspaceContextGuard` vốn chặn mọi workspace non-ACTIVE (403). Dev thêm decorator `@AllowWorkspaceStatuses` cho **PATCH + GET detail** → chấp nhận `ACTIVE`/`DISABLED`/`SUSPENDED` (200). **`DELETED` → HTTP 403** "Workspace is not active (DELETED)". MEMBER → 403.
- **HỆ QUẢ FE:** workspace `DELETED` KHÔNG sửa/đọc chi tiết được → FE phải **ẩn/khoá nút "Sửa Workspace" với workspace `DELETED`** (hiện `workspaces/page.tsx` hiện nút cho mọi workspace Owner, không guard status). Trước deploy bản này, `DISABLED`/`SUSPENDED` vẫn 403.

## BR-10 — Endpoint chi tiết workspace kèm billing đầy đủ (prefill popup Sửa Workspace)
- **Issue liên quan:** ISSUE-007 (TICKET-008)
- **Loại:** Cần làm mới
- **Ưu tiên:** Trung bình
- **Yêu cầu:** Endpoint `GET /workspaces/:workspaceId` trả chi tiết workspace gồm **billing profile đầy đủ** (`billingProfile` lồng với field theo `billingType`, field không thuộc loại = null).
- **TRẠNG THÁI: ĐÃ CODE XONG (2026-10-03), chờ deploy.** Shape chốt: `{ id, name, slug, status, role, billingProfile: { billingType, fullName?, citizenId?, taxCode?, address?, invoiceEmail?, phone?, companyName?, representativeName? } | null }` (`billingProfile = null` nếu workspace chưa có billing).
- **PHÂN QUYỀN: chỉ OWNER** gọi được; **Member và người ngoài workspace → 403**. Workspace `DELETED` → **403** (cùng guard BR-09); `ACTIVE`/`DISABLED`/`SUSPENDED` → 200.
- **HỆ QUẢ FE:** **mở khoá TICKET-015 phần B (prefill billing)** sau deploy — popup Sửa gọi `GET /workspaces/:id`, đổ `billingProfile` vào `WorkspaceForm`. Xử lý `billingProfile = null`.
- **Lý do:** API guide §4 trước không có endpoint lấy chi tiết workspace. Nay đã có → popup Sửa prefill được billing thật.

## BR-11 — Giao dịch ví có trường trạng thái không? (cột "Trạng thái" bảng giao dịch)
- **Issue liên quan:** ISSUE-005 (TICKET-011)
- **Loại:** Cần xác nhận (ảnh hưởng giữ/bỏ cột UI)
- **Ưu tiên:** Trung bình
- **Yêu cầu:** Xác nhận response `GET /workspaces/:workspaceId/wallet/transactions` **có** trường trạng thái cho mỗi giao dịch không.
- **KẾT QUẢ ĐẢO NGƯỢC (2026-10-03, PO đổi quyết định):** **CÓ** field `status` (kết luận cũ "không có, FE bỏ cột" đã bị PO bác). **Code xong, chờ deploy.**
  - `status` ∈ `SUCCESS` | `PENDING` | `FAILED` → nhãn FE **Thành công** / **Đang xử lý** / **Thất bại**. Hiện **100% bản ghi = `SUCCESS`**; `PENDING`/`FAILED` là giá trị **dành sẵn** cho tương lai (PO chốt KHÔNG mở rộng ngữ nghĩa: topup chờ không đổ vào ví, `CAMPAIGN_HOLD` trừ thẳng, gửi lỗi không tạo dòng ví FAILED).
  - Thêm query tùy chọn `status=SUCCESS|PENDING|FAILED` (sai → 400), dùng chung `type/types/fromDate/toDate/offset/limit`.
- **HỆ QUẢ FE:** **KHÔI PHỤC cột "Trạng thái"** trong `wallet-section.tsx` (TICKET-017 vừa gỡ theo kết luận cũ), map 3 nhãn + (tùy chọn) thêm filter `status`. Sửa lại ghi chú "BR-11 bỏ cột" trong ISSUE-005/TICKET-011/017/board.
- **Lý do cũ (đã lỗi thời):** §9.2 trước không mô tả shape; nay API guide §9.2 bản backend đã có `status`.

## BR-12 — Xác nhận quy tắc field `description` của OA record (ISSUE-008)
- **Issue liên quan:** ISSUE-008
- **Loại:** Cần xác nhận (KHÔNG cần build — `description` đã hỗ trợ ở `POST/PATCH /workspaces/:id/oa` + trả ở response, §6.5/BR-03-04)
- **Yêu cầu backend xác nhận 2 điểm** (để FE validate + cho phép xoá mô tả đúng):
  1. **Độ dài tối đa** của `description` (bao nhiêu ký tự)? Lỗi trả gì nếu vượt?
  2. **PATCH** có chấp nhận **chuỗi rỗng `""`** hoặc **`null`** để **xoá** mô tả không (và cách nào là chuẩn)?
- Nếu không có giới hạn độ dài và PATCH chấp nhận rỗng/null để clear → trả lời ngắn vậy là đủ, FE không cần gì thêm.
