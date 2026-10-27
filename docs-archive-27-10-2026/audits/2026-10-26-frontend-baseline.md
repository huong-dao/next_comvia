# Baseline frontend thực tế — 26/10/2026

Nguồn: source tại `dev@18908dd`, không phải xác nhận backend/live. Đọc cùng [báo cáo audit](./2026-10-26-repo-audit.md). File này bổ sung hiện trạng FE cho các tài liệu cũ; không thay thế schema/contract backend đã được duyệt.

## Quyết định phạm vi

**Quick Chat ngừng sử dụng** theo người dùng ngày 26/10/2026. Không đưa Quick Chat vào kế hoạch hoàn thiện hoặc demo nghiệm thu.

Phần còn sót cần dọn:

| Vị trí | Hiện trạng |
|---|---|
| `app/admin/quick-chat/agents/page.tsx` | List agents qua `/admin/quick-chat/agents` |
| `app/admin/quick-chat/agents/[agentId]/page.tsx` | Load và PUT agent |
| `app/admin/quick-chat/tools/page.tsx` | GET tools |
| `app/admin/internal-quick-chat/page.tsx` | AdminRoleGate + InternalQuickChatPlayground |
| `components/admin/internal-quick-chat-playground.tsx` | Tạo/lấy session, message, confirm action |
| `app/staff/internal-quick-chat/page.tsx` | Đã redirect `/staff` |
| `components/layout/internal-sidebar.tsx`, `app/admin/page.tsx` | Còn entry/comment cũ; việc ẩn menu không tắt URL trực tiếp |
| API guide §13 và admin map §5–7,9 | Tài liệu lịch sử của chức năng retired; không còn là scope active |

Backend Quick Chat/tools/permission cleanup cần task ở repo backend; audit FE không chứng minh endpoint server đã tắt.

## Routing và quyền quan sát được

- `postLoginPathForRole`: STAFF→`/staff`; ADMIN và USER→`/app/workspaces`. `resolvePostLoginPath` có thể đưa thẳng tới dashboard workspace đang dùng/đầu tiên sau switch.
- `/admin` hiện dùng `AppShell` và sidebar workspace chung; nhóm menu quản trị được hiện khi stored role ADMIN. `AdminRoleGate` cho ADMIN; `StaffRoleGate` chỉ STAFF.
- `/staff/invoices` và `/staff/invoices/[invoiceId]` redirect `/staff`; Staff sidebar chỉ hub và duyệt mẫu tin.
- Workspace sidebar: Tổng quan, Gửi tin, Chiến dịch, Thành viên, Lịch sử hoạt động, API Keys. OA/template/wallet nằm trong dashboard, route riêng vẫn tồn tại.
- Role lấy từ session/context phía client chỉ phục vụ UX. Cần backend kiểm tra JWT, membership và ownership cho từng endpoint; chưa có kết quả kiểm thử quyền server trong lượt này.

## Auth và security đã có FE

| Endpoint FE thực gọi | Payload/hành vi quan sát |
|---|---|
| `POST /auth/forgot-password/request` | Email; UI chuyển sang bước OTP/reset |
| `POST /auth/forgot-password/reset` | `{ email, otpCode, password }`; thành công về login; lỗi 401 có thông báo OTP |
| `POST /auth/change-password` | `{ currentPassword, newPassword }`; FE kiểm tối thiểu 8 ký tự và confirm; thành công clear auth + active workspace rồi về login |
| `GET /auth/me` | Profile read-only hiện tại; `PATCH /users/me` trong API guide chưa có UI |

Session/device management, đổi avatar/email/phone không được coi là hoàn thiện. Không suy diễn backend invalidates mọi token chỉ từ việc FE clear storage.

## Template revision hiện tại

- FE cho sửa nội dung khi `DRAFT` hoặc `SUBMITTED && requiresOwnerRevision`; thao tác edit/submit theo Owner.
- Popup và trang detail đọc `requiresOwnerRevision`; trả về sửa có lý do và thời gian hiển thị khi API cung cấp.
- Staff gọi `POST /internal/templates/:id/return-to-submitted` với `reason`; nút hiện ở `PENDING_ZALO_APPROVAL`.
- Staff mark-pending chỉ khi `SUBMITTED && !requiresOwnerRevision`; approve chỉ khi `PENDING_ZALO_APPROVAL`, yêu cầu providerTemplateId trên form.
- Owner gửi lại qua `POST /workspaces/:workspaceId/templates/:id/submit`; cần xác nhận response/state server. Không dùng câu cũ “submit trực tiếp PENDING” như mô tả FE đã kiểm chứng.
- Owner disable qua endpoint workspace, có ở popup và detail; template DISABLED không còn nút disable.
- Route rejected Staff hiện redirect submitted; không đồng nghĩa dữ liệu REJECTED bị xóa ở backend.

