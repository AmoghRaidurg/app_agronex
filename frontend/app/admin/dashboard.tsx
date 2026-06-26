import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { ErrorBanner } from '../../components/ScreenPrimitives';
import { fetchPlatformStats, friendlyError, type PlatformStats } from '../../lib/adminApi';

type MenuItem = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: '/admin/manage-users' | '/admin/approve-farmers' | '/admin/transactions' | '/admin/platform-settings';
  badge?: number;
};

export default function AdminDashboard() {
  const { userData, signOut } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setFetchError(null);
      setStats(await fetchPlatformStats());
    } catch (error: unknown) {
      console.error('Error fetching stats:', error);
      setFetchError(friendlyError(error, 'Failed to load dashboard'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      if (userData?.role !== 'admin') {
        router.replace('/');
        return;
      }
      setLoading(true);
      fetchStats();
    }, [userData?.role, fetchStats, router]),
  );

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await signOut();
          router.replace('/auth/login');
        },
      },
    ]);
  };

  const menuItems: MenuItem[] = [
    {
      label: 'Manage Users',
      icon: 'people-outline',
      route: '/admin/manage-users',
    },
    {
      label: 'Approve Farmers',
      icon: 'checkmark-circle-outline',
      route: '/admin/approve-farmers',
      badge: stats?.pendingFarmers,
    },
    {
      label: 'All Transactions',
      icon: 'receipt-outline',
      route: '/admin/transactions',
    },
    {
      label: 'Platform Settings',
      icon: 'settings-outline',
      route: '/admin/platform-settings',
    },
  ];

  if (loading && !stats) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel 🛡️</Text>
          <Text style={styles.name}>{userData?.name ?? 'Administrator'}</Text>
        </View>
        <TouchableOpacity onPress={handleSignOut} accessibilityLabel="Sign out">
          <Ionicons name="log-out-outline" size={24} color="#ef4444" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              fetchStats();
            }}
          />
        }
      >
        {fetchError ? (
          <ErrorBanner message={fetchError} onRetry={fetchStats} />
        ) : null}

        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#16a34a' }]}>
            <Ionicons name="people" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats?.totalUsers ?? 0}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="leaf" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats?.totalFarmers ?? 0}</Text>
            <Text style={styles.statLabel}>Farmers</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#f59e0b' }]}>
            <Ionicons name="cart" size={32} color="#fff" />
            <Text style={styles.statValue}>{stats?.totalOrders ?? 0}</Text>
            <Text style={styles.statLabel}>Orders</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#8b5cf6' }]}>
            <Ionicons name="wallet" size={32} color="#fff" />
            <Text style={styles.statValue}>
              ₹{(stats?.totalVolume ?? 0).toFixed(0)}
            </Text>
            <Text style={styles.statLabel}>Total Volume</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Platform Management</Text>

          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={item.route}
              style={[
                styles.menuItem,
                index === menuItems.length - 1 && styles.menuItemLast,
              ]}
              onPress={() => router.push(item.route as any)}
              accessibilityRole="button"
              accessibilityLabel={item.label}
            >
              <Ionicons name={item.icon} size={24} color="#374151" />
              <Text style={styles.menuText}>{item.label}</Text>
              {item.badge != null && item.badge > 0 ? (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{item.badge}</Text>
                </View>
              ) : null}
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  name: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    width: '48%',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuText: {
    flex: 1,
    fontSize: 16,
    color: '#374151',
    marginLeft: 12,
  },
  badge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    marginRight: 8,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
});
