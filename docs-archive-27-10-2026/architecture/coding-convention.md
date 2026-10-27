# Coding Convention — Comvia Frontend

Tài liệu mô tả khuôn khổ cấu trúc FE như hệ thống đang là. Lý do *vì sao* của các quyết định lớn nằm ở ADR (`docs/architecture/adr/`), không lặp lại ở đây.

## Cấu trúc FE (SA sở hữu)

### Route & tổ chức `app/`
- Route Next.js (App Router) chia theo actor: `app/app/` (user/workspace), `app/admin/`, `app/staff/`, `app/auth/`. Mỗi nhóm có `layout.tsx` riêng (`app/app/layout.tsx` bọc `AppShell` + `TenantAppRoleGate`). — *thêm bởi: SA*
- Màn workspace nằm dưới `app/app/w/[workspaceId]/<feature>/page.tsx`; màn ngoài workspace (danh sách/ tạo workspace, profile, settings) nằm dưới `app/app/<feature>/`. — *thêm bởi: SA*
- Đường dẫn dựng qua helper `lib/paths.ts` (`workspacePath(workspaceId, ...segments)`, `APP_PATHS`), không nối chuỗi path thủ công. — *thêm bởi: SA*

### Gọi API & xử lý lỗi
- Mọi request REST tới backend NestJS đi qua `comviaFetch` (`lib/comviaFetch.ts`). Base URL lấy từ `getComviaApiBaseUrl()`. Không gọi `fetch` trực tiếp tới backend trong component. — *thêm bởi: SA*
- Upload file/ảnh (multipart) dùng `comviaMultipartFetch` (`lib/comviaFetch.ts`) — KHÔNG tự set `Content-Type` để boundary đúng. Đây là pattern upload dùng chung đã có (xem `components/admin/issue-invoice-pdf-modal.tsx`, import CSV campaign). Không thêm tầng upload/S3-presign mới. — *thêm bởi: SA*
- Lỗi API ném ra `ComviaApiError` (có `statusCode`, `body`, `details`). Hiển thị message cho người dùng qua `formatComviaError` (`lib/api-message.ts`). — *thêm bởi: SA*
- Data-fetching trong client component dùng `useComviaQuery(enabled, fetcher)`; mutation dùng `useComviaMutation()` (`lib/use-comvia-query.ts`). `fetcher` phải bọc `useCallback` theo biến phụ thuộc (vd `workspaceId`). Cả hai tự xử lý 401 (redirect `/auth/login`) và 403 (`forbidden`). — *thêm bởi: SA*

### Session / auth
- Access token + user đọc qua `lib/auth.ts` (`getAccessToken`, `getStoredUser`). — *thêm bởi: SA*
- Workspace đang chọn quản lý qua `lib/workspace-session.ts` (`setActiveWorkspace`, `notifyWorkspacesListChanged`) và `lib/use-active-workspace.ts`. Sau thao tác đổi dữ liệu workspace (tạo/sửa) gọi `notifyWorkspacesListChanged()` để các màn danh sách refetch. — *thêm bởi: SA*
- Quyền trong workspace đọc qua `useWorkspaceContext()` + `isWorkspaceOwner(role)` (`components/workspace/workspace-gate`). — *thêm bởi: SA*
- OAuth Zalo OA dùng helpers ở `lib/oa-oauth.ts` (parse callback, nhớ workspace pending qua `sessionStorage`). — *thêm bởi: SA*

### State xuyên màn (cross-screen state)
- Mặc định dùng React state/Context của framework; KHÔNG thêm thư viện state management ngoài khi chưa có nhu cầu nhiều-nơi-dùng-chung thực sự. — *thêm bởi: SA*
- Thông báo nổi (toast/Alert) dùng chung toàn app qua React Context + portal, không thư viện ngoài (xem mục "Toast/Alert"). — *thêm bởi: SA*

### Component dùng chung mới (đợt issue 001–007)

**Toast / Alert nổi — `components/ui/toast.tsx`** (ISSUE-005) — *thêm bởi: SA*
- Dùng chung toàn app. `ToastProvider` mount một lần ở `app/layout.tsx` (root, Server Component render được Client Component), bọc `{children}` → mọi nhóm route (app/admin/staff/auth) gọi được.
- Cơ chế: React Context giữ mảng toast + `createPortal` render viewport cố định góc trên-phải (`fixed top-4 right-4 z-50`). Không thư viện ngoài (quy mô một app, đội nhỏ — Context + portal đủ; chỉ ghi ADR nếu về sau chọn thư viện toast ngoài).
- API tiêu dùng: hook `useToast()` trả `{ showToast }` với `showToast({ type, message, duration? })`; `type ∈ "success" | "error" | "warning" | "info"`. Auto-dismiss mặc định ~4000ms, cho đóng tay.
- Không thay thế lỗi inline trong form (giữ `formError` tại chỗ cho validation); toast dùng cho kết quả hành động toàn cục (vd "Nạp tiền thành công").

