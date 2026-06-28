import { supabase } from './supabase';

export interface FarmerCropSaleStat {
  name: string;
  unit: string;
  soldQuantity: number;
  purchaseCount: number;
  revenue: number;
  pricePerUnit: number;
}

const COMPLETED_STATUSES = new Set(['completed', 'delivered']);

async function fetchCompletedOrderIds(orderIds: string[]): Promise<Set<string>> {
  const completed = new Set<string>();
  if (orderIds.length === 0) return completed;

  const chunkSize = 40;
  for (let i = 0; i < orderIds.length; i += chunkSize) {
    const chunk = orderIds.slice(i, i + chunkSize);
    const { data, error } = await supabase
      .from('orders')
      .select('id, status')
      .in('id', chunk);
    if (error) throw error;
    for (const row of data ?? []) {
      const status = String(row.status ?? '').toLowerCase();
      if (COMPLETED_STATUSES.has(status)) {
        completed.add(String(row.id));
      }
    }
  }
  return completed;
}

/** Live top-crop stats from completed order_items where user is the seller. */
export async function fetchFarmerSalesStats(
  farmerId: string,
): Promise<FarmerCropSaleStat[]> {
  const { data: items, error } = await supabase
    .from('order_items')
    .select('cropName, quantity, unit, pricePerUnit, totalPrice, orderId')
    .eq('farmerId', farmerId);

  if (error) throw error;
  const rows = items ?? [];
  if (rows.length === 0) return [];

  const orderIds = [...new Set(rows.map((row) => String(row.orderId)).filter(Boolean))];
  const completedOrderIds = await fetchCompletedOrderIds(orderIds);

  const byCrop = new Map<string, FarmerCropSaleStat>();

  for (const row of rows) {
    if (!completedOrderIds.has(String(row.orderId))) continue;

    const name = String(row.cropName ?? 'Unknown');
    const key = name.toLowerCase();
    const qty = Number(row.quantity) || 0;
    const pricePerUnit = Number(row.pricePerUnit) || 0;
    const lineTotal =
      Number(row.totalPrice) || qty * pricePerUnit;

    const existing = byCrop.get(key);
    if (existing) {
      existing.soldQuantity += qty;
      existing.purchaseCount += 1;
      existing.revenue += lineTotal;
    } else {
      byCrop.set(key, {
        name,
        unit: String(row.unit ?? 'kg'),
        soldQuantity: qty,
        purchaseCount: 1,
        revenue: lineTotal,
        pricePerUnit,
      });
    }
  }

  return Array.from(byCrop.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
}
