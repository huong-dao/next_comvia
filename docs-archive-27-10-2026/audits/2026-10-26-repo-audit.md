# Rà soát Comvia frontend — 26/10/2026

## Phạm vi và cách đọc kết quả

- Checkout: `D:\Next\next_comvia`, branch `dev`, HEAD `18908dd` (`feat(staff): show template CTA buttons`). Working tree tracked sạch khi bắt đầu.
- Kiểm kê 69 `page.tsx`, 146 file TS/TSX trong `app`, `components`, `lib`; đối chiếu 14 module MAIN_RULES, API guide, admin API map, board 25 ticket, 8 issue và handoff liên quan.
- Đây là audit tĩnh theo module, route, API call và luồng xử lý, cộng lint/typecheck/build; không phải chứng nhận mọi dòng code hay kiểm thử E2E toàn hệ thống.
- Không kiểm tra repo backend, DB, deployment hoặc gọi API nghiệp vụ thật. Không gửi OTP/tin Zalo, tạo thanh toán hay phát hành hóa đơn. Các claim backend trong tài liệu cũ là thông tin tham khảo, chưa được xác nhận lại.
- **Có code** = tìm được UI, handler và lời gọi API tương ứng. **Một phần** = còn khoảng trống so với yêu cầu. **Chưa có FE** = không tìm thấy trong phạm vi source đã kiểm kê. **Ngừng sử dụng** = quyết định sản phẩm, không phải tính năng cần hoàn thiện.
- Không gán tỷ lệ % hoàn thiện: chưa có danh sách tiêu chí nghiệm thu được kiểm chứng cho toàn bộ sản phẩm. Không module nào được nâng thành “đã nghiệm thu production” qua lượt này.
- Quick Chat: **ngừng sử dụng theo xác nhận trực tiếp của người dùng ngày 26/10/2026**. Chỉ lên kế hoạch loại bỏ phần còn sót.

## Kết luận ưu tiên

1. Khắc phục logo sidebar thiếu kích thước và 4 lỗi lint trước khi nghiệm thu UI.
2. Hoàn tất luồng nhận invitation, cập nhật profile; chốt những yêu cầu chưa có API/phase rõ ràng.
3. Chuẩn hóa một luồng nạp tiền; loại bỏ công cụ webhook mock cũ; kiểm chứng payment trên môi trường thử nghiệm riêng.
4. Đồng bộ tài liệu template revision/CTA, auth/security và routing Admin với code hiện tại; không dùng code thiếu tính năng để tự động hạ yêu cầu.
5. Đóng Quick Chat ở route/component, không chỉ ẩn menu.
6. Chạy kiểm thử chấp nhận theo vai trò trước khi đổi trạng thái “có code” thành “hoàn thiện”.

## Ma trận 14 module

