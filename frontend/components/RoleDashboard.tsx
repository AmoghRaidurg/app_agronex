import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { fetchWalletBalance } from '../lib/walletApi';
import { friendlyError } from '../lib/asyncUtils';
import { ErrorBanner } from './ScreenPrimitives';
import { TAB_LIST_PADDING } from '../lib/listConfig';

type QuickAction = {
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  route: string;
};

interface RoleDashboardProps {
  emoji: string;
  roleLabel: string;
  subtitle: string;
  actions: QuickAction[];
  showWallet?: boolean;
}

export default function RoleDashboard({
  emoji,
  roleLabel,
  subtitle,
  actions,
  showWallet = true,
}: RoleDashboardProps) {
  const { userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const loadBalance = useCallback(async () => {
    if (!userData || !showWallet) return;
    try {
      setBalanceError(null);
      setBalance(await fetchWalletBalance(userData.uid));
    } catch (error: unknown) {
      setBalance(null);
      setBalanceError(friendlyError(error, 'Could not load wallet balance'));
    }
  }, [userData, showWallet]);

  useFocusEffect(
    useCallback(() => {
      loadBalance();
    }, [loadBalance]),
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await loadBalance();
    setRefreshing(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Welcome, {userData?.name}! {emoji}
        </Text>
        <Text style={styles.role}>{roleLabel}</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {balanceError ? <ErrorBanner message={balanceError} onRetry={loadBalance} /> : null}
        {showWallet && balance !== null && (
          <View style={styles.balanceCard}>
            <Ionicons name="wallet" size={28} color="#fff" />
            <Text style={styles.balanceLabel}>Wallet Balance</Text>
            <Text style={styles.balanceValue}>₹{balance.toFixed(2)}</Text>
          </View>
        )}

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{subtitle}</Text>
          <View style={styles.actions}>
            {actions.map((action) => (
              <TouchableOpacity
                key={action.route}
                style={styles.actionButton}
                onPress={() => router.push(action.route as any)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color }]}>
                  <Ionicons name={action.icon} size={28} color="#fff" />
                </View>
                <Text style={styles.actionText}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  greeting: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  role: { fontSize: 14, color: '#6b7280', marginTop: 4 },
  content: { flex: 1, padding: 16 },
  balanceCard: {
    backgroundColor: '#16a34a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  balanceLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 14, marginTop: 8 },
  balanceValue: { color: '#fff', fontSize: 32, fontWeight: 'bold', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  cardTitle: { fontSize: 16, color: '#6b7280', marginBottom: 16, lineHeight: 22 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  actionButton: { width: '48%', alignItems: 'center', marginBottom: 16 },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: { fontSize: 14, fontWeight: '600', color: '#374151' },
});

export function RoleDashboardLoading() {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#16a34a" />
    </View>
  );
}
