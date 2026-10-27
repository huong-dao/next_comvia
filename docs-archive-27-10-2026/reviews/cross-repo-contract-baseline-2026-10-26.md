# Baseline contract FE ↔ BE — 2026-10-26

## Quyết định về nguồn tài liệu

Tài liệu này là **baseline đối chiếu source local và deployment** giữa `D:\Next\next_comvia` (`dev`) và `D:\Nest\backend_comvia` (`dev`) tại ngày 2026-10-26. Runtime đang deploy là `https://app.comvia.cloud` và API là `https://api.comvia.cloud/api/v1`; người vận hành xác nhận mọi thay đổi được deploy để chạy thử trên server. FE hiện đang vận hành đúng theo contract FE đã được chấp nhận; không dùng checkout backend cục bộ để tự kết luận một API/route FE là lỗi. Khi các file cũ mâu thuẫn nhau, dùng thứ tự sau:

1. Hành vi deployment `app.comvia.cloud` ↔ `api.comvia.cloud/api/v1` là runtime contract ưu tiên cao nhất. Chỉ đánh dấu “đã xác minh live” khi có request/luồng đã kiểm tra; không suy diễn response cần JWT từ HTTP công khai.
2. Source FE là contract hành vi của client đang chạy. `prisma/schema.prisma`, controller/DTO/service BE chỉ là contract **as-is của checkout BE cục bộ**; mọi khác biệt với FE phải được xác minh trên backend đang phục vụ FE hoặc branch/release tương ứng.
3. `docs/business/business-rules.md` là yêu cầu nghiệp vụ; một yêu cầu chưa có endpoint vẫn phải giữ là **thiếu triển khai**, không sửa xuống theo code.
4. `docs/architecture/north-star.md` mô tả kiến trúc as-is.
5. `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` và `docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc` chỉ mô tả API đã có hoặc ghi rõ thiếu triển khai. Không duy trì hai contract khác nhau ở hai repo.
6. `docs/reviews/repository-audit-2026-10-26.md` và file này là trạng thái/gap, không thay business rules.

`docs/` đang bị Git ignore ở backend; tài liệu là artifact local cho tới khi dự án chọn cơ chế versioning riêng. Không suy luận rằng mọi máy đã có cùng bản tài liệu.

## Contract đã xác nhận

| Chủ đề | Contract hiện hành | Bằng chứng |
|---|---|---|
| Base URL | FE phải dùng `NEXT_PUBLIC_API_BASE_URL` có `/api/v1`; fallback FE `http://localhost:3000` thiếu prefix nên chỉ phù hợp nếu env luôn được cấu hình | `src/main.ts`, `lib/comviaFetch.ts` |
| Workspace context | Phần lớn route workspace dùng `:workspaceId` + JWT. Topup dùng `x-workspace-id` + JWT và OWNER | `WorkspaceContextGuard`, `TopupsController` |
| Profile | `GET /auth/me`; `PATCH /users/me` chỉ nhận `fullName` (>=2 ký tự) | `UsersController`, `UpdateMyProfileDto` |
| Members | FE đang dùng field `role`; checkout BE cục bộ trả `memberRole`. Cần backend compatibility/adapter tại môi trường FE đang dùng, không coi FE là lỗi. Endpoint accept local là `POST /workspaces/:id/invitations/accept` | `MembersService`, `MembersController`, route FE |
| Template | `DRAFT → SUBMITTED → PENDING_ZALO_APPROVAL → APPROVED|DISABLED`; staff trả Owner sửa bằng `return-to-submitted`, tạo `requiresOwnerRevision=true`. Không còn enum `REJECTED` | `schema.prisma`, `TemplatesService/Controller` |
| OA | FE profile CRUD/upload, status/connect/disconnect qua `/workspaces/:id/oa...`; OAuth callback là API route riêng | OA controllers |
| Wallet/topup | Wallet dùng path workspace; topup tạo/poll/history dùng header workspace. `GET /public/money-accounts/active-for-topup` cần JWT. QR do `POST /topups/create-with-pay2s` | Wallet/Topups/PublicMoneyAccounts controllers |
| Pay2S webhook | Chỉ `POST /webhooks/pay2s`, public và dành cho Pay2S/server-to-server. IPN xác thực `m2signature`; nhánh bank webhook xác thực Bearer token. Không có `/topups/webhook` mock | `WebhooksController`, `TopupsService` |
| Analytics | `GET /workspaces/:id/analytics/overview?period=7d|month|year` đã có; trang analytics FE hiện chỉ placeholder | `AnalyticsController`, route FE analytics |
| Messaging | Có `send-single`, logs lọc `status`, `sendType`, `limit`; chưa có send-test endpoint riêng hay các filter log mở rộng | `MessagingController`, `MessageLogsQueryDto` |
| Campaign | CRUD, CSV, rows, execute/retry đều có. `unitPriceAtCreate` BE đã gồm CTA prices tại lúc tạo campaign; FE preflight ưu tiên snapshot này | Campaign service/controller, route FE campaign |
| API keys/public API | Workspace OWNER quản lý keys. Public client dùng `x-api-key` hoặc `api_key`; public send đang có policy giá riêng cần sửa theo F04 của audit | API keys/Public API code |
| Admin money/order/invoice | `/money-accounts/*`, `/admin/orders/*`, `/admin/invoices/*` chỉ ADMIN. PDF issue chỉ ADMIN; STAFF không có quyền controller | controllers hiện hành |
| Customer order/invoice | FE đang dùng `GET /workspaces/:id/orders`, `GET /workspaces/:id/orders/:orderId`, `GET /workspaces/:id/invoices`, `GET /workspaces/:id/invoices/:invoiceId`; các controller này không có trong checkout BE cục bộ. Xác minh backend deployment/branch phục vụ FE trước khi thay đổi gì | route FE, kiểm kê controller BE local |
| Quick Chat | PO đã chốt không dùng. Code/route còn tồn tại ở cả hai repo, không thuộc active contract và phải được gỡ/đóng riêng | quyết định PO 2026-10-26 |