| Module | Đã có trong frontend | Trạng thái / phần còn thiếu | Bằng chứng chính |
|---|---|---|---|
| 1. Authentication & Account | Register, login, verify/resend OTP, forgot/reset password, remember session, logout | Có code; chưa kiểm chứng email/OTP thật, expiry và rate limit backend | `app/auth/{register,login,verify-otp,forgot-password}/page.tsx`; `lib/auth.ts` |
| 2. Profile & Security | GET hồ sơ; đổi mật khẩu, xóa session/workspace local sau thành công; Staff dùng lại trang security | Một phần: không có PATCH profile, avatar/email/phone update, danh sách thiết bị/logout từng session | `app/app/profile/page.tsx:21`; `app/app/settings/security/page.tsx:51`; MAIN_RULES §4; API guide §3.5 |
| 3. Workspace Management | Tạo/list/switch/edit; billing cá nhân/tổ chức, prefill; ẩn sửa khi DELETED | Một phần: chưa có UI soft delete dù API guide §4.5 có; billing null vẫn có nhánh validate nới lỏng cần kiểm chứng | `app/app/workspaces/page.tsx:131,231`; `components/workspace/workspace-form.tsx:97,153`; MAIN_RULES §5 |
| 4. Members & Permissions | List, invite EMAIL/PHONE, remove; nút quản trị theo Owner | Một phần: chỉ hiện token mời demo; không có accept invitation route/handler; chưa có resend/revoke invitation | `app/app/w/[workspaceId]/members/page.tsx:48,83,174`; API guide §5.4; MAIN_RULES §6 |
| 5. Workspace Context & Session | Active workspace local; kiểm membership; switch API; điều hướng theo role | Có code; switch API lỗi vẫn chọn workspace local; cần QA workspace bị khóa/xóa/thu hồi quyền. Guard UI không chứng minh API an toàn | `components/workspace/workspace-gate.tsx`; `lib/workspace-session.ts`; `lib/post-login-redirect.ts:12` |
| 6. Wallet & Transactions | Số dư, monthly metrics, giao dịch/filter ngày/loại/status, offset/limit trên dashboard; ví riêng | Có code; hai bề mặt UI khác nhau, chưa nghiệm thu tiền/hoàn tiền; chưa có bằng chứng ledger backend | `components/wallet/wallet-section.tsx:131,159`; `app/app/w/[workspaceId]/wallet/page.tsx`; API guide §9.1–9.2 |
| 7. Topup Payment | Popup chọn ngân hàng, tạo QR Pay2S, poll PAID/FAILED/EXPIRED/timeout và refetch ví | Một phần: route topup riêng không dùng polling hook, còn mock webhook và lỗi conditional hook; chưa thấy UI topup history theo §9.6 | `components/wallet/topup-modal.tsx:129,174`; `lib/use-topup-status.ts`; `app/app/w/[workspaceId]/topup/page.tsx:71,90,129` |
| 8. Orders & Invoices | Workspace list/detail; Admin filter/list/detail; verify-issue PDF và hiển thị mismatch 422, PDF link | Có code; STAFF invoices redirect; chưa verify PDF thật, quyền tenant, tính atomic và snapshot số tiền của backend | `app/admin/invoices`; `app/app/w/[workspaceId]/{orders,invoices}`; `components/admin/issue-invoice-pdf-modal.tsx:105,115` |
| 9. Zalo OA | Record CRUD, description, upload avatar/logo từng bước; connect/reconnect/disconnect; callback | Có code; BR-12 max description/cách clear còn mở; callback có lỗi lint; cần QA upload lỗi rồi đóng/mở popup, OAuth error/missing workspace | `components/oa/oa-record-modal.tsx:250,271,286`; `components/oa/oa-info-box.tsx`; `lib/oa-oauth.ts`; `app/app/settings/oa/page.tsx:30` |
| 10. Template | Create TEXT/TABLE/OTP, placeholders, preview, CTA; popup/detail edit/submit/disable; Staff review/return/approve; pricing Admin | Một phần: luồng mới khá đầy đủ ở code nhưng tài liệu lệch; chưa thấy duplicate template, lịch sử submit đầy đủ; REJECTED redirect về submitted | `components/template`; `components/admin/staff-template-review-detail.tsx:124,136`; `app/staff/templates-review/rejected/page.tsx`; MAIN_RULES §12 |
| 11. Messaging & Campaign | Single, logs; campaign create/list/detail, CSV mẫu/import, edit/delete rows, preflight, execute, retry failed, rename/delete | Một phần: không thấy send-test riêng; logs thiếu filter chi tiết MAIN_RULES; rows giới hạn 500; chưa nghiệm thu pricing/CTA, retry/refund, quy mô lớn | `app/app/w/[workspaceId]/messages`; `app/app/w/[workspaceId]/campaigns`; `lib/campaign-pricing.ts`; MAIN_RULES §13 |
| 12. API Key & Public API | Owner tạo/disable/regenerate, hiển thị raw key khi tạo | FE management có code; endpoint public send/template, hashing/rate limit/IP enforcement thuộc backend, chưa xác minh | `app/app/w/[workspaceId]/api-keys/page.tsx:49,59,80,95`; API guide §10, §12 |
| 13. Admin Backoffice | Users lock/unlock, disable workspace, orders/invoices, OA/template lists, money account create/edit/active, message/CTA pricing, audit log | Một phần: system-health placeholder; chưa có delete money account UI; chưa có màn reconciliation/adjustment/global wallet riêng; dashboard chỉ aggregate từ list | `app/admin`; `app/admin/system-health/page.tsx:10`; `app/admin/page.tsx:110`; MAIN_RULES §15 |
| 14. Notification/Audit/Jobs | Toast/alert và trang audit logs workspace/Admin | Audit reader có code. Không tìm thấy notification inbox; inbox chỉ là mở rộng trong MAIN_RULES. Email/SMS events, queue/job/reconciliation nằm ngoài repo FE, không kết luận thiếu backend | `components/ui/{toast,alert-modal}.tsx`; `components/audit/audit-logs-table.tsx`; `app/app/w/[workspaceId]/activity-history/page.tsx`; MAIN_RULES §16 |

