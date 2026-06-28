import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchMarketForecasts, type ForecastEntry } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner, EmptyState } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function ForecastScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [rows, setRows] = useState<ForecastEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const data = await fetchMarketForecasts(userData.uid, userData.address);
      setRows(data);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('forecast', data);
    } catch (e) {
      const c = await readIntelligenceCache<ForecastEntry[]>('forecast');
      if (c) {
        setRows(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load forecasts'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="Price Forecast" subtitle="Weekly, monthly & yearly projections" />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

      {loading && rows.length === 0 ? (
        <ShimmerGrid count={4} />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item, i) => `${item.crop_name}-${item.horizon}-${i}`}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_LIST_PADDING }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState title="No forecasts" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.crop, { color: colors.text }]}>{item.crop_name}</Text>
              <Text style={{ color: colors.textMuted }}>{item.horizon} · {item.period_label}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>
                Predicted: {formatInr(item.predicted_price)}
              </Text>
              <Text style={{ color: colors.textMuted }}>
                Trend: {item.trend} · Confidence {item.confidence}%
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
  price: { fontSize: 16, fontWeight: '700', marginVertical: 6 },
});