## Sai lệch đã xác nhận và cách xử lý

| ID | Phân loại | FE/tài liệu hiện tại | Contract hoặc yêu cầu đúng | Cần làm |
|---|---|---|---|---|
| C01 | Khác biệt contract FE ↔ BE local | FE đọc `r.role`, checkout BE local trả `memberRole` | FE là contract đã chạy; kiểm tra backend deployment/branch có adapter hay cần compatibility response | Không sửa FE theo checkout local. Chỉ tạo thay đổi BE có versioning sau khi xác nhận môi trường phục vụ FE |
| C02 | Khác biệt contract FE ↔ BE local | FE có 4 route order/invoice cấp workspace; checkout BE local không có controller tương ứng | BR-ORDER-03 vẫn yêu cầu khách hàng xem chứng từ | Xác minh backend deployment/branch trước; không ẩn hoặc đổi route FE đang chạy chỉ dựa vào checkout local |
| C03 | Bề mặt test/legacy cần phân loại | `/admin/dev/payment-webhook` và topup route cũ gọi `/topups/webhook` với body mock | Webhook Pay2S thật không dành cho browser/admin | Chỉ retire khi xác nhận route không còn cần ở môi trường FE; không chuyển browser sang `/webhooks/pay2s` |
| C04 | Chất lượng mã FE | Lint báo thứ tự Hooks ở topup page | Đây là static finding, không phải kết luận luồng đang chạy sai | Sửa trong ticket FE riêng khi có regression test cho route |
| C05 | Phạm vi UX cần chốt | Profile UI chỉ GET trong source kiểm kê, local BE có `PATCH /users/me` | Không tự suy diễn thiếu chức năng nếu có flow khác/deployment khác | Xác nhận acceptance criteria rồi mới lên ticket UI |
| C06 | Phạm vi UX cần chốt | Source kiểm kê chưa thấy accept invitation route/handler | Local BE có `POST invitations/accept` | Xác nhận luồng FE đang dùng và acceptance criteria trước khi tạo ticket |
| C07 | Lệch tài liệu | Một số guide còn `REJECTED`, submit thẳng PENDING, hoặc ghi STAFF issue invoice | Dùng state machine/role ở bảng trên | Đồng bộ hai bản API guide và admin map; bỏ hoặc đánh dấu tài liệu lịch sử |
| C08 | Lệch tài liệu | Guide cũ nói Pay2S signature chưa verify | IPN có `m2signature` verify; bank webhook Bearer verify | Sửa guide, không hạ bảo mật xuống mô tả cũ |
| C09 | Lệch màn FE | `/analytics` nói chưa có endpoint | Overview endpoint có, Dashboard đã dùng; detailed charts vẫn chưa có contract | Sửa copy màn placeholder thành “biểu đồ chi tiết chưa có”, hoặc dùng overview hiện tại |
| C10 | Quyết định đã chốt | Quick Chat còn pages/components/docs | Feature ngừng dùng | Gỡ route, imports, docs active và backend module theo ticket loại bỏ; không chỉ ẩn sidebar |

