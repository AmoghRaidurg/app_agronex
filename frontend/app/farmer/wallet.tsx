import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  createWalletTopUpOrder,
  openRazorpayCheckout,
  pollWalletAfterPayment,
} from '../../lib/razorpayWallet';
import { fetchWalletBalance, fetchWalletHistory, isWalletCredit } from '../../lib/walletApi';
import { WALLET_TYPE_LABELS, type WalletHistoryType } from '../../lib/commerceMeta';

export default function Wallet() {
  const { userData, user, refreshUserData } = useAuth();
  const [balance, setBalance] = useState(0);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Payment modal
  const [showPayment, setShowPayment] = useState(false);
  const [amount, setAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const [pollingStatus, setPollingStatus] = useState('');

  const fetchWallet = async () => {
    if (!userData) return;
    try {
      setFetchError(null);
      const [bal, hist] = await Promise.all([
        fetchWalletBalance(userData.uid),
        fetchWalletHistory(userData.uid),
      ]);
      setBalance(bal);
      setHistory(hist);
    } catch (error: any) {
      console.error('Error fetching wallet:', error);
      setFetchError(error.message || 'Failed to load wallet');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchWallet();
    }, [userData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchWallet();
  };

  const handleAddFunds = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }
    if (amt > 100000) {
      Alert.alert('Error', 'Maximum ₹1,00,000 per transaction');
      return;
    }

    setProcessing(true);
    setPollingStatus('Initializing secure gateway...');
    try {
      // 1. Edge Function creates Razorpay Order & payment_intent
      const order = await createWalletTopUpOrder(amt);
      
      setPollingStatus('Awaiting payment...');
      
      // 2. Open Native SDK
      await openRazorpayCheckout(
        order,
        user?.email,
        userData?.name,
        userData?.phoneNumber,
      );

      // 3. Poll backend for verification success
      setPollingStatus('Verifying payment with bank...');
      const success = await pollWalletAfterPayment(userData!.uid, order.intent_id);

      if (success) {
        Alert.alert('Success! 🎉', `₹${amt.toFixed(2)} has been added to your wallet.`);
        setShowPayment(false);
        setAmount('');
        await fetchWallet();
        await refreshUserData();
      } else {
        Alert.alert('Verification Pending', 'We are still waiting for bank confirmation. Your wallet will be credited shortly if successful.');
        setShowPayment(false);
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      Alert.alert('Payment Cancelled', error.message || 'Payment flow was interrupted.');
    } finally {
      setProcessing(false);
      setPollingStatus('');
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'deposit': return { icon: 'add-circle', color: '#16a34a' };
      case 'sale_income': 
      case 'transfer_in': return { icon: 'arrow-down-circle', color: '#16a34a' };
      case 'purchase':
      case 'withdrawal':
      case 'debit':
      case 'transfer_out': return { icon: 'arrow-up-circle', color: '#ef4444' };
      case 'royalty_income':
      case 'royalty':
      case 'credit': return { icon: 'star', color: '#f59e0b' };
      default: return { icon: 'swap-horizontal', color: '#6b7280' };
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const historyLabel = (item: { type: string; description?: string | null }) => {
    if (item.description?.trim()) return item.description;
    const label = WALLET_TYPE_LABELS[item.type as WalletHistoryType];
    return label ?? item.type.replace(/_/g, ' ');
  };

  const renderHistoryItem = ({ item }: { item: any }) => {
    const typeInfo = getTypeIcon(item.type);
    const isCredit = isWalletCredit(item.type);
    const amount = parseFloat(String(item.amount));
    const displayAmount = Number.isNaN(amount) ? '0.00' : amount.toFixed(2);
    return (
      <View style={styles.historyItem}>
        <Ionicons name={typeInfo.icon as any} size={28} color={typeInfo.color} />
        <View style={styles.historyInfo}>
          <Text style={styles.historyDesc} numberOfLines={1}>{historyLabel(item)}</Text>
          <Text style={styles.historyDate}>{formatDate(item.created_at)}</Text>
        </View>
        <Text style={[styles.historyAmount, { color: isCredit ? '#16a34a' : '#ef4444' }]}>
          {isCredit ? '+' : '-'}₹{displayAmount}
        </Text>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Wallet</Text>
      </View>

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      {/* Balance Card */}
      <View style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>Available Balance</Text>
        <Text style={styles.balanceAmount}>₹{balance.toFixed(2)}</Text>
        <TouchableOpacity style={styles.addFundsBtn} onPress={() => setShowPayment(true)}>
          <Ionicons name="add-circle" size={20} color="#fff" />
          <Text style={styles.addFundsBtnText}>Add Funds</Text>
        </TouchableOpacity>
      </View>

      {/* History */}
      <Text style={styles.sectionTitle}>Transaction History</Text>
      <FlatList
        data={history}
        keyExtractor={(item: any) => item.id}
        renderItem={renderHistoryItem}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="wallet-outline" size={48} color="#d1d5db" />
            <Text style={styles.emptyText}>No transactions yet</Text>
          </View>
        }
      />

      {/* Payment Modal */}
      <Modal visible={showPayment} transparent animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Funds</Text>
              <TouchableOpacity onPress={() => setShowPayment(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
            />

            <View style={styles.mockBanner}>
              <Ionicons name="shield-checkmark" size={16} color="#16a34a" />
              <Text style={styles.mockBannerText}>You will be redirected to the secure Razorpay gateway to complete your transaction.</Text>
            </View>

            {pollingStatus ? (
              <View style={styles.pollingContainer}>
                <ActivityIndicator color="#16a34a" />
                <Text style={styles.pollingText}>{pollingStatus}</Text>
              </View>
            ) : null}

            <TouchableOpacity
              style={[styles.payBtn, processing && styles.payBtnDisabled]}
              onPress={handleAddFunds}
              disabled={processing}
            >
              {processing ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.payBtnText}>Proceed to Pay ₹{amount || '0'}</Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { backgroundColor: '#fff', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14 },

  // Balance Card
  balanceCard: { backgroundColor: '#16a34a', margin: 16, borderRadius: 20, padding: 24, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, elevation: 5 },
  balanceLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 4 },
  balanceAmount: { color: '#fff', fontSize: 40, fontWeight: 'bold', marginBottom: 16 },
  addFundsBtn: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  addFundsBtnText: { color: '#fff', fontSize: 16, fontWeight: '600', marginLeft: 8 },

  sectionTitle: { fontSize: 18, fontWeight: '600', color: '#374151', paddingHorizontal: 16, marginBottom: 8 },
  listContent: { paddingHorizontal: 16, paddingBottom: 16 },

  // History Item
  historyItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', padding: 16, borderRadius: 12, marginBottom: 8, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  historyInfo: { flex: 1, marginLeft: 12 },
  historyDesc: { fontSize: 14, fontWeight: '500', color: '#374151' },
  historyDate: { fontSize: 12, color: '#9ca3af', marginTop: 2 },
  historyAmount: { fontSize: 16, fontWeight: 'bold' },

  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: 14, color: '#9ca3af', marginTop: 12 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 12 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 16 },
  mockBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#ecfdf5', padding: 12, borderRadius: 12, marginTop: 16, gap: 8 },
  mockBannerText: { fontSize: 12, color: '#047857', flex: 1 },
  pollingContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, gap: 8 },
  pollingText: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  payBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 16 },
  payBtnDisabled: { opacity: 0.6 },
  payBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
