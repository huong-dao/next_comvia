# ISSUE-003: Warmup phiên đăng nhập — gia hạn trượt 30 ngày khi còn hoạt động

**Trạng thái:** Đang xử lý — PO đã chốt chọn Hướng B (refresh token chuẩn), chờ BE trả lời các câu hỏi mở còn lại
**Phân loại:** Missing Spec (tính năng mới, chưa có rule/API)
**Màn hình/route liên quan:** Toàn bộ app — cơ chế xác thực dùng chung (`lib/auth.ts`, `lib/comviaFetch.ts`), không riêng 1 trang

## Mô tả gốc từ khách hàng/PO
> PO có một đề xuất là: warmup tài khoản đăng nhập. Tức là nếu tôi có một tài khoản Owner hoặc Admin hoặc bất kỳ role nào. Nếu tôi đăng nhập vào thì sao 30 ngày mới hết hạn. Nhưng nếu trước 30 ngày mà tôi vào lại (chỉ vào chứ không đăng nhập vì đã lưu trong 30 ngày) thì thời gian lại được gia hạn thêm 30 ngày nữa. Tức là nếu một user vào comvia bằng url bất kỳ khi đã đăng nhập rồi không quá 30 ngày thì hầu như user đó không cần đăng nhập lại. Bạn phân tích yêu cầu của PO để xem triển khai được không và BE có cần làm gì không thì báo

Diễn giải lại cho rõ: đăng nhập 1 lần (Owner/Admin/Staff/bất kỳ role nào) → phiên có hạn 30 ngày. Nếu trong vòng 30 ngày đó, user chỉ cần **mở lại app bằng URL bất kỳ** (không cần nhập lại email/mật khẩu, vì đã có phiên lưu sẵn) → hệ thống tự **gia hạn thêm 30 ngày kể từ thời điểm đó**. Nếu user duy trì thói quen vào app đều đặn (chưa bao giờ để quá 30 ngày không vào), họ sẽ **gần như không bao giờ phải đăng nhập lại**.

## Rule/API hiện tại
Chưa có — grep toàn bộ `docs/FRONTEND_API_GUIDE_NEXTJS.mdc` không có mục nào ghi thời hạn JWT access token, và không có endpoint `refresh`/`reissue` nào cho phiên đăng nhập user (phân biệt với `hasRefreshToken` ở mục 6.3 — đó là refresh token của **Zalo OA OAuth**, không liên quan tới phiên đăng nhập user).

Cơ chế hiện tại (`lib/auth.ts`):
- `saveAuthSession({ accessToken, user, remember })`: nếu `remember = true` → lưu `localStorage` (sống qua việc đóng trình duyệt); nếu `false` → lưu `sessionStorage` (mất khi đóng tab).
- **Quan trọng:** checkbox "Ghi nhớ đăng nhập" ở màn login **chỉ quyết định nơi lưu token trên trình duyệt**, **không** làm thay đổi thời hạn (`exp`) thật sự của JWT do BE ký. JWT là dữ liệu bất biến sau khi phát hành — FE không có cách nào tự "gia hạn" một token đã ký, bắt buộc phải xin BE cấp token mới.
- Không tìm thấy tài liệu nào ghi JWT access token của user hiện sống bao lâu (khác với token impersonate ở ISSUE-002, có ghi rõ 20 phút, không refresh).

## Hành vi thực tế đã verify
- Login (`app/auth/login/page.tsx`) và verify-otp chỉ nhận về đúng 1 `accessToken`, không có `refreshToken` nào đi kèm.
- `getAccessToken()` (`lib/auth.ts`) chỉ đọc token đã lưu, không có logic gọi API nào để làm mới/gia hạn token.
- `comviaFetch`/`useComviaQuery` không có xử lý nào cho việc "token sắp hết hạn" — chỉ xử lý khi API đã trả `401` (lúc đó điều hướng thẳng về `/auth/login`, không thử gia hạn).
- Kết luận: với hành vi hiện tại, nếu JWT của BE có hạn ngắn hơn 30 ngày (nhiều khả năng, vì chưa thấy cấu hình nào ghi 30 ngày), thì dù user tick "Ghi nhớ đăng nhập" và token vẫn còn nằm trong `localStorage`, họ **vẫn bị 401 và bị đá về trang đăng nhập trước khi tới mốc 30 ngày** — tức yêu cầu của PO (30 ngày + gia hạn trượt) **chưa khớp với hành vi thật hiện tại**, kể cả bỏ qua phần "gia hạn trượt".

## Hành vi mong đợi
Theo yêu cầu PO:
- Đăng nhập 1 lần (mọi role: Owner/Admin/Staff) → phiên có hạn 30 ngày.
- Trong 30 ngày đó, chỉ cần mở lại app (bất kỳ URL nào, không cần nhập lại thông tin đăng nhập) → phiên tự gia hạn thêm 30 ngày tính từ thời điểm đó (sliding/rolling expiration).
- User dùng app đều đặn (khoảng cách giữa 2 lần vào < 30 ngày) → gần như không bao giờ bị bắt đăng nhập lại.

## Phân tích tác động
JWT access token là **bất biến** — không thể "gia hạn" một token đã ký mà không phát hành token mới. Muốn có hành vi trên, bắt buộc BE phải cấp một token mới mỗi khi phát hiện user "còn hoạt động", theo 1 trong 2 hướng:

**Hướng A — Reissue đơn giản (1 access token duy nhất, hạn dài)** — đã cân nhắc, **không chọn**
- Access token hạn 30 ngày, BE ký token mới trả qua response header khi gần hết hạn.
- Rủi ro bảo mật cao hơn: 1 token duy nhất có toàn quyền tài khoản, nằm ở `localStorage`/`sessionStorage` (không phải httpOnly cookie) — nếu bị đánh cắp qua XSS, token đó tự gia hạn vô thời hạn miễn kẻ tấn công dùng đều đặn, y hệt rủi ro của chính user thật.

