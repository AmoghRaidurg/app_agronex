import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '../contexts/AuthContext';
import { ErrorBoundary } from '../components/ErrorBoundary';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="auth" />
            <Stack.Screen name="farmer" />
            <Stack.Screen name="trader" />
            <Stack.Screen name="customer" />
            <Stack.Screen name="industrialist" />
            <Stack.Screen name="admin" />
            <Stack.Screen name="crop-details" />
          </Stack>
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}
