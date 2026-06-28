import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchBenchmarkComparison, type BenchmarkComparison } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

type Tab = 'without' | 'with';

export default function BenchmarkComparisonScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [data, setData] = useState<BenchmarkComparison | null>(null);
  const [tab, setTab] = useState<Tab>('without');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const result = await fetchBenchmarkComparison(userData.uid, userData.address);
      setData(result);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('benchmark-comparison', result);
    } catch (e) {
      const c = await readIntelligenceCache<BenchmarkComparison>('benchmark-comparison');
      if (c) {
        setData(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load comparison'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const series = tab === 'without' ? data?.without_agroelevate : data?.with_agroelevate;
  const barIncome = series?.map((y) => ({ value: y.income, label: `Y${y.year}`, frontColor: colors.primary })) ?? [];
  const lineIncomeKg = series?.map((y) => ({ value: y.income_per_kg, label: `Y${y.year}` })) ?? [];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="Benchmark Comparison" subtitle="3-year illustrative projection" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {data ? (
          <View style={[styles.disclaimer, { backgroundColor: colors.blue + '15' }]}>
            <Text style={{ color: colors.text, fontWeight: '600' }}>{data.disclaimer}</Text>
          </View>
        ) : null}
        {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, tab === 'without' && { backgroundColor: colors.textMuted }]}
            onPress={() => setTab('without')}
          >
            <Text style={{ color: tab === 'without' ? '#fff' : colors.text }}>Without AgroElevate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, tab === 'with' && { backgroundColor: colors.primary }]}
            onPress={() => setTab('with')}
          >
            <Text style={{ color: tab === 'with' ? '#fff' : colors.text }}>With AgroElevate</Text>
          </TouchableOpacity>
        </View>

        {loading && !data ? (
          <ShimmerGrid count={4} />
        ) : series ? (
          <>
            {series.map((y) => (
              <View key={y.year} style={[styles.yearCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.yearTitle, { color: colors.text }]}>Year {y.year}</Text>
                <Text style={{ color: colors.textMuted }}>Income: {formatInr(y.income)} · Income/kg: {formatInr(y.income_per_kg)}</Text>
                <Text style={{ color: colors.textMuted, fontSize: 12, marginTop: 4 }}>
                  Royalty {formatInr(y.royalty)} · Direct gain {formatInr(y.direct_selling_gain)} · Waste ↓ {formatInr(y.waste_reduction)} · Linkage {formatInr(y.market_linkage)}
                </Text>
              </View>
            ))}

            <Text style={[styles.chartTitle, { color: colors.text }]}>Income Bar Chart</Text>
            <BarChart data={barIncome} barWidth={40} spacing={24} height={180} width={300} yAxisTextStyle={{ color: colors.textMuted }} />

            <Text style={[styles.chartTitle, { color: colors.text }]}>Income/kg Line Chart</Text>
            <LineChart data={lineIncomeKg} color={colors.blue} thickness={3} height={160} width={300} />

            <Text style={[styles.chartTitle, { color: colors.text }]}>Revenue Components (Area)</Text>
            <BarChart
              data={series.map((y) => ({
                value: y.income,
                label: `Y${y.year}`,
                frontColor: colors.primary,
              }))}
              height={180}
              width={300}
            />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cache: { fontSize: 11, paddingHorizontal: 16 },
  disclaimer: { margin: 16, padding: 12, borderRadius: 10 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: '#e5e7eb', alignItems: 'center' },
  yearCard: { marginHorizontal: 16, marginBottom: 8, padding: 14, borderRadius: 12, borderWidth: 1 },
  yearTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  chartTitle: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
});
