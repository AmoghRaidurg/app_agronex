import { supabase } from './supabase';
import type { WalletHistoryType } from './commerceMeta';
import { withRetry } from './asyncUtils';

export interface WalletHistoryEntry {
  id: string;
  user_id: string;
  type: WalletHistoryType | string;
  amount: number | string;
  description?: string | null;
  created_at: string;
  order_id?: string | null;
}

function normalizeWalletEntry(row: Record<string, unknown>): WalletHistoryEntry {
  return {
    id: String(row.id ?? ''),
    user_id: String(row.userId ?? row.user_id ?? ''),
    type: String(row.type ?? ''),
    amount: (row.amount ?? 0) as number | string,
    description: (row.description as string | null) ?? null,
    created_at: String(row.createdAt ?? row.created_at ?? ''),
    order_id: (row.orderId ?? row.order_id ?? null) as string | null,
  };
}

/** Authoritative balance from production users table. */
export async function fetchWalletBalance(userId: string): Promise<number> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('users')
      .select('walletBalance')
      .eq('uid', userId)
      .single();

    if (error) throw error;
    return Number(data?.walletBalance) || 0;
  });
}

export async function fetchWalletHistory(userId: string, limit?: number): Promise<WalletHistoryEntry[]> {
  return withRetry(async () => {
    let query = supabase
      .from('wallet_history')
      .select('*')
      .eq('userId', userId)
      .order('createdAt', { ascending: false });

    if (limit) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map((row) => normalizeWalletEntry(row as Record<string, unknown>));
  });
}

export function isWalletCredit(type: string): boolean {
  return [
    'deposit',
    'demo_credit',
    'sale_income',
    'royalty_income',
    'transfer_in',
    'refund',
    'credit',
    'royalty',
    'add_funds',
  ].includes(type);
}

function isEarningType(type: string): boolean {
  return type === 'sale_income' || type === 'royalty_income' || type === 'credit' || type === 'royalty';
}

export function sumWalletEarnings(history: WalletHistoryEntry[]): number {
  return history.reduce((sum, txn) => {
    if (isEarningType(txn.type)) {
      return sum + parseFloat(String(txn.amount));
    }
    return sum;
  }, 0);
}

export function groupEarningsByMonth(history: WalletHistoryEntry[]): Record<string, number> {
  const monthly: Record<string, number> = {};
  for (const txn of history) {
    if (isEarningType(txn.type) && txn.created_at) {
      const monthKey = txn.created_at.substring(0, 7);
      monthly[monthKey] = (monthly[monthKey] || 0) + parseFloat(String(txn.amount));
    }
  }
  return monthly;
}
