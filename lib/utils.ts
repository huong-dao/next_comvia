import dayjs from "dayjs";

export const formatDate = (date: string | Date, format: string = "DD/MM/YYYY") => {
  return dayjs(date).format(format);
};

/** Tiền BE trả dạng Decimal → JSON thường là string: parse trước khi format; thiếu/không phải số thì "—". */
export const formatVNDOrDash = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") return "—";
  const n = Number(amount);
  return Number.isFinite(n) ? formatVND(n) : "—";
};

export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
};