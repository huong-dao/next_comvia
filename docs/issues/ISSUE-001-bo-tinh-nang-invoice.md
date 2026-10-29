# ISSUE-001: Bỏ toàn bộ tính năng Invoice — topup chỉ tạo Order, dừng lại ở đó

**Trạng thái:** Mới
**Phân loại:** Change Request
**Màn hình/route liên quan:**
- `app/app/w/[workspaceId]/invoices/page.tsx`, `app/app/w/[workspaceId]/invoices/[invoiceId]/page.tsx`
- `app/admin/invoices/page.tsx`, `app/admin/invoices/[invoiceId]/page.tsx`
- `app/staff/invoices/page.tsx`, `app/staff/invoices/[invoiceId]/page.tsx` (stub redirect)
- `app/admin/orders/[orderId]/page.tsx`, `app/app/w/[workspaceId]/orders/[orderId]/page.tsx` (phần hiển thị invoice đi kèm order)
- `components/admin/issue-invoice-pdf-modal.tsx`, `lib/invoice-pdf-url.ts`, `lib/admin-invoice-mismatch-labels.ts`
- `components/layout/internal-sidebar.tsx`, `components/layout/workspace-sidebar.tsx` (menu "Hóa đơn")

## Mô tả gốc từ khách hàng/PO
> giờ việc quản lý invoice và các hoạt động liên quan đến invoice của order trên comvia sẽ không sử dụng nữa. Tức là khi nạp tiền (topup) chỉ tạo đơn hàng mà thôi và dừng lại tại đây.
> Tôi cần FE kiểm tra để có thể loại bỏ tất cả tính năng / trang liên quan đến invoice. Đồng thời gửi thông tin cho BE về yêu cầu này của tôi để BE nắm được và sửa phía BE

## Rule/API hiện tại
`docs/MAIN_RULES.mdc` mục 10 (Module 8 — Order, Order Item, Invoice, Invoice Item):
- 10.4.1: "Invoice được tạo sau khi order paid"
- 10.4.2/10.4.3: status invoice `posted` (hệ thống tạo, chờ kế toán xuất) → `issued` (kế toán xuất hóa đơn thật + upload file) → `cancelled`
- 10.7: "Màn hình Order/Invoice cho khách hàng" — khách xem order kèm invoice, download invoice nếu `issued`
- 10.8: "Màn hình kế toán" — xem invoice posted, upload PDF, nhập `invoice_number`/`issue_date`, cập nhật `issued`
- Mục 17.5: mỗi order topup tạo đúng 1 invoice status `posted`, 1 invoice_item

API hiện tại theo `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` / `docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc`:
- `GET /workspaces/:workspaceId/invoices`, `GET /workspaces/:workspaceId/invoices/:invoiceId` — khách hàng xem/tải invoice
- `GET /admin/invoices`, `GET /admin/invoices/:invoiceId`, `GET /admin/invoices/:invoiceId/pdf`, `POST /admin/invoices/:invoiceId/verify-issue-pdf` — admin/kế toán xử lý invoice
- Order detail trả kèm field `invoice` lồng bên trong (billing snapshot, status, id) — xem `app/admin/orders/[orderId]/page.tsx` và `app/app/w/[workspaceId]/orders/[orderId]/page.tsx`

## Hành vi thực tế đã verify
FE hiện có đầy đủ UI cho vòng đời Invoice:
- `app/app/w/[workspaceId]/invoices/page.tsx:28` — list invoice khách hàng, gọi `GET /workspaces/:workspaceId/invoices`
- `app/app/w/[workspaceId]/invoices/[invoiceId]/page.tsx:41,58-63` — chi tiết invoice + nút tải PDF
- `app/admin/invoices/page.tsx:88` — list invoice toàn hệ thống (vai trò kế toán/admin)
- `app/admin/invoices/[invoiceId]/page.tsx:142,167-183` — chi tiết invoice, nút "Phát hành (Issue PDF)" và tải PDF, mở `IssueInvoicePdfModal`
- `components/admin/issue-invoice-pdf-modal.tsx` — modal upload PDF + nhập `invoiceNumber`/`issueDate`, gọi `POST /admin/invoices/:invoiceId/verify-issue-pdf`
- `app/admin/orders/[orderId]/page.tsx:144-181` — khối "Hóa đơn" trong trang chi tiết order (admin), link sang `/admin/invoices/:id`
- `app/app/w/[workspaceId]/orders/[orderId]/page.tsx:92-98` — nút "Mở hóa đơn liên kết" trong trang chi tiết order (khách hàng), trỏ sang `workspacePath(workspaceId, "invoices", invoiceId)`
- `components/layout/internal-sidebar.tsx:51-56`, `components/layout/workspace-sidebar.tsx:130` — menu "Hóa đơn" trỏ `/admin/invoices`
- `app/staff/invoices/page.tsx`, `app/staff/invoices/[invoiceId]/page.tsx` — stub, chỉ `redirect("/staff")`, không có UI thật

Không tìm thấy role/route "Accountant" riêng ở FE — nghiệp vụ kế toán hiện nằm trong `app/admin/invoices/[invoiceId]/page.tsx` dưới `AdminRoleGate`.

Billing info (`invoiceEmail`, công ty/cá nhân, mã số thuế...) trong `components/workspace/workspace-form.tsx` và `app/app/workspaces/page.tsx` là Billing Profile cấp Workspace, tách biệt với entity Invoice — hiện được dùng làm billing snapshot khi tạo Order (`app/admin/orders/[orderId]/page.tsx:60,171`).

