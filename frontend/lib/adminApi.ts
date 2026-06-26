import { supabase } from './supabase';
import { withRetry, friendlyError } from './asyncUtils';
import { orderCreatedAt, orderBuyerId, orderTotal } from './orderUtils';

export interface AdminProfile {
  id: string;
  email: string | null;
  name: string;
  role: string;
  approved: boolean;
  suspended: boolean;
  phone?: string | null;
  address?: string | null;
  created_at?: string | null;
}

export interface PlatformOrder {
  id: string;
  buyerId: string;
  buyerName?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
}

export interface PlatformStats {
  totalUsers: number;
  totalFarmers: number;
  pendingFarmers: number;
  totalOrders: number;
  totalVolume: number;
}

const PROFILE_COLUMNS =
  'id, email, name, role, approved, suspended, phone, address, created_at';

export async function fetchPlatformStats(): Promise<PlatformStats> {
  return withRetry(async () => {
    const [profilesRes, ordersRes, pendingRes] = await Promise.all([
      supabase.from('profiles').select('id, role'),
      supabase.from('orders').select('totalAmount'),
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'farmer')
        .eq('approved', false),
    ]);

    if (profilesRes.error) throw profilesRes.error;
    if (ordersRes.error) throw ordersRes.error;
    if (pendingRes.error) throw pendingRes.error;

    const profiles = profilesRes.data ?? [];
    const orders = ordersRes.data ?? [];

    return {
      totalUsers: profiles.length,
      totalFarmers: profiles.filter((p) => p.role === 'farmer').length,
      pendingFarmers: pendingRes.count ?? 0,
      totalOrders: orders.length,
      totalVolume: orders.reduce(
        (sum, o) => sum + (parseFloat(String(o.totalAmount)) || 0),
        0,
      ),
    };
  });
}

export async function fetchAllProfiles(): Promise<AdminProfile[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as AdminProfile[];
  });
}

export async function fetchPendingFarmers(): Promise<AdminProfile[]> {
  return withRetry(async () => {
    const { data, error } = await supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('role', 'farmer')
      .eq('approved', false)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data ?? []) as AdminProfile[];
  });
}

export async function setProfileApproved(
  profileId: string,
  approved: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ approved })
    .eq('id', profileId);
  if (error) throw error;
}

export async function setProfileSuspended(
  profileId: string,
  suspended: boolean,
): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ suspended })
    .eq('id', profileId);
  if (error) throw error;
}

export async function rejectFarmer(profileId: string): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ approved: false, suspended: true })
    .eq('id', profileId);
  if (error) throw error;
}

export async function fetchPlatformOrders(options?: {
  page?: number;
  pageSize?: number;
}): Promise<{ orders: PlatformOrder[]; hasMore: boolean }> {
  const page = options?.page ?? 0;
  const pageSize = options?.pageSize ?? 20;
  const from = page * pageSize;
  const to = from + pageSize - 1;

  return withRetry(async () => {
    const { data, error } = await supabase
      .from('orders')
      .select('id, buyerId, buyerName, totalAmount, status, createdAt')
      .order('createdAt', { ascending: false })
      .range(from, to + 1);

    if (error) throw error;

    const rows = data ?? [];
    const hasMore = rows.length > pageSize;
    const slice = hasMore ? rows.slice(0, pageSize) : rows;

    return {
      orders: slice.map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        buyerId: orderBuyerId(row as { buyerId?: string; buyer_id?: string }) ?? '',
        buyerName: (row.buyerName as string) ?? undefined,
        totalAmount: orderTotal(row as { totalAmount?: number; total_amount?: number }),
        status: String(row.status ?? 'pending'),
        createdAt: orderCreatedAt(row as { createdAt?: string; created_at?: string }),
      })),
      hasMore,
    };
  });
}

export { friendlyError };
