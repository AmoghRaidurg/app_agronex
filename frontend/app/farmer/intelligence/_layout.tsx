import { Stack } from 'expo-router';

export default function IntelligenceLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="live-prices" />
      <Stack.Screen name="nearby-markets" />
      <Stack.Screen name="price-comparison" />
      <Stack.Screen name="forecast" />
      <Stack.Screen name="msp" />
      <Stack.Screen name="recommendations" />
      <Stack.Screen name="benchmark" />
      <Stack.Screen name="benchmark-comparison" />
      <Stack.Screen name="map" />
    </Stack>
  );
}
