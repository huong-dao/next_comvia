/** Đơn giá VND/tin dùng cho ước tính preflight (ưu tiên snapshot trên campaign). */
export function resolveUnitPriceVnd(input: {
  campaignUnitPrice?: number | string | null;
  templateUnitPrice?: number | string | null;
  defaultUnitPrice?: number | string | null;
}): number | null {
  for (const v of [input.campaignUnitPrice, input.templateUnitPrice, input.defaultUnitPrice]) {
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : Number(v);
    if (Number.isFinite(n) && n >= 0) return n;
  }
  return null;
}

export function estimateCampaignCostVnd(unitPrice: number | null, rowCount: number) {
  if (unitPrice == null || rowCount <= 0) return null;
  return unitPrice * rowCount;
}