### Phần bổ sung ngoài bảng

- Dashboard: ba chỉ số từ `/analytics/overview`; “Khách hàng tương tác” luôn **4.320**, delta **+8%** (`components/app/overview-section.tsx:61,63`). Đây là demo đã được PO cho phép tại ISSUE-002, không phải bug sai contract. Cần CR để bỏ/đánh dấu demo hoặc xây số liệu thật.
- `/app/w/[workspaceId]/analytics`: placeholder, vẫn ghi chưa có endpoint tổng hợp dù overview đã có. API biểu đồ chi tiết chưa được định nghĩa; không thể gọi màn này hoàn thiện.
- UI kit là trang trưng bày component, không phải module nghiệp vụ.
- Sidebar workspace giữ 6 mục; ẩn menu OA/templates/wallet/analytics không đồng nghĩa xóa route. OA/template/wallet chủ yếu truy cập qua dashboard.
- Quick Chat: 3 route `/admin/quick-chat/...` và `/admin/internal-quick-chat` còn code gọi API; Staff chat đã redirect. Chi tiết trong baseline hiện trạng.

## Phát hiện có thể hành động

Mỗi hàng có một phân loại. “Bug” là lệch yêu cầu rõ hoặc lỗi kiểm tra tái hiện; “Change request” là thay đổi phạm vi/quyết định hiện tại; “Missing specification” cần chốt contract/phase. Thứ tự P0→P2 là đề xuất kế hoạch, không phải kết luận sự cố production.