## Hồ sơ tài liệu cuối cùng cần giữ

| File | Vai trò sau khi chốt | Việc cần làm |
|---|---|---|
| `backend_comvia/docs/business/business-rules.md` | Chuẩn yêu cầu nghiệp vụ | Giữ yêu cầu customer order/invoice, jobs, notification; đánh dấu pending implementation qua audit, không xóa rule |
| `backend_comvia/docs/FRONTEND_API_GUIDE_NEXTJS.mdc` | API contract as-is cho FE | Bổ sung/giữ rõ C01–C10; không mô tả endpoint customer invoice/order cho tới khi BE có |
| `backend_comvia/docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc` | Contract màn ADMIN as-is | Sửa quyền invoice thành ADMIN; bỏ Quick Chat/payment webhook mock khỏi active router |
| `backend_comvia/docs/architecture/north-star.md` | Kiến trúc as-is | Giữ local file store, OaOAuthAttempt, rule-based Quick Chat đang chờ gỡ |
| `backend_comvia/docs/reviews/repository-audit-2026-10-26.md` | Audit BE và kế hoạch | Tham chiếu baseline này cho phần FE |
| `next_comvia/docs/FRONTEND_*.mdc` | Bản mirror đọc bởi FE | Đồng bộ nguyên văn từ hai guide backend sau khi sửa; không để bản FE tự diverge |
| `next_comvia/docs/audits/2026-10-26-repo-audit.md` | Audit FE | Bổ sung C01–C10, thay mọi claim backend chưa xác minh bằng link baseline này |

## Các ticket tiếp theo theo thứ tự

1. Xác minh URL/backend release mà FE đang dùng cho C01, C02 và C06; chỉ thay đổi BE local hoặc tài liệu sau khi xác nhận đây là cùng contract.
2. Đồng bộ 2 guide và audit theo C07–C09; FE guide là mô tả integration đang vận hành, không phải bản ép FE chạy theo checkout local.
3. Quyết định cleanup Quick Chat (C10) và bề mặt mock payment (C03) theo kế hoạch release, không đụng luồng FE đang chạy khi chưa có regression test.
4. Lập ticket chất lượng riêng cho C04 và các lint error còn lại; không dùng lint để bác bỏ hành vi FE đã nghiệm thu.
5. Tiếp tục các P0/P1 tiền, VAT, campaign, analytics trong audit BE. Những lỗi đó không được “đóng” bằng cách sửa câu chữ FE.

## Kiểm chứng đã có

- Live read-only ngày 26/10/2026: `HEAD https://api.comvia.cloud/api/v1` trả `200` (nginx/Express); `HEAD https://app.comvia.cloud` trả `200` (nginx/Next.js). Đây chỉ xác minh khả năng truy cập public, chưa xác minh endpoint có JWT, role, dữ liệu hoặc payment provider.
- Backend: `npm.cmd run build` PASS; unit 125/125 PASS; e2e HTTP standalone 31/31 PASS; lint backend FAIL 126 errors, 5 warnings.
- Frontend: `npm.cmd run lint` FAIL 4 errors, 29 warnings: `no-explicit-any` money accounts, `set-state-in-effect` OA settings/campaign row edit, và conditional Hook topup page. Chưa chạy build lại trong lượt đối chiếu này; lượt audit FE trước bị chặn tải Google font.
- Không gọi API live, không tạo QR/thanh toán/gửi Zalo/issue invoice, không đọc `.env`.
