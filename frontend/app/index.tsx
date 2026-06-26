import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';

export default function Index() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/auth/login');
      return;
    }
    if (!loading && user && userData) {
        // Route to role-specific dashboard
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
  }, [user, userData, loading]);

  if (loading || (user && !userData)) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>AgroElevate</Text>
        <ActivityIndicator size="large" color="#16a34a" />
        <Text style={styles.tagline}>Connecting Farmers to Markets</Text>
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
});
