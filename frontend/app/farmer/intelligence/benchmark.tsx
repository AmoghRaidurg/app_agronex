import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchReferenceBenchmark, type ReferenceBenchmark } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { MetricCard } from '../../../components/intelligence/MetricCard';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function BenchmarkScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [bench, setBench] = useState<ReferenceBenchmark | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const data = await fetchReferenceBenchmark(userData.uid);
      setBench(data);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('benchmark', data);
    } catch (e) {
      const c = await readIntelligenceCache<ReferenceBenchmark>('benchmark');
      if (c) {
        setBench(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load benchmark'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="Reference Benchmark" subtitle="Illustrative regional averages" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

        {bench ? (
          <View style={[styles.disclaimer, { backgroundColor: colors.amber + '22', borderColor: colors.amber }]}>
            <Text style={[styles.disclaimerTitle, { color: colors.amber }]}>{bench.label}</Text>
            <Text style={{ color: colors.text }}>{bench.disclaimer}</Text>
          </View>
        ) : null}

        {loading && !bench ? (
          <ShimmerGrid count={4} />
        ) : bench ? (
          <View style={styles.metrics}>
            <MetricCard label="Average Land Holding" value={`${bench.average_land_hectares} Ha`} icon="resize" delay={0} />
            <MetricCard label="Average Production" value={`${bench.average_production_kg_year.toLocaleString()} kg/yr`} icon="leaf" delay={100} />
            <MetricCard label="Average Annual Income" value={formatInr(bench.average_annual_income)} icon="cash" accent={colors.blue} delay={200} />
            <MetricCard label="Income per kg" value={formatInr(bench.income_per_kg)} icon="calculator" delay={300} />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cache: { fontSize: 11, paddingHorizontal: 16 },
  disclaimer: { margin: 16, padding: 14, borderRadius: 12, borderWidth: 1 },
  disclaimerTitle: { fontWeight: '700', fontSize: 15, marginBottom: 4 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
});
