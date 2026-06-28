import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Share,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchLiveMarketPrices, type LiveMarketPrice } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner, EmptyState } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

type SortKey = 'crop' | 'price' | 'date';

export default function LivePricesScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [rows, setRows] = useState<LiveMarketPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('crop');
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const data = await fetchLiveMarketPrices(userData.uid, userData.address);
      setRows(data);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('live-prices', data);
    } catch (e) {
      const c = await readIntelligenceCache<LiveMarketPrice[]>('live-prices');
      if (c) {
        setRows(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load prices'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const filtered = rows
    .filter((r) =>
      `${r.crop} ${r.market} ${r.district} ${r.state}`.toLowerCase().includes(search.toLowerCase()),
    )
    .sort((a, b) => {
      if (sort === 'price') return b.modal_price - a.modal_price;
      if (sort === 'date') return b.date.localeCompare(a.date);
      return a.crop.localeCompare(b.crop);
    });

  const exportCsv = async () => {
    const header = 'Crop,Market,District,State,Modal,Min,Max,Arrival,Date,Updated';
    const body = filtered
      .map((r) =>
        [r.crop, r.market, r.district, r.state, r.modal_price, r.min_price, r.max_price, r.arrival_quantity, r.date, r.last_updated].join(','),
      )
      .join('\n');
    await Share.share({ message: `${header}\n${body}`, title: 'Live Market Prices' });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="Live Market Prices" subtitle="Government mandi data" />

      <View style={styles.toolbar}>
        <TextInput
          style={[styles.search, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          placeholder="Search crop, market, district..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.sortRow}>
          {(['crop', 'price', 'date'] as SortKey[]).map((k) => (
            <TouchableOpacity
              key={k}
              style={[styles.sortBtn, sort === k && { backgroundColor: colors.primary }]}
              onPress={() => setSort(k)}
            >
              <Text style={{ color: sort === k ? '#fff' : colors.textMuted, fontSize: 12 }}>{k}</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={[styles.exportBtn, { borderColor: colors.primary }]} onPress={exportCsv}>
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Export</Text>
          </TouchableOpacity>
        </View>
        {cachedAt ? <Text style={{ color: colors.textMuted, fontSize: 11 }}>Updated {formatCacheAge(cachedAt)}</Text> : null}
      </View>

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}

      {loading && rows.length === 0 ? (
        <ShimmerGrid count={4} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item, i) => `${item.crop}-${item.market}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_LIST_PADDING }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState title="No prices found" subtitle="Try adjusting search or pull to refresh" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.crop, { color: colors.text }]}>{item.crop}</Text>
              <Text style={{ color: colors.textMuted }}>{item.market} · {item.district}, {item.state}</Text>
              <View style={styles.priceRow}>
                <Text style={[styles.modal, { color: colors.primary }]}>Modal {formatInr(item.modal_price)}</Text>
                <Text style={{ color: colors.textMuted }}>Min {formatInr(item.min_price)} · Max {formatInr(item.max_price)}</Text>
              </View>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 6 }}>
                Arrival: {item.arrival_quantity} · {item.date}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 11 }}>Updated {formatCacheAge(item.last_updated)}</Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  toolbar: { paddingHorizontal: 16, paddingBottom: 8 },
  search: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  sortRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 4 },
  sortBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: '#e5e7eb' },
  exportBtn: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  crop: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  modal: { fontSize: 16, fontWeight: '700' },
});
