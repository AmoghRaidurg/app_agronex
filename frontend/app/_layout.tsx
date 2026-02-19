import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth" />
        <Stack.Screen name="farmer" />
        <Stack.Screen name="trader" />
        <Stack.Screen name="customer" />
        <Stack.Screen name="industrialist" />
        <Stack.Screen name="admin" />
      </Stack>
    </AuthProvider>
  );
}