import React, { useCallback, useState } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchIntelligenceDashboard, type FarmerDashboard } from '../../../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner, EmptyState } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function RecommendationsScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [dash, setDash] = useState<FarmerDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const data = await fetchIntelligenceDashboard(userData.uid, userData.role, userData.address);
      setDash(data as FarmerDashboard);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('recommendations', data);
    } catch (e) {
      const c = await readIntelligenceCache<FarmerDashboard>('recommendations');
      if (c) {
        setDash(c.data);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load recommendations'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const items = [
    ...(dash?.recommendations?.map((r) => ({
      id: `rec-${r.crop_name}`,
      title: r.crop_name,
      body: r.explanation ?? `Suitability ${r.suitability_score ?? '—'} · Profitability ${r.expected_profitability}`,
      confidence: r.confidence_score,
      type: 'Crop Recommendation',
    })) ?? []),
    ...(dash?.insights?.map((i, idx) => ({
      id: `ins-${idx}`,
      title: i.title,
      body: i.message,
      confidence: i.confidence_score ?? 80,
      type: i.insight_type,
    })) ?? []),
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader title="AI Recommendations" subtitle="Personalized market guidance" />
      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {cachedAt ? <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text> : null}

      {loading && !dash ? (
        <ShimmerGrid count={4} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: TAB_LIST_PADDING }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListEmptyComponent={<EmptyState title="No recommendations yet" subtitle="Complete more marketplace activity for personalized insights" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.type, { color: colors.primary }]}>{item.type}</Text>
              <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>
              <Text style={[styles.body, { color: colors.textMuted }]}>{item.body}</Text>
              <Text style={{ color: colors.primary, fontWeight: '600', marginTop: 8 }}>
                Confidence {item.confidence}%
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
  type: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  title: { fontSize: 17, fontWeight: '700', marginTop: 4 },
  body: { fontSize: 14, lineHeight: 20, marginTop: 6 },
});
