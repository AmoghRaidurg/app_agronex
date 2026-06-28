import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchMspData, type MspEntry } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner, EmptyState } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function MspScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [rows, setRows] = useState<MspEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const data = await fetchMspData(userData.uid, userData.address);
      setRows(data);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('msp', data);
    } catch (e) {
      const c = await readIntelligenceCache<MspEntry[]>('msp');
      if (c) {
        setRows(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load MSP'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="MSP" subtitle="Minimum Support Prices" />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

      {loading && rows.length === 0 ? (
        <ShimmerGrid count={4} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => `${item.crop}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_LIST_PADDING }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState title="No MSP data" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.crop, { color: colors.text }]}>{item.crop}</Text>
              <Text style={[styles.msp, { color: colors.primary }]}>
                {formatInr(item.msp_per_quintal)} / quintal
              </Text>
              <Text style={{ color: colors.textMuted }}>
                {item.season} · {item.state}
              </Text>
              <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                Effective {item.effective_from} · Updated {formatCacheAge(item.last_updated)}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cache: { fontSize: 11, paddingHorizontal: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  crop: { fontSize: 17, fontWeight: '700' },
  msp: { fontSize: 18, fontWeight: '700', marginVertical: 6 },
});
