import React, { useEffect } from 'react';
import {
  View,
  Text,
  ActivityIndicator,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, userData, loading, provisioningFailed, retryProvisioning, signOut } =
    useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (!loading && user && userData) {
      switch (userData.role) {
        case 'farmer':
          router.replace('/farmer/dashboard');
          break;
        case 'trader':
          router.replace('/trader/dashboard');
          break;
        case 'customer':
          router.replace('/customer/dashboard');
          break;
        case 'industrialist':
          router.replace('/industrialist/dashboard');
          break;
        case 'admin':
          router.replace('/admin/dashboard');
          break;
        default:
          router.replace('/auth/login');
      }
    }
  }, [user, userData, loading, router]);

  if (loading || (user && !userData && !provisioningFailed)) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>AgroElevate</Text>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.tagline}>Connecting Farmers to Markets</Text>
      </View>
    );
  }

  if (user && !userData && provisioningFailed) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>AgroElevate</Text>
        <Text style={styles.errorTitle}>Could not load your profile</Text>
        <Text style={styles.errorMessage}>
          Check your internet connection and try again.
        </Text>
        <TouchableOpacity style={styles.primaryBtn} onPress={retryProvisioning}>
          <Text style={styles.primaryBtnText}>Retry</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => signOut().then(() => router.replace('/auth/login'))}
        >
          <Text style={styles.secondaryBtnText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return null;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 24,
  },
  logo: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#16a34a',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  primaryBtn: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryBtn: { paddingVertical: 12 },
  secondaryBtnText: { color: '#6b7280', fontSize: 15, fontWeight: '600' },
});
