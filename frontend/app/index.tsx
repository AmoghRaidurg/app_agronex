import React, { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function AppContent() {
  const { user, userData, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace('/auth/phone');
      } else if (!userData) {
        router.replace('/auth/complete-profile');
      } else {
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
            router.replace('/auth/phone');
        }
      }
    }
  }, [user, userData, loading]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.logo}>AGRONEX</Text>
        <ActivityIndicator size="large" color="#10b981" />
        <Text style={styles.tagline}>Connecting Farmers to Markets</Text>
      </View>
    );
  }

  return null;
}

export default function Index() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
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
    color: '#10b981',
    marginBottom: 24,
  },
  tagline: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 16,
  },
});