| ID / mức | Phân loại | Hiện tại → mục tiêu | Bằng chứng / tiêu chí đóng |
|---|---|---|---|
| A01 / P0 | Bug | Logo `next/image` không có width/height/fill → sidebar render hợp lệ | `components/layout/workspace-sidebar.tsx:155`, `internal-sidebar.tsx:132`. Gọi `getImageProps` của Next cài local với props tương ứng tái hiện `missing required "width"`. Đóng khi cả sidebar mở/thu gọn, light/dark render được |
| A02 / P1 | Bug | Lint thất bại → 0 errors | 4 lỗi liệt kê ở mục verification. Không tắt rule hàng loạt; test đổi role/loading ở topup để không đổi thứ tự hooks |
| A03 / P1 | Bug | Owner tạo invite được nhưng người nhận chưa có UI accept → hoàn tất §5.4 | Không tìm thấy `invitations/accept` trong app/components/lib. Đóng khi user có/chưa có tài khoản giữ được invite qua auth, accept thành công và hiện workspace; token hết hạn/đã dùng có lỗi rõ |
| A04 / P1 | Bug | Profile GET-only → có cập nhật fullName theo API đã mô tả | API guide §3.5 `PATCH /users/me`, profile page chỉ GET. Đóng khi save/reload đúng; validation/API lỗi không báo thành công giả |
| A05 / P1 | Bug | Dev payment UI còn `/topups/webhook` mock → bỏ khỏi luồng thực hoặc chuyển thành công cụ test biệt lập theo contract đã chốt | `app/admin/dev/payment-webhook/page.tsx:54`, topup page:129; API guide §9.7 nói Pay2S server gọi `/webhooks/pay2s`, FE không gọi tay. Không sửa tài liệu để hợp thức hóa mock cũ; không gửi webhook thật để test |
| A06 / P1 | Change request | Quick Chat ngừng dùng nhưng Admin route còn hoạt động → loại bỏ route/component/import và tài liệu khỏi phạm vi active | Theo quyết định user 26/10. Đóng khi URL cũ redirect/404 theo quyết định migration, không còn request Quick Chat, sidebar không có entry; cleanup backend tách riêng |
| A07 / P1 | Missing specification | MAIN_RULES cho edit SUBMITTED/PENDING/REJECTED, guide submit thẳng PENDING; FE chỉ DRAFT hoặc SUBMITTED+requiresOwnerRevision → chốt state machine đồng nhất | MAIN_RULES §12.2.2/5; API guide §7.5/8; `template-edit-form.tsx:85`; Staff detail:124–137. Baseline ghi FE hiện tại, chưa khẳng định response backend; kiểm thử return reason, submit lại, approve có provider ID, 409 |
| A08 / P1 | Missing specification | CTA đã có trong FE nhưng tài liệu API không có schema/quy tắc giá → chốt contract CTA + cách tính tổng giá gửi | `lib/template-cta.ts`, `app/admin/config/cta-pricing`, template pricing; preflight chỉ nhân unitPrice với rowCount. Cần xác minh unitPrice snapshot đã gồm CTA chưa, không kết luận tính tiền sai nếu chưa đối chiếu backend |
| A09 / P2 | Change request | Chỉ số tương tác là demo 4320/+8% → bỏ demo hoặc có nhãn/metric thật theo PO chọn | ISSUE-002 đã cho demo. Đóng khi không trình bày số demo như số liệu live; nếu làm metric thật phải có định nghĩa kỳ/delta và API |
| A10 / P2 | Bug | Có API soft-delete workspace nhưng không có thao tác FE → hoàn thiện §4.5 | MAIN_RULES §5.6; API guide §4.5; workspace list chỉ switch/edit. Đóng khi Owner xác nhận xóa, xử lý lỗi và thoát workspace bị xóa; không tự đặt thêm điều kiện backend |
| A11 / P2 | Missing specification | MAIN_RULES có resend/revoke invitation, session/device, avatar/email/phone, send-test, duplicate template → cần contract/phân kỳ | Chưa thấy API phù hợp trong guide cho các phần mở rộng này. Không xóa yêu cầu chỉ vì FE chưa có; chốt in-scope/deferred trước khi implement |
| A12 / P2 | Missing specification | Logs chỉ status/sendType/limit, campaign chỉ tải tối đa 500 rows → chốt truy vấn/phân trang đủ dùng | Logs page:29–40; campaign detail:101. Đóng khi dataset >500 truy cập được mọi dòng, retry-all không chỉ lấy trang hiện tại; không tự dựng offset khi API chưa hỗ trợ |
| A13 / P2 | Missing specification | OA description dùng max=500 và clear="" → chốt BR-12 | `oa-record-modal.tsx:79,271`; handoff BR-12 chưa đóng. Đóng bằng contract backend + kiểm thử rỗng/null/biên độ dài |
| A14 / P2 | Missing specification | Admin vào workspace shell nhưng comment/sitemap cũ mô tả Admin tách riêng → xác nhận routing/role mới | `lib/auth.ts:71`, `lib/post-login-redirect.ts:12`, `app/admin/layout.tsx`, `workspace-sidebar.tsx`. Link tới FRONTEND_SITEMAP_* trong comment không có file tương ứng trong repo. Baseline chỉ ghi hành vi hiện tại |
| A15 / P1 | Bug | API fallback thiếu `/api/v1` so với guide → cấu hình local phải nhất quán | `lib/comviaFetch.ts:44`, auth pages fallback `http://localhost:3000`; docs README/API §1 yêu cầu prefix. Tác động khi env không được set; không kết luận deployment đang sai. Đóng khi khởi chạy thiếu env có lỗi cấu hình rõ hoặc URL fallback đúng contract |
| A16 / P2 | Change request | Topup riêng và popup khác hành vi → thống nhất một luồng chuẩn | Popup poll + refresh; route riêng chỉ tạo QR và mock controls. Chọn redirect về luồng chung hoặc tái sử dụng component; verify PAID/FAILED/EXPIRED/timeout và đóng/mở lại |
| A17 / P2 | Missing specification | Analytics chi tiết/System health chưa có API/UI thực → quyết định có cần trong phase tiếp theo | Hai page tự ghi placeholder; overview đã có API nên câu “chưa có endpoint tổng hợp analytics” cần sửa. Đóng bằng scope rõ hoặc archive route |
| A18 / P2 | Missing specification | Tài chính Admin và quyền tenant chưa có ma trận đầy đủ ở tài liệu → kiểm chứng quyền đa vai | STAFF invoice redirect đã có; tenant orders/invoices không có Owner-only gate tại page; API-key page fetch trước nhánh forbidden; nhiều admin page query trước gate. Đây chưa là bằng chứng lộ dữ liệu: cần backend 403/cross-workspace tests và quyết định Member được đọc gì |

