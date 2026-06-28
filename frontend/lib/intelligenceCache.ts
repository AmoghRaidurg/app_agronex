import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_PREFIX = '@agroelevate_mi:';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export interface CachedPayload<T> {
  data: T;
  cachedAt: string;
  key: string;
}

export async function cacheIntelligence<T>(key: string, data: T): Promise<void> {
  const payload: CachedPayload<T> = {
    data,
    cachedAt: new Date().toISOString(),
    key,
  };
  await AsyncStorage.setItem(`${CACHE_PREFIX}${key}`, JSON.stringify(payload));
}

export async function readIntelligenceCache<T>(key: string): Promise<CachedPayload<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(`${CACHE_PREFIX}${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedPayload<T>;
    const age = Date.now() - new Date(parsed.cachedAt).getTime();
    if (age > CACHE_TTL_MS) return parsed;
    return parsed;
  } catch {
    return null;
  }
}

export function formatCacheAge(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
