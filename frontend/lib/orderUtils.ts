/** Normalize production order row field names (camelCase vs snake_case). */
export function orderTotal(order: { totalAmount?: number; total_amount?: number }): number {
  return Number(order.totalAmount ?? order.total_amount ?? 0);
}

export function orderCreatedAt(order: { createdAt?: string; created_at?: string }): string {
  return order.createdAt ?? order.created_at ?? '';
}

export function orderBuyerId(order: { buyerId?: string; buyer_id?: string }): string | undefined {
  return order.buyerId ?? order.buyer_id;
}

export function orderItemName(item: { cropName?: string; crop_name?: string }): string {
  return item.cropName ?? item.crop_name ?? 'Item';
}

export function orderItemPrice(item: { pricePerUnit?: number; price_per_unit?: number }): number {
  return Number(item.pricePerUnit ?? item.price_per_unit ?? 0);
}

export function orderItemFarmerId(item: { farmerId?: string; farmer_id?: string }): string | undefined {
  return item.farmerId ?? item.farmer_id;
}

export function orderItemOriginalFarmerId(
  item: { originalFarmerId?: string; original_farmer_id?: string },
): string | undefined {
  return item.originalFarmerId ?? item.original_farmer_id;
}
