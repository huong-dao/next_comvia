import { redirect } from "next/navigation";

/**
 * `redirectUrl` backend gửi Pay2S khi tạo đơn mua gói (guide 9B.3). Luồng QR không dùng và chưa xác nhận
 * Pay2S có redirect tới đây; giữ route phòng hờ để người dùng không gặp 404.
 */
export default function SubscriptionSuccessPage() {
  redirect("/app/subscription");
}