## Hành vi mong đợi
Theo yêu cầu mới của PO:
- Topup thành công → chỉ tạo **Order** (status `paid`) → dừng lại, **không tạo Invoice**.
- Loại bỏ toàn bộ trang/UI xem, tải, phát hành invoice ở mọi vai trò (khách hàng, admin, kế toán).
- Trang chi tiết Order (khách hàng + admin) vẫn giữ nguyên, chỉ bỏ phần hiển thị/link invoice đi kèm.
- Menu điều hướng bỏ mục "Hóa đơn".

## Phân tích tác động
- Billing Profile (`invoiceEmail`, loại hình cá nhân/tổ chức...) ở cấp Workspace **có thể vẫn cần giữ** vì đang dùng làm billing snapshot cho Order — cần BE xác nhận Order có còn lưu/trả billing snapshot sau khi bỏ Invoice hay không, để quyết định có bỏ luôn field `invoiceEmail` khỏi `WorkspaceForm` hay không.
- `components/admin/issue-invoice-pdf-modal.tsx`, `lib/invoice-pdf-url.ts`, `lib/admin-invoice-mismatch-labels.ts` chỉ được dùng bởi các trang invoice — xóa an toàn, không ảnh hưởng chỗ khác.
- Cần BE xác nhận: `GET /workspaces/:workspaceId/orders/:orderId` và `GET /admin/orders/:orderId` có tiếp tục trả field `invoice`/`invoiceId` lồng trong response hay không sau khi bỏ entity Invoice (để FE biết có cần tiếp tục đọc field này một cách an toàn — tức optional — hay có thể xóa hẳn khỏi type).
- Audit log action liên quan invoice (`invoice.issued_via_pdf`, `invoice.issued_via_pdf` fail) ở `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` mục 11.3 sẽ không còn phát sinh — cần BE xác nhận có ngừng ghi các action này không.

## Giả định / Câu hỏi mở
CÂU HỎI MỞ: Đây là thay đổi rule ở `docs/MAIN_RULES.mdc` mục 10.4–10.8 (tài liệu đồng bộ từ backend) — cần BE xác nhận và cập nhật lại tài liệu, FE không tự sửa `.mdc`.
CÂU HỎI MỞ: BE có xóa/deprecate hẳn các endpoint `GET /workspaces/:workspaceId/invoices*`, `GET/POST /admin/invoices*` hay chỉ ngừng tạo invoice mới (dữ liệu invoice cũ vẫn còn trong DB cho mục đích tra cứu kế toán nội bộ, không qua FE)? Nếu endpoint còn tồn tại nhưng FE bỏ hết UI gọi tới, cần BE xác nhận không ảnh hưởng gì khác.
CÂU HỎI MỞ: Billing Profile (`invoiceEmail`, mã số thuế, loại hình cá nhân/tổ chức) ở Workspace Settings có cần đổi tên/giữ nguyên để phục vụ Order (không phải Invoice) không, hay cũng loại bỏ luôn?
GIẢ ĐỊNH: Order vẫn giữ nguyên toàn bộ vòng đời hiện tại (tạo khi topup paid, trạng thái, danh sách/chi tiết cho khách hàng và admin) — chỉ bỏ phần Invoice gắn theo sau.

## Hướng xử lý đề xuất
**FE (chờ BE xác nhận các câu hỏi mở ở trên trước khi merge, nhưng có thể làm trước ở nhánh riêng):**
1. Xóa trang: `app/app/w/[workspaceId]/invoices/`, `app/admin/invoices/`, `app/staff/invoices/` (toàn bộ thư mục).
2. Xóa component/lib chỉ phục vụ invoice: `components/admin/issue-invoice-pdf-modal.tsx`, `lib/invoice-pdf-url.ts`, `lib/admin-invoice-mismatch-labels.ts`.
3. Sửa `app/admin/orders/[orderId]/page.tsx`: bỏ khối UI "Hóa đơn" (dòng ~144-181) và field `invoice` khỏi type `AdminOrderDetail`.
4. Sửa `app/app/w/[workspaceId]/orders/[orderId]/page.tsx`: bỏ nút "Mở hóa đơn liên kết" (dòng ~92-98) và field `invoiceId` khỏi type `OrderDetail`.
5. Sửa `components/layout/internal-sidebar.tsx` và `components/layout/workspace-sidebar.tsx`: xóa mục menu "Hóa đơn".
6. Giữ nguyên Billing Profile (`invoiceEmail`...) trong `WorkspaceForm`/`app/app/workspaces/page.tsx` cho tới khi BE xác nhận câu hỏi mở ở trên.

**BE (đề xuất, PO duyệt):**
1. Ngừng tạo Invoice/Invoice Item khi Order chuyển `paid` (chỉ tạo Order + Order Item, dừng lại).
2. Xác nhận có deprecate các endpoint `/invoices*`, `/admin/invoices*`, `verify-issue-pdf` hay giữ lại cho mục đích tra cứu nội bộ không qua FE.
3. Xác nhận field `invoice`/`invoiceId` còn được trả kèm trong response order detail hay không.
4. Cập nhật `docs/MAIN_RULES.mdc` mục 10.4–10.8, 17.5 và `docs/FRONTEND_API_GUIDE_NEXTJS.mdc`/`docs/FRONTEND_ADMIN_ROUTER_API_MAP.mdc` phần invoice sau khi chốt.

## Xử lý
Chờ PO/BE xác nhận các câu hỏi mở. FE code removal: xem commit kèm issue này trên branch `dev`.