**Hướng B — Refresh token chuẩn → PO ĐÃ CHỐT CHỌN HƯỚNG NÀY**
- Access token sống ngắn (vd 1 giờ) + refresh token sống dài (30 ngày, trượt). FE âm thầm gọi `POST /auth/refresh` bằng refresh token để lấy access token mới trước khi hết hạn (hoặc khi gặp `401`). Mỗi lần refresh thành công, BE **rotate** refresh token (đổi token mới, hạn 30 ngày mới) để chống replay nếu refresh token cũ bị lộ.
- Tận dụng lại cơ chế `tokenVersion` đã có (đang dùng để vô hiệu hóa token khi đổi mật khẩu) để vô hiệu hóa refresh token khi cần.
- Công sức FE vừa phải (thêm vòng refresh nền, xử lý khi refresh thất bại → về trang đăng nhập).
- An toàn hơn: access token lộ ra chỉ dùng được trong thời gian ngắn; refresh token có thể revoke/rotate riêng.

Đây là thay đổi **lõi cơ chế xác thực dùng chung toàn bộ app** (mọi route, mọi role) — không phải tính năng cục bộ 1 trang, cần cẩn trọng khi triển khai và rollout.

Lưu ý thêm: hệ thống vừa có tính năng "đăng nhập hộ" (ISSUE-002) với token impersonate ngắn hạn (20 phút, không refresh) — chọn Hướng B giữ nhất quán mức độ an toàn giữa 2 cơ chế, không làm tăng bề mặt rủi ro như Hướng A.

## Giả định / Câu hỏi mở
**Đã chốt bởi PO:** chọn **Hướng B — refresh token chuẩn** (access token ngắn hạn + refresh token 30 ngày, trượt, rotation mỗi lần dùng). Không làm Hướng A.

CÂU HỎI MỞ: JWT access token hiện tại của user (không phải token impersonate) đang có hạn bao lâu? (Cần biết để BE thiết kế lại thời hạn access token ngắn hơn theo Hướng B, ví dụ 1 giờ.)
CÂU HỎI MỞ: "Vào lại" được tính là hành động gì — bất kỳ API call nào thành công (kể cả gọi ngầm, không phải thao tác của user), hay chỉ tính khi user thực sự mở 1 trang mới / F5?
CÂU HỎI MỞ: Checkbox "Ghi nhớ đăng nhập" (hiện chỉ quyết định `localStorage` vs `sessionStorage`) có áp dụng sliding 30 ngày cho cả 2 trường hợp hay chỉ khi tick "Ghi nhớ"? Nếu không tick, token nằm `sessionStorage` vốn đã mất khi đóng tab — sliding 30 ngày sẽ vô nghĩa với case này, cần PO xác nhận có chấp nhận không.
CÂU HỎI MỞ: Có áp dụng sliding 30 ngày cho **mọi role** (Owner, Admin, Staff) như PO nói, hay cần giới hạn riêng cho role nhạy cảm (vd Admin) vì rủi ro bảo mật cao hơn nếu tài khoản admin bị chiếm quyền kéo dài?
CÂU HỎI MỞ: Refresh token (Hướng B) lưu ở đâu phía FE — vẫn `localStorage`/`sessionStorage` như hiện tại, hay chuyển sang httpOnly cookie (an toàn hơn trước XSS nhưng cần BE hỗ trợ set-cookie qua CORS đúng cấu hình)?
GIẢ ĐỊNH: Yêu cầu này áp dụng cho phiên đăng nhập thường (user/owner/admin/staff tự đăng nhập), **không** áp dụng cho token "đăng nhập hộ" (impersonate, ISSUE-002) — token đó giữ nguyên 20 phút, không refresh, không sliding.

## Hướng xử lý đề xuất
**BE — cần làm theo Hướng B (đề xuất, chờ BE xác nhận contract chi tiết):**
1. Trả lời các câu hỏi mở còn lại ở trên (thời hạn access token hiện tại, định nghĩa "vào lại", áp dụng cho role nào, lưu refresh token ở đâu).
2. Thiết kế access token ngắn hạn (vd 1 giờ) + refresh token 30 ngày, trượt.
3. Thêm endpoint `POST /auth/refresh` — nhận refresh token, trả access token mới + refresh token mới (rotation).
4. Vô hiệu hóa refresh token khi đổi mật khẩu (tái dùng `tokenVersion`), và khi user chủ động đăng xuất.
5. Audit/giới hạn tốc độ gọi `/auth/refresh` hợp lý để tránh lạm dụng.

**FE — làm sau khi BE xác nhận contract endpoint `/auth/refresh`:**
1. Thêm vòng refresh nền: trước khi access token hết hạn (hoặc khi gặp `401`), gọi `/auth/refresh` bằng refresh token đang lưu, cập nhật lại cả access token và refresh token mới vào đúng storage (`localStorage`/`sessionStorage` theo "Ghi nhớ đăng nhập").
2. Nếu refresh thất bại (refresh token hết hạn/bị thu hồi) → `clearAuthSession()` + điều hướng `/auth/login`.
3. Không đổi hành vi của token impersonate (ISSUE-002) — vẫn giữ nguyên 20 phút, không refresh, không áp dụng sliding.

## Xử lý
PO đã chốt Hướng B. Chờ BE trả lời các câu hỏi mở còn lại và xác nhận contract `POST /auth/refresh` trước khi FE bắt đầu code.