## Đối chiếu tài liệu với phần đã có code

| Tài liệu cũ | Code hiện tại | Cách điều chỉnh đúng |
|---|---|---|
| Board “Done”, ticket 015–025 còn Ready/Blocked; issue nói chờ SA/backend | Có component/API wiring, nhưng không có E2E evidence trong lượt này | Tách “có code / QA / live”; bảng cập nhật phía dưới là baseline tiến độ, giữ nội dung lịch sử |
| API guide §7.5 submit→PENDING; MAIN_RULES §12.2.2 cho nhiều trạng thái edit | FE dùng SUBMITTED+revision flag và Staff mark-pending riêng | Ghi state machine FE ở baseline, chuyển A07 để đối chiếu backend trước khi sửa contract synced |
| Guide không có CTA, return-to-submitted, change-password/forgot-reset | FE đã gọi các endpoint và hiển thị field mới | Bổ sung danh mục endpoint FE thực dùng trong baseline; đánh dấu response/server rules chưa xác nhận |
| Quick Chat là module active trong API guide §13/admin map §5–7,9 | User đã ngừng sử dụng; menu ẩn, route Admin còn | Baseline đánh dấu retired và A06; không tiếp tục phát triển các chức năng này |
| Review 05/10 vẫn KHÔNG-ĐẠT, nói modal chưa lock scroll | Modal có portal, mounted guard, body lock, cuộn nội dung | Đổi trạng thái hiện tại thành “fix có trong source; chờ visual regression”, không tự đóng review QA |
| Handoff nói chưa nối API trước deploy | FE đã nối API; trạng thái deploy mới chưa biết | Chú thích đây là snapshot 02–05/10; không tiếp tục gọi “blocked implementation” |
| Root README nói localhost:3000, Geist | Script dev/start dùng 3002; layout dùng Inter/JetBrains Mono | Docs README hiện trạng cung cấp setup đúng; root README vẫn là scaffold cần thay ở task documentation tracked riêng |
| Comment workspace form cho sửa cả DELETED | List đã ẩn nút DELETED, đúng BR-09 cập nhật | Giữ rule “không sửa DELETED”; sửa comment ở task code sau, không đảo tài liệu cho khớp comment lỗi thời |
| MAIN_RULES liệt kê profile/member/session/duplicate đầy đủ | FE chưa có các phần tương ứng | Giữ yêu cầu và ghi backlog; không đánh dấu hoàn thiện hoặc xóa yêu cầu |

## Đối soát 25 ticket

Tất cả đều **chưa được nghiệm thu E2E trong lượt audit**. “Có code” không đóng các ô acceptance criteria thủ công.

