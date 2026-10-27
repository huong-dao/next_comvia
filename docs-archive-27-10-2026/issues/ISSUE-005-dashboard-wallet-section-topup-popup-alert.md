# ISSUE-005: Dashboard — section "Thông tin Ví" (popup nạp tiền 2 bước, Alert nổi, cập nhật số dư không reload, danh sách giao dịch)

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO đã duyệt CR + làm rõ hiển thị đủ loại giao dịch — chờ SA thiết kế Alert/polling + backend BR-06/07)
**Phân loại:** Change Request (có phần cần SA thiết kế + backend đánh giá)
**Màn hình/route liên quan:** `app/app/w/[workspaceId]/dashboard/page.tsx`; tham chiếu `app/app/w/[workspaceId]/topup/page.tsx` (`TopupPage`), `app/app/w/[workspaceId]/wallet/page.tsx` (`WalletPage`)

## Mô tả gốc từ khách hàng/PO
> - Bên dưới section thông tin OA là section "Thông tin Ví" làm theo hình 7.
>   - Bên trái: nút "Nạp tiền" mở popup nạp tiền, giao diện tham khảo màn hình hiện có `.../topup`. Popup nạp tiền có 2 bước: Bước 1 CHỌN số tiền (không phải nhập tự do) — các mốc từ 500.000 đến 5.000.000, bước nhảy 500.000 (tức 500k, 1tr, 1.5tr, ... 5tr). Bước 2 là màn hình mã QR được load ra. Sau khi quét QR xong thì đóng popup lại, số dư ví tự tăng lên (không load lại toàn trang), có alert thông báo nạp tiền thành công — cần bổ sung component mới "Alert" dạng float góc trên-phải màn hình, hỗ trợ các loại success/error/warning...
>   - Phần "Tổng quan tháng này" bên trái: bỏ item "Sắp hết hạn", không làm. Item "Đã sử dụng" là tổng số tiền đã dùng khi gửi tin nhắn.
>   - Bên phải: danh sách TẤT CẢ giao dịch của ví. Hiện tại chỉ có 2 loại giao dịch: TOPUP (nạp tiền) và Gửi tin nhắn.

> **Đính chính của PO (2026-10-02):** câu "chỉ có 2 loại giao dịch" là PO **nhầm**. Yêu cầu đúng: danh sách hiển thị **ĐỦ tất cả loại giao dịch** backend đang có, không gộp/giới hạn. (Xem "Hành vi mong đợi".)

