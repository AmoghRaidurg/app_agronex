function coalesceOrderItems(items: unknown): unknown[] {
  if (items == null) return [];
  if (Array.isArray(items)) return items;
  if (typeof items === 'object') return [items];
  return [];
}

function safeNumber(value: unknown, fallback = 0): number {
  if (value == null) return fallback;
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

/** Normalize production order row field names (camelCase vs snake_case). */
export function orderTotal(order: { totalAmount?: number; total_amount?: number } | null | undefined): number {
  if (order == null || typeof order !== 'object') return 0;
  return safeNumber(order.totalAmount ?? order.total_amount ?? 0);
}

export function orderCreatedAt(order: { createdAt?: string; created_at?: string } | null | undefined): string {
  if (order == null || typeof order !== 'object') return '';
  return order.createdAt ?? order.created_at ?? '';
}

export function orderBuyerId(order: { buyerId?: string; buyer_id?: string } | null | undefined): string | undefined {
  if (order == null || typeof order !== 'object') return undefined;
  return order.buyerId ?? order.buyer_id;
}

export function orderItemName(item: { cropName?: string; crop_name?: string } | null | undefined): string {
  if (item == null || typeof item !== 'object') return 'Item';
  return item.cropName ?? item.crop_name ?? 'Item';
}

export function orderItemPrice(item: { pricePerUnit?: number; price_per_unit?: number } | null | undefined): number {
  if (item == null || typeof item !== 'object') return 0;
  return safeNumber(item.pricePerUnit ?? item.price_per_unit ?? 0);
}

export function orderItemFarmerId(
  item: { farmerId?: string; farmer_id?: string } | null | undefined,
): string | undefined {
  if (item == null || typeof item !== 'object') return undefined;
  return item.farmerId ?? item.farmer_id;
}

export function orderItemOriginalFarmerId(
  item: { originalFarmerId?: string; original_farmer_id?: string } | null | undefined,
): string | undefined {
  if (item == null || typeof item !== 'object') return undefined;
  return item.originalFarmerId ?? item.original_farmer_id;
}

export function safeOrderId(order: { id?: string | null } | null | undefined): string {
  if (order == null || typeof order !== 'object') return 'unknown';
  const id = order.id;
  if (id == null || id === '') return 'unknown';
  return String(id);
}

export function orderItems(order: {
  order_items?: unknown;
  orderItems?: unknown;
} | null | undefined): unknown[] {
  if (order == null || typeof order !== 'object') return [];
  return coalesceOrderItems(order.order_items ?? order.orderItems);
}