| Ticket | Kết quả tại source | Bằng chứng |
|---|---|---|
| 001 | Có toast/provider | `components/ui/toast.tsx`, `app/layout.tsx` |
| 002 | Có stat block | `components/app/stat-block.tsx` |
| 003 | Có polling, terminal states, cleanup | `lib/use-topup-status.ts` |
| 004 | Có upload validation | `components/oa/image-upload-field.tsx` |
| 005 | Có shared workspace form, billing cá nhân/tổ chức | `components/workspace/workspace-form.tsx` |
| 006 | Có form + preview TEXT/TABLE/OTP | `components/template/template-form.tsx`, `preview/` |
| 007 | Có 6 mục workspace; Admin có nhóm bổ sung | `components/layout/workspace-sidebar.tsx` |
| 008 | Có popup edit workspace | `app/app/workspaces/page.tsx` |
| 009 | Có overview UI; 1 metric demo có chủ đích | `components/app/overview-section.tsx` |
| 010 | Có topup popup 2 bước | `components/wallet/topup-modal.tsx` |
| 011 | Có wallet dashboard | `components/wallet/wallet-section.tsx` |
| 012 | Có OA create/edit modal, đã nối API | `components/oa/oa-record-modal.tsx` |
| 013 | Có OA info box, record thật, connection nhúng | `components/oa/oa-info-box.tsx` |
| 014 | Dashboard ghép overview/wallet/OA/template | `app/app/w/[workspaceId]/dashboard/page.tsx` |
| 015 | Có billing individual không gửi taxCode, guard edit; chưa verify status API | `workspace-form.tsx:104,143`; workspaces page:231 |
| 016 | Đã dùng changePercent/null, 3 metric API + 1 demo | `overview-section.tsx:44–63,113` |
| 017 | Monthly/filter/offset-limit đã nối | `wallet-section.tsx:131–186` |
| 018 | Có type enum, title/trackingId/content/OTP và CTA phát sinh | `template-form.tsx:181–215` |
| 019 | Đã POST/PATCH + upload tuần tự, retry partial; không còn chỉ mock | `oa-record-modal.tsx:250–325` |
| 020 | Modal hỗ trợ md/lg/xl/full | `components/ui/modal.tsx:9,36` |
| 021 | Có existingUrl và validation ảnh | `components/oa/image-upload-field.tsx` |
| 022 | Có status cột/filter SUCCESS/PENDING/FAILED | `wallet-section.tsx` |
| 023 | Guard ws.status !== DELETED ở nút sửa | `app/app/workspaces/page.tsx:231` |
| 024 | Có GET detail/prefill; nhánh billingPrefilled=false vẫn tồn tại | `workspaces/page.tsx:131`; `workspace-form.tsx:97,153`; cần QA billing null và làm rõ acceptance “bỏ nới validate” |
| 025 | Có description input/prefill/POST/PATCH/display; BR-12 vẫn mở | `oa-record-modal.tsx:79,138,256,271,416`; `oa-info-box.tsx:266` |

## Verification thực hiện

| Kiểm tra | Kết quả |
|---|---|
| `npx tsc --noEmit --incremental false` | PASS, exit 0 |
| `npm run lint` | FAIL, 4 errors + 29 warnings |
| `node node_modules/next/dist/bin/next build` (tương đương script build) | FAIL vì không tải được Inter và JetBrains Mono từ Google Fonts trong môi trường hiện tại; chưa có production build thành công |
| Next `getImageProps` qua Node, cùng props logo sidebar | FAIL `Image with src "/images/comvia_light_logo.png" is missing required "width" property.`; tái hiện ở helper cài local, chưa chạy browser toàn app |
| Tests/CI | Không thấy test/spec suite ngoài dependency/build output, không có script test trong package.json, không có thư mục `.github` ở checkout |
| E2E/browser/backend/live | Chưa thực hiện; không coi là PASS |

4 lỗi lint cụ thể:

1. `app/admin/money-accounts/page.tsx:33`: `@typescript-eslint/no-explicit-any`.
2. `app/app/settings/oa/page.tsx:30`: `react-hooks/set-state-in-effect`.
3. `app/app/w/[workspaceId]/topup/page.tsx:90`: `react-hooks/rules-of-hooks`, hook sau early return theo Owner.
4. `components/campaign/campaign-row-edit-modal.tsx:30`: `react-hooks/set-state-in-effect`.