API guide §7.5/7.8 và MAIN_RULES §12 còn khác nhau với flow trên: audit A07 phải chốt trước khi sửa contract synced.

## CTA và pricing đã có FE

- Tối đa 2 CTA, position 0/1; các type: OA_PROFILE, ZALO_MINI_APP, OA_ARTICLE, BUSINESS_WEBSITE, PHONE_CALL, EXTERNAL_WEB_OR_MINI_APP, APP_DOWNLOAD, DISTRIBUTION_PAGE, EXTERNAL_APP.
- FE dùng `type`, `label`, `target`, `position`, optional `id`; response có optional `unitPrice`.
- Create chỉ gửi `ctaButtons` khi có nút; edit gửi toàn bộ array đã normalize, kể cả array rỗng. Cần BE xác nhận semantics replace/clear, không suy ra chỉ từ payload.
- FE validate label ≤100; target bắt buộc trừ OA_PROFILE; PHONE_CALL dùng số VN; URL HTTP(S); param `<ten_bien>` ở path, không ở query và không trùng biến nội dung theo validator hiện tại.
- Staff detail hiển thị CTA theo position; preview có CTA cho TEXT/TABLE/OTP.
- Admin có GET/PATCH `/admin/config/cta-pricing`, GET/PATCH `/admin/config/message-pricing`, PATCH `/admin/templates/:id/cta-buttons/:buttonId/unit-price`; workspace template detail cũng có thao tác giá dành cho Admin.
- Preflight campaign hiện ước tính `unitPrice * rowCount`, ưu tiên snapshot campaign → template → default. Chưa kết luận snapshot đã gồm CTA; cần BE xác nhận tổng giá/rounding/refund.

Nguồn: `lib/template-cta.ts`, `components/template/{template-form,template-edit-form}.tsx`, `components/admin/staff-template-review-detail.tsx`, `app/admin/config`, `lib/campaign-pricing.ts`.

## Dashboard, OA, billing và modal

- Overview có 3 metric API (`messagesSent`, `activeTemplates`, `successRate`) và 1 metric demo 4320/+8%. Null value/delta được xử lý; không ghi “toàn bộ dashboard là dữ liệu thật”.
- Wallet dashboard đã có `monthly`, filter date/type/status, offset/limit, status column và popup topup refetch sau PAID.
- OA record tạo trước, upload avatar/logo tuần tự sau; lỗi upload giữ savedRecord trong popup để retry, không rollback record. Description max 500/clear bằng chuỗi rỗng vẫn là giả định BR-12.
- Workspace edit gọi GET detail prefill billing; nút chỉ Owner và không DELETED. Form còn nhánh PATCH partial khi không có billing prefill; cần nghiệm thu riêng.
- Modal đã portal vào body, khóa cuộn body với bộ đếm modal, giới hạn chiều cao và cuộn phần thân, size md/lg/xl/full. Review 05/10 là lịch sử lỗi; chưa có visual QA mới để đóng verdict.

## Phần chưa được phép coi là hoàn thiện

- Profile editing; invitation acceptance/resend/revoke; workspace delete UI; thiết bị/session; send-test riêng; duplicate template; analytics chi tiết/system health; topup history UI.
- Pricing/ledger/refund, webhook verification/idempotency, OA refresh token, public API enforcement, notification email/SMS và jobs: thuộc backend, chưa được audit ở checkout này.
- Tất cả flow có API wiring vẫn cần nghiệm thu quyền, dữ liệu thực và lỗi. Lint đang fail 4 lỗi; build đang bị chặn bởi tải font.

## Thiết lập local đúng theo source

- `npm run dev` / `npm run start`: port **3002**; build dùng `next build`.
- Biến API: `NEXT_PUBLIC_API_BASE_URL` cần URL đầy đủ gồm `/api/v1` theo API guide. Source fallback hiện thiếu prefix; phải cấu hình env đúng, không ghi secret thật vào tài liệu.
- Font layout: **Inter** và **JetBrains Mono** qua `next/font/google`; build cần tải font trong môi trường hiện tại.
- Tài liệu `docs/` là local và bị ignore; root README vẫn là scaffold cũ. Không suy ra commit code đã đồng bộ tài liệu sang máy khác.