**Stat block — `components/app/stat-block.tsx`** (ISSUE-002, dùng lại ISSUE-005) — *thêm bởi: SA*
- Props: `{ icon?: ReactNode; value: ReactNode; label: string; delta?: { percent: number; direction: "up" | "down" } }`.
- Khi có `delta`: mũi tên + màu theo `direction` (xanh=up, đỏ=down). `delta` optional vì không phải chỉ số nào cũng có "so với kỳ trước".
- Đặt ở `components/app/` vì dùng chung nhiều màn trong nhóm app (dashboard overview + cụm "Tổng quan tháng này" của ví), không gắn một feature.

**Form workspace dùng chung — `components/workspace/workspace-form.tsx`** (ISSUE-001, ISSUE-007) — *thêm bởi: SA*
- Một component form duy nhất dùng cho cả trang tạo (`app/app/workspaces/new/page.tsx`) và popup sửa (ISSUE-007, trong `app/app/workspaces/page.tsx` qua `components/ui/modal.tsx`).
- Props phân biệt mode: `{ mode: "create" | "edit"; initialValue?; onSubmitted: (ws) => void }`. Create gọi `POST /workspaces`; edit gọi `PATCH /workspaces/:id`.
- Quy tắc billing (ISSUE-001) nằm TRONG form, áp dụng đồng nhất 2 mode: khi `billingType === "INDIVIDUAL"` → ẩn field "Mã số thuế", không validate bắt buộc, không gửi `taxCode`; `ORGANIZATION` giữ bắt buộc `taxCode`.
- Canh giữa (ISSUE-001) là việc của trang chứa form (wrapper `mx-auto`), không phải của form.

**Form + preview template dùng chung — `components/template/`** (ISSUE-004, dùng ở ISSUE-003) — *thêm bởi: SA*
- Tách logic form template hiện ở `app/app/w/[workspaceId]/templates/new/page.tsx` thành `components/template/template-form.tsx` để trang `templates/new` VÀ popup tạo mẫu tin trên dashboard (ISSUE-003) dùng chung, tránh lệch logic.
- Field động theo `type` ("Loại tin"): `bang` (bảng) → Nội dung + placeholders + Nội dung phụ; `van_ban` (văn bản) → Nội dung + placeholders; `otp` → chỉ field số phút hết hạn (không content/placeholders). Thứ tự field: Tracking ID → Loại tin → Tựa đề → phần nội dung động.
- Preview tách theo loại: `components/template/preview/table-preview.tsx`, `text-preview.tsx`, `otp-preview.tsx`; một `TemplatePreview` switch theo `type`. Preview chỉ render client, không gửi gì thêm.
- Gửi field mới lên API bị CHẶN tới khi backend chốt tên field (BR-05). FE giữ nội bộ value nhưng chỉ `POST` các field backend đã chấp nhận.

**Khối OA trên dashboard + popup tạo/sửa OA — `components/oa/`** (ISSUE-003) — *thêm bởi: SA*
- Domain folder mới `components/oa/` chứa: `oa-info-box.tsx` (box thông tin OA + logic nút theo trạng thái), `oa-record-modal.tsx` (popup tạo/sửa record, dùng `components/ui/modal.tsx`), `image-upload-field.tsx` (upload ảnh có ràng buộc kích thước — xem dưới).
- Biểu diễn trạng thái OA theo 2 trục độc lập → 3 trạng thái UI (xem ADR-001). Logic nút Tạo OA / Sửa / Kết nối chốt theo ADR-001.
- Tiền đề gửi ZNS/template giữ nguyên: chỉ cho gửi khi đã kết nối Zalo thật (`status === CONNECTED`); có record OA nhưng chưa kết nối thì chưa gửi được.

