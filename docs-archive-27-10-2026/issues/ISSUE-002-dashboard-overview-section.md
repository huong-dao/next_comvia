# ISSUE-002: Dashboard — section "Tổng quan hoạt động" (4 block chỉ số + filter theo kỳ)

> **Audit 26/10/2026:** các mô tả hiện trạng/đang chờ bên dưới là snapshot lịch sử. Phần triển khai liên quan đã có trong source; xem [ma trận module/ticket và khoảng trống hiện tại](../audits/2026-10-26-repo-audit.md). Chưa đóng acceptance hoặc nghiệm thu E2E qua lượt audit này.

**Trạng thái:** Đang xử lý (PO đã duyệt CR + chốt định nghĩa 4 chỉ số — chờ backend BR-02, SA có thể thiết kế song song)
**Phân loại:** Change Request
**Màn hình/route liên quan:** `app/app/w/[workspaceId]/dashboard/page.tsx` (`DashboardPage`)

## Mô tả gốc từ khách hàng/PO
> 2. Màn hình `https://app.comvia.cloud/app/w/{workspaceId}/dashboard`:
>    - Bên dưới tiêu đề sẽ là section tổng quan, hiện tại đã có rồi nhưng cần sửa lại giao diện và nội dung theo hình 1. Có Tiêu đề "Tổng quan hoạt động". 4 block item, và một select dropdown chọn ngày filter (7 ngày qua, tháng qua, năm qua).

(Hình 1 = ảnh `3.png`: tiêu đề "Tổng quan hoạt động" + dropdown "7 ngày qua" góc phải; 4 block: "Tin nhắn đã gửi" (12.458, ↑12%), "Khách hàng tương tác" (4.320, ↑8%), "Mẫu tin đang hoạt động" (5, ↑25%), "Tỷ lệ gửi thành công" (98%, ↑2%) — mỗi block có icon + số liệu + nhãn + % thay đổi so với kỳ trước.)

## Rule/API hiện tại
- `docs/FRONTEND_API_GUIDE_NEXTJS.mdc`: **không có** endpoint analytics/dashboard overview nào (grep "analytics/dashboard/overview/thống kê/tổng quan" → không có kết quả).
- Có sẵn: §9.1 `GET /workspaces/:id/wallet/balance`, §7.2 `GET /workspaces/:id/templates`, §8.2 `GET /workspaces/:id/messages/logs`.
- `MessageStatus` (Phụ lục A): `PENDING`, `SUCCESS`, `FAILED`.

## Hành vi thực tế đã verify
- Dashboard hiện có 4 Card thống kê (`dashboard/page.tsx:83-102`) nhưng nội dung là: "Số dư credit", "Tổng template", "Tin gần đây (50 bản ghi)", "Tin lỗi (trong 50 bản ghi)".
- Dữ liệu lấy bằng cách gọi song song 3 API và tính thủ công phía client (`dashboard/page.tsx:34-57`): balance từ wallet, đếm `templates.length`, đếm `logs.length` (giới hạn `?limit=50`), đếm log có `status === "FAILED"`.
- **Không** có dropdown filter theo kỳ; **không** có "% thay đổi so với kỳ trước"; **không** có chỉ số "Khách hàng tương tác" hay "Tỷ lệ gửi thành công".
- Tiêu đề section hiện là PageHeader "Chào mừng bạn đến với Comvia!" (`dashboard/page.tsx:72`), không phải "Tổng quan hoạt động".

## Hành vi mong đợi
- Section tiêu đề "Tổng quan hoạt động" + dropdown chọn kỳ: 7 ngày qua / tháng qua / năm qua.
- 4 block: Tin nhắn đã gửi, Khách hàng tương tác, Mẫu tin đang hoạt động, Tỷ lệ gửi thành công — mỗi block kèm % thay đổi so với kỳ trước (mũi tên tăng/giảm, màu xanh/đỏ).

## Phân tích tác động
- Cục bộ `dashboard/page.tsx`. Cần một component "stat block" có icon + số + % delta — SA cân nhắc có nên tạo component dùng chung (ví CREDIT ở ISSUE-005 cũng có cụm "so với tháng trước" tương tự).
- Hiện cách tính client-side (đếm 50 log gần nhất) không thể suy ra số liệu theo kỳ chính xác, cũng không có "% so với kỳ trước" → không khả thi nếu không có aggregate từ backend.

## Định nghĩa 4 chỉ số (PO chốt 2026-10-02)
1. **Tin nhắn đã gửi** — số bản ghi tin đã gửi trong kỳ (backend tính).
2. **Khách hàng tương tác** — **TẠM THỜI HARDCODE một con số tĩnh ở FE** (demo, KHÔNG phải số liệu thật, backend không cần tính giai đoạn này). Phải ghi chú rõ trong ticket để không ai hiểu nhầm là số thật.
3. **Mẫu tin đang hoạt động** = số template trạng thái `APPROVED` (backend tính).
4. **Tỷ lệ gửi thành công** = trung bình % bản ghi `MessageLog` có `status = SUCCESS` trên tổng trong kỳ: `SUCCESS / (SUCCESS + FAILED) * 100` (backend tính).
- **"So với kỳ trước"** = kỳ liền trước **cùng độ dài** (7 ngày trước đó / tháng trước / năm trước). Áp dụng cho các chỉ số backend tính.

