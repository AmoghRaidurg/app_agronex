import { supabase } from './supabase';
import { withRetry, friendlyError } from './asyncUtils';
import { orderCreatedAt } from './orderUtils';

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

const SELLER_ROLES = new Set(['farmer', 'trader', 'industrialist']);
const CHUNK_SIZE = 40;

function orderItemsList(order: OrderRow): unknown[] {
  const items = order.order_items ?? order.orderItems;
  return Array.isArray(items) ? items : [];
}

/** Attach normalized order_items array on each order row. */
export function normalizeOrderRow(row: Record<string, unknown>): OrderRow {
  const id = String(row.id ?? '');
  const items = orderItemsList({ ...row, id, order_items: row.order_items, orderItems: row.orderItems } as OrderRow);
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
  return (data ?? []).map((row) => normalizeOrderRow(row as Record<string, unknown>));
}

async function fetchSellerOrderIds(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('orderId')
    .eq('farmerId', userId);

  if (error) throw error;
  return [...new Set((data ?? []).map((i) => String(i.orderId)).filter(Boolean))];
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
    results.push(...(data ?? []).map((row) => normalizeOrderRow(row as Record<string, unknown>)));
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
    if (SELLER_ROLES.has(role)) {
      const orderIds = await fetchSellerOrderIds(userId);
      sellerOrders = await fetchOrdersByIds(orderIds);
    }

    const merged = new Map<string, OrderRow>();
    for (const order of [...buyerOrders, ...sellerOrders]) {
      if (order.id) merged.set(order.id, order);
    }

    return Array.from(merged.values()).sort((a, b) => {
      const tb = new Date(orderCreatedAt(b)).getTime();
      const ta = new Date(orderCreatedAt(a)).getTime();
      return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
    });
  });
}

export { friendlyError };