PowerShell npm/npx wrapper có cảnh báo truy cập npm prefix, nhưng các tiến trình vẫn chạy; kết quả trên lấy từ exit/output thực tế. Không thay dependency hoặc bỏ kiểm tra để làm xanh giả.

## Kế hoạch làm tiếp

| Đợt | Công việc / phụ trách | Tiêu chí kết thúc |
|---|---|---|
| 1 — unblock chất lượng | FE: A01, A02, A15; QA smoke sidebar/app/staff/admin; build ở môi trường tải được font hoặc task local-font riêng | 0 lint errors, typecheck/build pass; mở trang không crash, role/loading không gây hook error |
| 2 — loại tính năng cũ | FE: A06 Quick Chat; PO/FE: A05+A16 topup; backend xác nhận test/payment contract | Không entry/route/request QC hoạt động; một flow nạp tiền rõ ràng; không còn mock webhook trong luồng sử dụng thật |
| 3 — contract hiện hành | BA+BE+FE: A07/A08/A13/A14/A18 | State machine/CTA/pricing/role/description có quyết định và response mẫu; không chỉ suy luận từ FE |
| 4 — hoàn thiện luồng thiếu | FE+BE: A03, A04, A10; PO phân kỳ A09/A11/A12/A17 | Invitation end-to-end, profile save, delete workspace; danh sách phần deferred có lý do/owner |
| 5 — nghiệm thu | QA+BE: theo checklist dưới; cập nhật board và ticket bằng bằng chứng | Mỗi module có case, role, kết quả, commit, môi trường/ngày kiểm; tài liệu synced được owner backend đồng bộ |

Checklist nghiệm thu cần chạy trên dữ liệu thử nghiệm:

- Auth: đăng ký/OTP sai-hết hạn/resend/reset; đổi mật khẩu xóa session local; backend từ chối token cũ theo contract đã chốt.
- Workspace: OWNER/MEMBER/người ngoài; billing cá nhân/tổ chức/null; ACTIVE/DISABLED/SUSPENDED/DELETED; switch lỗi và quyền bị thu hồi.
- OA: create chỉ một record; upload lỗi từng bước rồi retry/đóng mở; OAuth success/error/expired; reconnect/disconnect.
- Template: TEXT/TABLE/OTP; CTA 0/1/2, URL/phone/param; DRAFT→submit→Staff pending→return→Owner sửa→submit→approve→disable; popup/detail cùng quyền.
- Messaging/campaign: placeholder/số điện thoại sai; OA disconnected; provider ID thiếu; thiếu tiền; CSV malformed/>500 rows; retry chỉ FAILED; không gửi lại SUCCESS; giá gồm CTA và hoàn tiền đúng backend.
- Topup/invoice: sandbox PAID/FAILED/EXPIRED/timeout, callback lặp (BE), refresh ví không reload, PDF đúng/sai và mismatch 422; không phát hành hóa đơn thực để thử.
- Access: STAFF không tài chính, MEMBER không quản trị Owner, cross-workspace/API key đã disable; direct URL và API độc lập với menu.
- Visual: desktop/mobile, sidebar, modal portal/scroll/toast, trạng thái loading/empty/error; đóng review modal 05/10 sau khi có kết quả.

## Tài liệu đi kèm và giới hạn lưu trữ

- [Baseline hiện trạng FE](./2026-10-26-frontend-baseline.md): mô tả các hành vi mới đã thấy trong source, phần ngừng dùng và phần chưa xác minh.
- [Kiểm kê toàn bộ page routes](./2026-10-26-route-inventory.md): để rà coverage và tìm route ẩn/redirect.
- `docs/` bị ignore theo `.gitignore:47`: các báo cáo và cập nhật tiến độ lượt này **chỉ lưu local**, không tự force-add hay thay chính sách Git.
- Không sửa application code hoặc file contract `.mdc` synced trong vai Analyst. Baseline FE bổ sung mô tả hiện trạng; những chỗ mâu thuẫn nghiệp vụ/API vẫn nằm trong backlog xác nhận, không tự coi code là yêu cầu đúng.
