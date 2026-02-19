import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function Wallet() {
  const { userData, refreshUserData } = useAuth();
  const [walletHistory, setWalletHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchWalletHistory = async () => {
    if (!userData) return;
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/wallet/history/${userData.uid}`);
      if (response.ok) {
        const data = await response.json();
        setWalletHistory(data);
      }
    } catch (error) {
      console.error('Error fetching wallet history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWalletHistory();
  }, [userData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await fetchWalletHistory();
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'credit':
      case 'sale':
        return { icon: 'arrow-down-circle', color: '#10b981' };
      case 'royalty':
        return { icon: 'trophy', color: '#f59e0b' };
      case 'withdrawal':
        return { icon: 'arrow-up-circle', color: '#ef4444' };
      default:
        return { icon: 'swap-horizontal', color: '#6b7280' };
    }
  };

  const renderTransaction = ({ item }: { item: any }) => {
    const { icon, color } = getIconAndColor(item.type);
    const isCredit = ['credit', 'sale', 'royalty'].includes(item.type);

    return (
      <View style={styles.transactionCard}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon as any} size={24} color={color} />
        </View>
        <View style={styles.transactionInfo}>
          <Text style={styles.transactionDesc}>{item.description}</Text>
          <Text style={styles.transactionDate}>{formatDate(item.createdAt)}</Text>
        </View>
        <Text style={[styles.transactionAmount, { color }]}>
          {isCredit ? '+' : '-'}₹{item.amount.toFixed(2)}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{userData?.walletBalance.toFixed(2)}</Text>
        <TouchableOpacity style={styles.withdrawButton}>
          <Ionicons name="download-outline" size={20} color="#fff" />
          <Text style={styles.withdrawButtonText}>Withdraw Funds</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historySection}>
        <Text style={styles.sectionTitle}>Transaction History</Text>
        <FlatList
          data={walletHistory}
          keyExtractor={(item) => item._id}
          renderItem={renderTransaction}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="wallet-outline" size={64} color="#d1d5db" />
              <Text style={styles.emptyText}>No transactions yet</Text>
            </View>
          }
        />
      </View>
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
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  balanceCard: {
    backgroundColor: '#10b981',
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 14,
    color: '#fff',
    opacity: 0.9,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 24,
  },
  withdrawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  withdrawButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  historySection: {
    flex: 1,
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  transactionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  transactionAmount: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
  },
});