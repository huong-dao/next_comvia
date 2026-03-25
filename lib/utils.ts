import dayjs from "dayjs";

export const formatDate = (date: string | Date, format: string = "DD/MM/YYYY") => {
  return dayjs(date).format(format);
};

export const formatVND = (amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
};