import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useAuth } from '../../../contexts/AuthContext';
import { fetchNearbyMarkets, type NearbyMarket } from '../../../lib/aiApi';
import {
  getCurrentCoords,
  reverseGeocode,
  locationQueryString,
  type ResolvedLocation,
} from '../../../lib/intelligenceLocation';
import { cacheIntelligence, readIntelligenceCache, formatCacheAge } from '../../../lib/intelligenceCache';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { MarketMap } from '../../../components/intelligence/MarketMap';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { ErrorBanner, EmptyState } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { formatInr } from '../../../lib/intelligenceUtils';
import { friendlyError } from '../../../lib/asyncUtils';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function NearbyMarketsScreen() {
  const { userData } = useAuth();
  const { colors } = useMiTheme();
  const [markets, setMarkets] = useState<NearbyMarket[]>([]);
  const [location, setLocation] = useState<ResolvedLocation | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userData?.uid) return;
    try {
      setError(null);
      const coords = await getCurrentCoords();
      let locLabel = userData.address;
      let lat = 20.5937;
      let lng = 78.9629;
      if (coords) {
        const resolved = await reverseGeocode(coords);
        setLocation(resolved);
        locLabel = locationQueryString(resolved);
        lat = resolved.latitude;
        lng = resolved.longitude;
      }
      const data = await fetchNearbyMarkets(userData.uid, locLabel, lat, lng);
      setMarkets(data);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence('nearby-markets', { markets: data, lat, lng });
    } catch (e) {
      const c = await readIntelligenceCache<{ markets: NearbyMarket[]; lat: number; lng: number }>('nearby-markets');
      if (c) {
        setMarkets(c.data.markets);
        setCachedAt(c.cachedAt);
        setError('Cached — ' + friendlyError(e, 'unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load nearby markets'));
      }
    } finally {
      setLoading(false);
    }
  }, [userData]);

  useFocusEffect(useCallback(() => { setLoading(true); load(); }, [load]));

  const lat = location?.latitude ?? 20.5937;
  const lng = location?.longitude ?? 78.9629;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader
        title="Nearby Markets"
        subtitle={location?.label ?? userData?.address ?? 'Enable location for best results'}
      />

      {error ? <ErrorBanner message={error} onRetry={load} /> : null}
      {cachedAt ? (
        <Text style={[styles.cache, { color: colors.textMuted }]}>Updated {formatCacheAge(cachedAt)}</Text>
      ) : null}

      {loading && markets.length === 0 ? (
        <ShimmerGrid count={3} />
      ) : (
        <FlatList
          data={markets}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}
          ListHeaderComponent={
            markets.length > 0 ? (
              <MarketMap markets={markets} userLat={lat} userLng={lng} />
            ) : null
          }
          ListEmptyComponent={<EmptyState title="No nearby markets" subtitle="Grant location permission and refresh" />}
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
              <Text style={{ color: colors.primary, fontWeight: '700', fontSize: 16 }}>
                {item.crop}: {formatInr(item.price)}/{item.unit}
              </Text>
              <Text style={{ color: colors.textMuted, marginTop: 4 }}>
                {item.distance_km} km · ~{item.travel_time_min} min · {item.district}, {item.state}
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
  card: { marginHorizontal: 16, marginBottom: 10, borderRadius: 14, borderWidth: 1, padding: 14 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
});
