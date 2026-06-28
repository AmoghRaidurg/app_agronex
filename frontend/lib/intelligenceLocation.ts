import * as Location from 'expo-location';
import { Alert, Linking } from 'react-native';

export interface GeoCoords {
  latitude: number;
  longitude: number;
}

export interface ResolvedLocation extends GeoCoords {
  district: string | null;
  state: string | null;
  label: string;
}

export async function requestLocationPermission(): Promise<boolean> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status === 'granted') return true;

  Alert.alert(
    'Location permission',
    'Allow location access to find nearby mandis and regional market prices.',
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Open Settings', onPress: () => Linking.openSettings() },
    ],
  );
  return false;
}

export async function getCurrentCoords(): Promise<GeoCoords | null> {
  if (!(await requestLocationPermission())) return null;
  const pos = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });
  return {
    latitude: pos.coords.latitude,
    longitude: pos.coords.longitude,
  };
}

export async function reverseGeocode(coords: GeoCoords): Promise<ResolvedLocation> {
  try {
    const results = await Location.reverseGeocodeAsync(coords);
    const place = results[0];
    const district =
      place?.district ?? place?.subregion ?? place?.city ?? null;
    const state = place?.region ?? null;
    const label = [district, state].filter(Boolean).join(', ') || 'Current location';
    return { ...coords, district, state, label };
  } catch {
    return {
      ...coords,
      district: null,
      state: null,
      label: `${coords.latitude.toFixed(4)}, ${coords.longitude.toFixed(4)}`,
    };
  }
}

export function locationQueryString(resolved: ResolvedLocation): string {
  if (resolved.district && resolved.state) {
    return `${resolved.district}, ${resolved.state}`;
  }
  return `${resolved.latitude},${resolved.longitude}`;
}
