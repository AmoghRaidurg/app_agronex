import React, { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { BarChart, LineChart } from 'react-native-gifted-charts';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchPriceComparison, type PriceComparisonData } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

type Period = 'weekly' | 'monthly' | 'yearly';

export default function PriceComparisonScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [data, setData] = useState<PriceComparisonData | null>(null);
  const [period, setPeriod] = useState<Period>('weekly');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const result = await fetchPriceComparison(userData.uid, undefined, userData.address);
      setData(result);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('price-comparison', result);
    } catch (e) {
      const c = await readIntelligenceCache<PriceComparisonData>('price-comparison');
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

  const points = data
    ? period === 'weekly'
      ? data.weekly
      : period === 'monthly'
        ? data.monthly
        : data.yearly
    : [];

  const barData = points.flatMap((p) => [
    { value: p.agroelevate_avg, label: p.period, frontColor: colors.primary },
    { value: p.government_avg, label: '', frontColor: colors.blue },
  ]);

  const lineAe = points.map((p) => ({ value: p.agroelevate_avg, label: p.period }));
  const lineGov = points.map((p) => ({ value: p.government_avg }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="Price Comparison" subtitle="AgroElevate vs Government Market" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
      >
        {error ? <ErrorBanner message={error} onRetry={load} /> : null}
        {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

        {loading && !data ? (
          <ShimmerGrid count={4} />
        ) : data ? (
          <>
            <View style={[styles.summary, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.crop, { color: colors.text }]}>{data.crop_name}</Text>
              <View style={styles.row}>
                <Stat label="AgroElevate" value={formatInr(data.agroelevate_avg)} color={colors.primary} />
                <Stat label="Government" value={formatInr(data.government_avg)} color={colors.blue} />
              </View>
              <View style={styles.row}>
                <Stat label="Profit Difference" value={formatInr(data.profit_difference)} color={colors.amber} />
                <Stat label="% Gain" value={`+${data.percentage_gain}%`} color={colors.primary} />
              </View>
              <Text style={[styles.earnings, { color: colors.text }]}>
                Expected Earnings: {formatInr(data.expected_earnings)}
              </Text>
            </View>

            <View style={styles.tabs}>
              {(['weekly', 'monthly', 'yearly'] as Period[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.tab, period === p && { backgroundColor: colors.primary }]}
                  onPress={() => setPeriod(p)}
                >
                  <Text style={{ color: period === p ? '#fff' : colors.textMuted, fontWeight: '600' }}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.chartTitle, { color: colors.text }]}>Grouped Bar Chart</Text>
            <BarChart data={barData} barWidth={22} spacing={14} width={320} height={180} yAxisTextStyle={{ color: colors.textMuted }} xAxisLabelTextStyle={{ color: colors.textMuted }} />

            <Text style={[styles.chartTitle, { color: colors.text }]}>Trend Line — AgroElevate</Text>
            <LineChart data={lineAe} color={colors.primary} thickness={3} dataPointsColor={colors.primary} height={160} width={320} />

            <Text style={[styles.chartTitle, { color: colors.text }]}>Trend Line — Government</Text>
            <LineChart data={lineGov} color={colors.blue} thickness={3} dataPointsColor={colors.blue} height={160} width={320} />
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <View style={styles.stat}>
      <Text style={{ color, fontSize: 18, fontWeight: '700' }}>{value}</Text>
      <Text style={{ color: '#6b7280', fontSize: 12 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cache: { fontSize: 11, paddingHorizontal: 16 },
  summary: { margin: 16, padding: 16, borderRadius: 16, borderWidth: 1 },
  crop: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  stat: { flex: 1 },
  earnings: { fontSize: 15, fontWeight: '600', marginTop: 8 },
  tabs: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#e5e7eb' },
  chartTitle: { fontSize: 15, fontWeight: '600', paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
});