(Hình 7 = `9.webp`: box trái số dư + nút Nạp tiền/Xem lịch sử + "Tổng quan tháng này" (Đã nạp tháng này / Đã sử dụng / Sắp hết hạn — **bỏ "Sắp hết hạn"**); box phải "Danh sách giao dịch" filter Từ ngày/Đến ngày/Loại giao dịch + Lọc, bảng Mã GD/Thời gian/Loại/Số tiền/Trạng thái.)

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` §9.1 `GET /workspaces/:id/wallet/balance` trả `balance`, `totalTopup`, `totalSpent`, `totalRefund` (**lũy kế**, không theo tháng).
- §9.2 `GET /workspaces/:id/wallet/transactions?type=...` — lọc theo `type`.
- §9.4 `POST /topups/create-with-pay2s` (header `x-workspace-id`) trả `qrCodeUrl`, `topupCode`.
- §9.5 `GET /topups/:topupCode/status` — "FE nên **poll** endpoint này sau khi hiển thị QR để biết khi nào `status` chuyển `PAID`".
- `WalletTransactionType` (Phụ lục A): `TOPUP_CREDIT`, `MESSAGE_DEBIT`, `CAMPAIGN_HOLD`, `CAMPAIGN_REFUND`, `MANUAL_ADJUSTMENT`, `REVERSAL`.

## Hành vi thực tế đã verify
- Dashboard hiện **không** có section ví riêng; chỉ có 1 Card "Số dư credit" + nút "Nạp tiền" link sang `.../topup` (`dashboard/page.tsx:84-108`).
- `topup/page.tsx`: số tiền là **Input nhập tự do** (`topup/page.tsx:162`), có select tài khoản ngân hàng, nút "Tạo QR" gọi `POST /topups/create-with-pay2s` rồi hiển thị `qrCodeUrl` tại chỗ (`topup/page.tsx:94-121, 204-249`). **Không** có cơ chế poll trạng thái topup — sau khi hiện QR không có `GET /topups/:code/status`, không tự cập nhật số dư. Có khối mô phỏng webhook chỉ cho ADMIN.
- `wallet/page.tsx`: hiển thị 4 card lũy kế (Số dư / Tổng nạp / Đã chi / Hoàn), bảng giao dịch từ `GET .../wallet/transactions`. Select lọc theo `type` hiện **bị comment** (`wallet/page.tsx:104-111`); không có filter theo ngày.
- **Không** tồn tại component "Alert"/toast nổi nào trong `components/ui/` (có `modal.tsx` nhưng không có toast).
- "Tổng quan tháng này" (đã nạp tháng này / đã dùng tháng này / sắp hết hạn) **chưa có** ở bất kỳ màn nào.

## Hành vi mong đợi
- Section ví 2 box theo hình 7.
- Popup nạp tiền 2 bước: bước 1 chọn mốc tiền (500k → 5tr, bước 500k); bước 2 hiện QR. Sau khi thanh toán xong: đóng popup, **số dư tự tăng không reload trang**, hiện Alert "nạp tiền thành công".
- Component Alert nổi góc trên-phải, hỗ trợ success/error/warning.
- "Tổng quan tháng này": bỏ "Sắp hết hạn"; "Đã sử dụng" = tổng tiền đã dùng khi gửi tin.
- Box phải: danh sách **đủ tất cả loại giao dịch** backend trả về (PO đính chính — không gộp chỉ 2 loại) + filter ngày + filter loại giao dịch. Các loại theo `WalletTransactionType` (Phụ lục A): `TOPUP_CREDIT`, `MESSAGE_DEBIT`, `CAMPAIGN_HOLD`, `CAMPAIGN_REFUND`, `MANUAL_ADJUSTMENT`, `REVERSAL`. FE map label hiển thị tiếng Việt cho từng loại, không đổi giá trị enum.

## Phân tích tác động
- **Component Alert/toast là dùng chung toàn app** — cần một provider/context ở layout gốc để mọi màn gọi được. SA phải thiết kế (vị trí mount, API gọi, auto-dismiss). Đây không chỉ là việc của màn ví.
- **Cập nhật số dư không reload sau quét QR**: hiện FE **chưa có** cơ chế poll/realtime. API guide §9.5 đã có `GET /topups/:code/status` để poll → có thể poll tới khi `PAID` rồi refetch `wallet/balance`. SA cần quyết định polling interval/timeout; không bắt buộc WebSocket.
- Mốc tiền 500k–5tr: cần đối chiếu ràng buộc `amountExclVat` tối thiểu 10.000 của Pay2S (§9.4) — các mốc đều thỏa. Lưu ý VAT 10% cộng thêm khi hiển thị tổng.
- Filter ngày cho transactions: API §9.2 hiện chỉ tài liệu hóa `?type=` — cần backend xác nhận có hỗ trợ `fromDate`/`toDate` không.
- "Đã nạp tháng này" / "Đã sử dụng tháng này": `wallet/balance` chỉ trả lũy kế → cần aggregate theo tháng từ backend, hoặc FE tự cộng từ transactions (kém tin cậy nếu phân trang).

## Giả định / Câu hỏi mở
- `GIẢ ĐỊNH:` "số dư tự tăng không reload" triển khai bằng cách poll `GET /topups/:topupCode/status` tới khi `PAID` rồi refetch `GET /wallet/balance`. Chờ SA chốt thiết kế.
- PO đã chốt (2026-10-02): danh sách giao dịch hiển thị **đủ 6 loại** enum thật (không gộp); "Đã nạp tháng này" + % so với tháng trước **cần backend tính** (BR-06).

## Hướng xử lý đề xuất (chờ PO duyệt + SA thiết kế + backend làm rõ)
- Dựng section ví theo hình 7, bỏ "Sắp hết hạn".
- Popup nạp tiền 2 bước (chọn mốc → QR) tái dùng logic `POST /topups/create-with-pay2s`.
- Thêm component Alert dùng chung (SA thiết kế).
- Cập nhật số dư qua polling `/topups/:code/status` (SA chốt).

## Cần Backend team
- **Aggregate ví theo tháng**: "Đã nạp tháng này", "Đã sử dụng tháng này", và % so với tháng trước.
  - Lý do: `GET /wallet/balance` (§9.1) chỉ trả số **lũy kế** (`totalTopup`, `totalSpent`), không theo kỳ/tháng, không có % so với tháng trước.
- **Filter theo ngày cho transactions**: xác nhận/bổ sung `GET /wallet/transactions?fromDate=&toDate=` (và lọc theo nhóm loại).
  - Lý do: API guide §9.2 hiện chỉ tài liệu hóa tham số `?type=`; hình 7 yêu cầu lọc Từ ngày/Đến ngày.
- (Không cần mới) Xác nhận FE có thể poll `GET /topups/:topupCode/status` để biết `PAID` — đã có ở §9.5; chỉ cần backend đảm bảo endpoint hoạt động cho OWNER với header `x-workspace-id`.
- **BR-11 — cột "Trạng thái" bảng giao dịch:** xác nhận giao dịch ví có trường trạng thái không (tên field + enum nếu có; nếu không thì xác nhận để FE bỏ cột) + cập nhật §9.2 mô tả shape response. §9.2 hiện không mô tả shape; Phụ lục A không có enum trạng thái giao dịch; `TxRow` FE không có `status`.

## Xử lý
- **2026-10-02 — PO duyệt CR + đính chính:** danh sách giao dịch hiển thị ĐỦ tất cả loại (6 enum thật), không gộp chỉ 2 loại (PO nhầm ở mô tả gốc). "Đã nạp tháng này" + % so với tháng trước cần backend (BR-06). Bỏ "Sắp hết hạn"; "Đã sử dụng" = tiền dùng gửi tin.
- Nghiệp vụ đủ rõ. Còn phụ thuộc: SA thiết kế component Alert + cơ chế cập nhật số dư (polling `/topups/:code/status`); backend BR-06 (aggregate tháng) + BR-07 (filter ngày).
- **2026-10-02 — PO chọn hướng (c) cho cột "Trạng thái" (TICKET-011):** hỏi backend trước (BR-11) rồi mới quyết giữ hay bỏ cột. **Trong lúc chờ BR-11**, cột "Trạng thái" hiện giá trị `"—"`. Khi backend xác nhận: có field → map enum sang label tiếng Việt; không có → bỏ hẳn cột.
- **2026-10-02 — Backend phản hồi BR-06/07/11 (BR-06/07 code xong chờ deploy; BR-11 là xác nhận).** Điểm lệch so với FE provisional (`components/wallet/wallet-section.tsx`):
  - **BR-11 — KHÔNG có field trạng thái:** giao dịch ví là bút toán đã chốt → **FE GỠ HẲN cột "Trạng thái"** (hiện đang render phòng thủ). Phân biệt trực quan bằng `type`. "Đang xử lý/Thành công" chỉ có ở Topup (§9.5). *(← kết luận này đã bị ĐẢO NGƯỢC ngày 2026-10-03, xem dưới.)*
  - **2026-10-03 — BR-11 ĐẢO NGƯỢC (PO đổi quyết định):** giao dịch ví **CÓ** field `status` (`SUCCESS`/`PENDING`/`FAILED` → Thành công/Đang xử lý/Thất bại) + thêm query `status`. Code xong, chờ deploy. **FE phải KHÔI PHỤC cột "Trạng thái"** — nhưng `wallet-section.tsx` (TICKET-017) đã GỠ cột + bỏ `status` khỏi `TxRow` theo kết luận cũ. → **Cần ticket mới khôi phục cột "Trạng thái"** (thêm lại `status` vào `TxRow`, map 3 nhãn, tùy chọn filter `status`). Hiện data toàn `SUCCESS`; `PENDING`/`FAILED` là giá trị dành sẵn. Team Lead/Dev (UI + enum map, không cần SA).
  - **BR-06 — số liệu tháng:** thật nằm trong `GET /wallet/balance` field `monthly.toppedUp/used` + `changePercent` (nullable; toàn bộ `monthly` = null nếu chưa có ví). FE provisional dùng `topupThisMonth/spentThisMonth` + `deltaPercent` → đổi tên field + xử lý null ở TICKET-017.
  - **BR-07 — filter/phân trang:** thật hỗ trợ `offset/limit` (server-side, 1–100), `types` (nhiều), `fromDate/toDate` (YYYY-MM-DD neo giờ VN). FE hiện phân trang **client-side** + filter ngày UI chưa wire → TICKET-017 chuyển sang phân trang server-side + wire date/types **sau khi deploy**.

## Thiết kế SA (2026-10-02)
- **Component Alert/toast dùng chung toàn app — `components/ui/toast.tsx`:** `ToastProvider` mount một lần ở `app/layout.tsx` (root) bọc `{children}` → mọi nhóm route dùng được. Cơ chế: React Context + `createPortal`, viewport góc trên-phải, auto-dismiss ~4s. API: `useToast().showToast({ type, message })`, type success/error/warning/info. **KHÔNG thư viện ngoài** (quy mô một app, Context + portal đủ) → không cần ADR. Chi tiết ở `coding-convention.md` mục "Toast/Alert".
- **Cập nhật số dư không reload — polling, không WebSocket** (BR-08 xác nhận endpoint có): hook chuyên dụng `lib/use-topup-status.ts` → `useTopupStatusPolling(topupCode, { workspaceId, onPaid })`. Interval **3s**; dừng khi `status === "PAID"` (→ refetch `GET /wallet/balance`, đóng popup, toast success) hoặc timeout **5 phút** (toast warning) hoặc unmount. Không tạo `usePoll` generic (chỉ một nơi dùng). Chi tiết ở `coding-convention.md` mục "Polling trạng thái".
- **Stat block tái dùng** từ ISSUE-002 cho cụm "Tổng quan tháng này" (`components/app/stat-block.tsx`). "Đã nạp tháng này"/"Đã sử dụng tháng này" + % chờ BR-06; interface `// PROVISIONAL (BR-06)`.
- Popup nạp 2 bước (chọn mốc 500k–5tr → QR) tái dùng `POST /topups/create-with-pay2s`; danh sách giao dịch map label tiếng Việt cho đủ 6 enum `WalletTransactionType`; filter ngày chờ BR-07.
- **Sẵn sàng Team Lead chẻ ticket** phần toast + popup + section UI. Số liệu tháng + filter ngày chờ BR-06/07.
