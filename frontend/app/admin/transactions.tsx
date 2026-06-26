import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AdminScreenHeader from '../../components/AdminScreenHeader';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps } from '../../lib/listConfig';
import {
  fetchPlatformOrders,
  friendlyError,
  type PlatformOrder,
} from '../../lib/adminApi';

const STATUS_FILTERS = ['All', 'pending', 'accepted', 'shipped', 'delivered'] as const;
const PAGE_SIZE = 20;

function statusColor(status: string) {
  switch (status) {
    case 'pending':
      return '#f59e0b';
    case 'accepted':
      return '#3b82f6';
    case 'shipped':
      return '#8b5cf6';
    case 'delivered':
      return '#16a34a';
    default:
      return '#6b7280';
  }
}

function formatDate(dateString: string) {
  if (!dateString) return '—';
  const d = new Date(dateString);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminTransactions() {
  const { userData } = useAuth();
  const router = useRouter();
  const [orders, setOrders] = useState<PlatformOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('All');
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const loadPage = useCallback(async (pageNum: number, replace: boolean) => {
    try {
      setFetchError(null);
      const { orders: rows, hasMore: more } = await fetchPlatformOrders({
        page: pageNum,
        pageSize: PAGE_SIZE,
      });
      setOrders((prev) => (replace ? rows : [...prev, ...rows]));
      setHasMore(more);
      setPage(pageNum);
    } catch (error: unknown) {
      setFetchError(friendlyError(error, 'Failed to load transactions'));
    }
  }, []);

  const initialLoad = useCallback(async () => {
    setLoading(true);
    await loadPage(0, true);
    setLoading(false);
    setRefreshing(false);
  }, [loadPage]);

  useFocusEffect(
    useCallback(() => {
      if (userData?.role !== 'admin') {
        router.replace('/');
        return;
      }
      initialLoad();
    }, [userData?.role, initialLoad, router]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orders.filter((o) => {
      if (statusFilter !== 'All' && o.status !== statusFilter) return false;
      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.buyerId.toLowerCase().includes(q) ||
        (o.buyerName ?? '').toLowerCase().includes(q)
      );
    });
  }, [orders, search, statusFilter]);

  const totalVolume = useMemo(
    () => filtered.reduce((sum, o) => sum + o.totalAmount, 0),
    [filtered],
  );

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    await loadPage(page + 1, false);
    setLoadingMore(false);
  };

  const renderOrder = ({ item }: { item: PlatformOrder }) => (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.orderId}>#{item.id.substring(0, 8)}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
        </View>
      </View>
      <Text style={styles.buyer}>
        {item.buyerName || 'Buyer'} · {item.buyerId.substring(0, 8)}…
      </Text>
      <View style={styles.row}>
        <Text style={styles.date}>{formatDate(item.createdAt)}</Text>
        <Text style={styles.amount}>₹{item.totalAmount.toFixed(2)}</Text>
      </View>
    </View>
  );

  if (loading && orders.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminScreenHeader title="All Transactions" />
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Filtered volume</Text>
        <Text style={styles.summaryValue}>₹{totalVolume.toFixed(2)}</Text>
        <Text style={styles.summaryHint}>Platform orders (newest first)</Text>
      </View>
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search order ID or buyer"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.chips}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.chip, statusFilter === status && styles.chipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.chipText,
                statusFilter === status && styles.chipTextActive,
              ]}
            >
              {status === 'All' ? 'All' : status}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {fetchError ? (
        <ErrorBanner message={fetchError} onRetry={initialLoad} />
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              initialLoad();
            }}
          />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.3}
        {...flatListPerfProps}
        ListEmptyComponent={
          <EmptyState
            icon="receipt-outline"
            title="No orders found"
            subtitle="Platform order history will appear here"
          />
        }
        ListFooterComponent={
          loadingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color="#16a34a" />
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  summary: {
    backgroundColor: '#16a34a',
    margin: 16,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13 },
  summaryValue: { color: '#fff', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  summaryHint: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 6 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1f2937' },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  chipActive: { backgroundColor: '#16a34a' },
  chipText: { fontSize: 12, color: '#6b7280', fontWeight: '500', textTransform: 'capitalize' },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderId: { fontSize: 15, fontWeight: '700', color: '#1f2937' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { color: '#fff', fontSize: 10, fontWeight: 'bold' },
  buyer: { fontSize: 13, color: '#6b7280', marginVertical: 8 },
  date: { fontSize: 12, color: '#9ca3af' },
  amount: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
});
