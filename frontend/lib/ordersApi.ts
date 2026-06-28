import { supabase } from './supabase';
import { withRetry, friendlyError } from './asyncUtils';
import { orderCreatedAt, orderItems, safeOrderId } from './orderUtils';
import { isSellerRole } from './roleUtils';

export type OrderRow = {
  id: string;
  buyerId?: string;
  buyer_id?: string;
  buyerName?: string;
  buyer_name?: string;
  totalAmount?: number;
  total_amount?: number;
  status?: string;
  createdAt?: string;
  created_at?: string;
  order_items?: unknown[];
  orderItems?: unknown[];
};

const CHUNK_SIZE = 40;

/** Attach normalized order_items array on each order row. */
export function normalizeOrderRow(row: Record<string, unknown> | null | undefined): OrderRow {
  if (row == null || typeof row !== 'object') {
    return { id: '', order_items: [] };
  }
  const id = String(row.id ?? '');
  const items = orderItems({ order_items: row.order_items, orderItems: row.orderItems });
  return {
    id,
    buyerId: row.buyerId as string | undefined,
    buyer_id: row.buyer_id as string | undefined,
    buyerName: row.buyerName as string | undefined,
    buyer_name: row.buyer_name as string | undefined,
    totalAmount: row.totalAmount as number | undefined,
    total_amount: row.total_amount as number | undefined,
    status: row.status as string | undefined,
    createdAt: row.createdAt as string | undefined,
    created_at: row.created_at as string | undefined,
    order_items: items,
  };
}

async function fetchBuyerOrders(userId: string): Promise<OrderRow[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .eq('buyerId', userId);

  if (error) throw error;
  return (data ?? [])
    .filter((row): row is Record<string, unknown> => row != null && typeof row === 'object')
    .map((row) => normalizeOrderRow(row));
}

async function fetchSellerOrderIds(userId: string): Promise<string[]> {
  const [farmerRes, sellerRes] = await Promise.all([
    supabase.from('order_items').select('orderId').eq('farmerId', userId),
    supabase.from('order_items').select('orderId').eq('sellerId', userId),
  ]);

  if (farmerRes.error) throw farmerRes.error;
  if (sellerRes.error) throw sellerRes.error;

  const toOrderId = (i: Record<string, unknown> | null | undefined): string => {
    if (i == null || typeof i !== 'object') return '';
    return String(i.order_id ?? i.orderId ?? '');
  };

  const ids = [
    ...(farmerRes.data ?? []).map((i) => toOrderId(i as Record<string, unknown>)),
    ...(sellerRes.data ?? []).map((i) => toOrderId(i as Record<string, unknown>)),
  ];
  return [...new Set(ids.filter(Boolean))];
}

async function fetchOrdersByIds(ids: string[]): Promise<OrderRow[]> {
  if (ids.length === 0) return [];

  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
    chunks.push(ids.slice(i, i + CHUNK_SIZE));
  }

  const results: OrderRow[] = [];
  for (const chunk of chunks) {
    const { data, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .in('id', chunk);
    if (error) throw error;
    results.push(
      ...(data ?? [])
        .filter((row): row is Record<string, unknown> => row != null && typeof row === 'object')
        .map((row) => normalizeOrderRow(row)),
    );
  }
  return results;
}

export async function fetchUserOrders(
  userId: string,
  role: string,
): Promise<OrderRow[]> {
  return withRetry(async () => {
    const buyerOrders = await fetchBuyerOrders(userId);

    let sellerOrders: OrderRow[] = [];
    if (isSellerRole(role)) {
      const orderIds = await fetchSellerOrderIds(userId);
      sellerOrders = await fetchOrdersByIds(orderIds);
    }

    const merged = new Map<string, OrderRow>();
    for (const order of [...buyerOrders, ...sellerOrders]) {
      if (order == null || typeof order !== 'object') continue;
      const orderId = safeOrderId(order);
      if (orderId !== 'unknown') merged.set(orderId, order);
    }

    return Array.from(merged.values()).sort((a, b) => {
      const tb = new Date(orderCreatedAt(b)).getTime();
      const ta = new Date(orderCreatedAt(a)).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
  });
}

export { friendlyError };