**Upload ảnh có ràng buộc kích thước — `components/oa/image-upload-field.tsx`** (ISSUE-003) — *thêm bởi: SA*
- Chưa có component upload ảnh trong codebase (chỉ có upload PDF/CSV). Tạo mới, tái dùng cơ chế `<input type="file">` + `FormData` + `comviaMultipartFetch` đã có — KHÔNG phát minh tầng mới.
- Props: `{ label; value; onChange; requiredWidth?; requiredHeight?; accept?; existingUrl? }`. Dùng cho avatar (tự do) và logo sáng/tối (ràng buộc 400x96). Validate client-side trước khi gửi, chặn nếu sai: **định dạng PNG/JPEG, dung lượng ≤ 2MB** (khớp ràng buộc backend BR-03/04), và kích thước (đọc qua `Image`) khi có `requiredWidth`+`requiredHeight`. Hiển thị preview ảnh đã chọn.
- **Preview từ URL cũ (mode edit):** backend trả `avatarUrl/logoLightUrl/logoDarkUrl` dạng URL (`/public/oa/<wsId>/<file>`), không phải File. Field nhận thêm `existingUrl` để hiện ảnh hiện có; khi user KHÔNG chọn file mới thì `value` giữ `null` và nơi gọi hiểu là "giữ ảnh cũ, không upload lại". Chỉ upload ảnh nào user thực sự chọn mới.

**Modal dùng chung — `components/ui/modal.tsx` prop `size`** (ISSUE-003) — *thêm bởi: SA*
- Modal hiện hardcode `max-w-2xl` (672px), hẹp cho layout 2 cột của popup Tạo OA (hình 3). Thêm prop `size` (vd `md` mặc định = `max-w-2xl` giữ nguyên hành vi cũ, `lg`/`xl` rộng hơn). Nơi đang dùng không truyền `size` → không đổi. Popup Tạo OA dùng size rộng để khớp layout 2 cột.

### Polling trạng thái (không reload)
- Cập nhật số dư ví sau quét QR (ISSUE-005) dùng polling, KHÔNG WebSocket (BR-08 xác nhận `GET /topups/:topupCode/status` đã có). — *thêm bởi: SA*
- Hook chuyên dụng `lib/use-topup-status.ts` (đặt cạnh `use-comvia-query.ts`): `useTopupStatusPolling(topupCode, { workspaceId, onPaid })`. Interval 3s; dừng khi `status === "PAID"` (gọi `onPaid` → refetch `GET /wallet/balance`, đóng popup, bắn toast success) hoặc timeout 5 phút (bắn toast warning), hoặc khi component unmount / popup đóng. Header `x-workspace-id` theo §9.5. — *thêm bởi: SA*
- Interface bổ sung callback `onFailed?(status)`: khi topup chuyển trạng thái thất bại dứt điểm (`FAILED`/`EXPIRED` theo `TopupStatus` §9.5) thì dừng polling sớm + gọi `onFailed` (nơi gọi bắn toast error), thay vì để chạy tới hết 5 phút rồi mới `onTimeout`. `onTimeout` chỉ còn cho trường hợp hết giờ thật. — *thêm bởi: Dev theo PO duyệt*
- Không tạo hook `usePoll` generic lúc này (chỉ một nơi dùng); nếu phát sinh nơi thứ hai cần polling tương tự thì mới trừu tượng hóa. — *thêm bởi: SA*

### Giá trị demo/hardcode tạm
- Chỉ số FE hardcode tạm (vd "Khách hàng tương tác" — ISSUE-002) phải khai báo bằng constant đặt tên rõ là demo (vd `DEMO_PLACEHOLDER_CUSTOMER_INTERACTION`) kèm comment `// TODO`, và KHÔNG được là field trong type response của API. Type response analytics chỉ chứa các chỉ số backend thật tính. — *thêm bởi: SA*

### Interface/type dự kiến chờ backend
- Với endpoint backend chưa làm nhưng FE cần dựng trước (BR-02/03/04/05/06/07), khai báo type response/request dự kiến trong module tương ứng, đánh dấu `// PROVISIONAL (BR-xx): chờ backend xác nhận tên field/path`. Khi backend chốt, Dev đối chiếu/sửa tên field thay vì thiết kế lại. Các type dự kiến đợt này nêu trong từng issue report (mục "Thiết kế SA"). — *thêm bởi: SA*

## Thực thi & style (Team Lead bổ sung)

- Component đặt theo `components/<domain>/` (`admin`, `app`, `audit`, `campaign`, `layout`, `oa`, `template`, `ui`, `workspace`); primitives tái dùng ở `components/ui/`. — *thêm bởi: SA (ghi nhận domain mới), chi tiết style: Team Lead*
- Style bằng Tailwind v4; gộp class điều kiện qua `cn()` (`lib/cn.ts`). — *(baseline hiện có)*
- Format số/tiền/ngày qua `lib/utils.ts` (`formatVND`, `formatDate`). — *(baseline hiện có)*
