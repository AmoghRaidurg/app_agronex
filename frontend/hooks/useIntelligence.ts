import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import {
  fetchIntelligenceDashboard,
  fetchIntelligenceOverview,
  type FarmerDashboard,
  type TraderDashboard,
  type IndustrialistDashboard,
  type IntelligenceOverview,
} from '../lib/aiApi';
import { cacheIntelligence, readIntelligenceCache } from '../lib/intelligenceCache';
import { friendlyError } from '../lib/asyncUtils';

export function useIntelligence(
  userId: string | undefined,
  role: string | undefined,
  location?: string,
) {
  const [dashboard, setDashboard] = useState<
    FarmerDashboard | TraderDashboard | IndustrialistDashboard | null
  >(null);
  const [overview, setOverview] = useState<IntelligenceOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cachedAt, setCachedAt] = useState<string | null>(null);
  const [offline, setOffline] = useState(false);

  const cacheKey = `dash:${userId}:${role}:${location ?? ''}`;

  const load = useCallback(async () => {
    if (!userId || !role) return;
    try {
      setError(null);
      const [dash, ov] = await Promise.all([
        fetchIntelligenceDashboard(userId, role, location),
        fetchIntelligenceOverview(userId, location),
      ]);
      setDashboard(dash);
      setOverview(ov);
      setOffline(!!dash._fallback);
      const now = new Date().toISOString();
      setCachedAt(now);
      await cacheIntelligence(cacheKey, { dashboard: dash, overview: ov });
    } catch (e) {
      const cached = await readIntelligenceCache<{
        dashboard: FarmerDashboard;
        overview: IntelligenceOverview;
      }>(cacheKey);
      if (cached) {
        setDashboard(cached.data.dashboard);
        setOverview(cached.data.overview);
        setCachedAt(cached.cachedAt);
        setOffline(true);
        setError('Showing cached data — ' + friendlyError(e, 'service unavailable'));
      } else {
        setError(friendlyError(e, 'Failed to load market intelligence'));
      }
    } finally {
      setLoading(false);
    }
  }, [userId, role, location, cacheKey]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load]),
  );

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  return { dashboard, overview, loading, refreshing, error, cachedAt, offline, refresh, load };
}