## Giả định / Câu hỏi mở
(không còn — PO đã chốt toàn bộ định nghĩa, xem mục trên + Xử lý)

## Hướng xử lý đề xuất (đã PO duyệt)
- Thêm section mới với dropdown kỳ + 4 stat block.
- 3 chỉ số (1,3,4) lấy từ **endpoint aggregate mới từ backend** (BR-02) trả giá trị kỳ hiện tại + % so với kỳ liền trước.
- Chỉ số "Khách hàng tương tác" FE hardcode tạm (có chú thích demo).

## Cần Backend team
- **Endpoint mới (BR-02)**: dashboard/analytics overview theo workspace + kỳ, trả cho **3 chỉ số** (tin nhắn đã gửi, mẫu tin đang hoạt động = template APPROVED, tỷ lệ gửi thành công = SUCCESS/(SUCCESS+FAILED)*100) kèm % so với kỳ liền trước cùng độ dài.
- Chỉ số "Khách hàng tương tác" **KHÔNG cần backend** — FE hardcode tạm.

## Xử lý
- **2026-10-02 — PO duyệt CR + chốt định nghĩa 4 chỉ số** (xem mục "Định nghĩa 4 chỉ số"). Điểm cần nhớ: "Khách hàng tương tác" chỉ hardcode tạm ở FE, không phải số thật.
- Nghiệp vụ đủ rõ. Chờ backend BR-02 (3 chỉ số thật); SA có thể thiết kế section + stat block song song.
- **2026-10-02 — Backend code xong BR-02 (chờ deploy).** Hợp đồng thật: `GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year` (API guide §9A). **Điểm lệch so với FE provisional (`components/app/overview-section.tsx`):** (1) tên field delta: FE dùng `deltaPercent` → thật là **`changePercent`**; (2) `changePercent` có thể **null** (ẩn badge) — FE đang giả định luôn là number; (3) `successRate.value` có thể **null** → hiển thị "—" (FE đang render `${value}%` cứng); (4) `activeTemplates.changePercent` **luôn null**. "Khách hàng tương tác" đúng như chốt: FE hardcode. → Dev chỉ đổi tên field + xử lý null ở TICKET-016 **sau khi backend deploy**.
- **2026-10-03 — Làm rõ thêm (không đổi shape, không phát sinh việc FE):** (1) "Tin nhắn đã gửi" tính **cả tin FAILED** (có `sentAt`), loại `PENDING`. (2) Cách so kỳ `changePercent`: kỳ trước = **đoạn cùng độ dài đã trôi qua, clamp** (month/year không vượt hết tháng/năm trước; 7d là 7 ngày kề trước) — backend tính nội bộ, FE chỉ hiển thị `changePercent`. BR-06 (ví) dùng cùng quy tắc so kỳ.

## Thiết kế SA (2026-10-02)
- **Component dùng chung mới `components/app/stat-block.tsx`** (icon + value + label + delta optional). Dùng lại ở cụm "Tổng quan tháng này" của ví (ISSUE-005). Đặt ở `components/app/` vì dùng chung nhiều màn nhóm app. Chi tiết props ở `coding-convention.md` mục "Stat block".
- **"Khách hàng tương tác" hardcode tạm:** khai báo constant đặt tên rõ demo (vd `DEMO_PLACEHOLDER_CUSTOMER_INTERACTION`) + comment `// TODO`, KHÔNG là field trong type response analytics. Quy ước ở `coding-convention.md` mục "Giá trị demo/hardcode tạm".
- **Interface dự kiến cho endpoint analytics (PROVISIONAL — BR-02):**
  ```ts
  // GET /workspaces/:workspaceId/analytics/overview?period=7d|month|year
  type OverviewMetric = { value: number; deltaPercent: number }; // delta so với kỳ liền trước cùng độ dài
  type OverviewResponse = {
    messagesSent: OverviewMetric;      // chỉ số 1
    activeTemplates: OverviewMetric;   // chỉ số 3 (template APPROVED)
    successRate: OverviewMetric;       // chỉ số 4, % = SUCCESS/(SUCCESS+FAILED)*100
    // KHÔNG có "khách hàng tương tác" — FE hardcode
  };
  ```
  Đánh dấu `// PROVISIONAL (BR-02)` trong code; Dev đối chiếu tên field khi backend chốt.
- Không cần ADR (không đổi pattern gọi API/session; chỉ thêm component + type).
- **Sẵn sàng Team Lead chẻ ticket phần UI tĩnh + stat block ngay.** Nối dữ liệu thật 3 chỉ số chờ backend BR-02.
