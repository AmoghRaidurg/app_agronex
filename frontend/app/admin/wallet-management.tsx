import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AdminScreenHeader from '../../components/AdminScreenHeader';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps } from '../../lib/listConfig';
import {
  fetchAdminWalletUsers,
  adminCreditWallet,
  friendlyError,
  type AdminWalletUser,
} from '../../lib/adminApi';

export default function WalletManagement() {
  const { userData } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<AdminWalletUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminWalletUser | null>(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = useCallback(async () => {
    try {
      setFetchError(null);
      setUsers(await fetchAdminWalletUsers());
    } catch (error: unknown) {
      setFetchError(friendlyError(error, 'Failed to load wallets'));
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
      load();
    }, [userData?.role, load, router]),
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        (u.email ?? '').toLowerCase().includes(q),
    );
  }, [users, search]);

  const openCreditModal = (user: AdminWalletUser) => {
    setSelectedUser(user);
    setAmount('');
    setReason('');
    setModalVisible(true);
  };

  const confirmCredit = async () => {
    const amt = parseFloat(amount);
    if (!selectedUser || isNaN(amt) || amt <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive amount in rupees.');
      return;
    }
    if (amt > 100000) {
      Alert.alert('Limit exceeded', 'Maximum ₹1,00,000 per credit.');
      return;
    }

    setProcessing(true);
    try {
      const result = await adminCreditWallet(selectedUser.id, amt, reason);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === selectedUser.id
            ? { ...u, walletBalance: Number(result.newBalance) }
            : u,
        ),
      );
      setModalVisible(false);
      Alert.alert(
        'Wallet credited',
        `₹${amt.toFixed(2)} added to ${selectedUser.name}. New balance: ₹${Number(result.newBalance).toFixed(2)}`,
      );
    } catch (error: unknown) {
      Alert.alert('Credit failed', friendlyError(error, 'Could not credit wallet'));
    } finally {
      setProcessing(false);
    }
  };

  const renderUser = ({ item }: { item: AdminWalletUser }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.info}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email || '—'}</Text>
          <Text style={styles.role}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.metaRow}>
        <View>
          <Text style={styles.balanceLabel}>Wallet Balance</Text>
          <Text style={styles.balance}>
            {item.walletBalance != null ? `₹${item.walletBalance.toFixed(2)}` : '—'}
          </Text>
        </View>
        <View
          style={[
            styles.badge,
            { backgroundColor: item.approved ? '#dcfce7' : '#fef3c7' },
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              { color: item.approved ? '#166534' : '#92400e' },
            ]}
          >
            {item.approved ? 'Approved' : 'Pending'}
          </Text>
        </View>
      </View>
      <TouchableOpacity style={styles.addBtn} onPress={() => openCreditModal(item)}>
        <Ionicons name="add-circle" size={18} color="#fff" />
        <Text style={styles.addBtnText}>Add Money</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && users.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminScreenHeader title="Wallet Management" />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email"
          placeholderTextColor="#9ca3af"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      {fetchError ? (
        <ErrorBanner message={fetchError} onRetry={() => { setLoading(true); load(); }} />
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderUser}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        {...flatListPerfProps}
        ListEmptyComponent={
          <EmptyState icon="wallet-outline" title="No users found" subtitle="Try a different search" />
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Money</Text>
            <Text style={styles.modalSub}>
              Credit wallet for {selectedUser?.name} ({selectedUser?.email || 'no email'})
            </Text>
            <Text style={styles.inputLabel}>Amount (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Amount"
              placeholderTextColor="#9ca3af"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />
            <Text style={styles.inputLabel}>Reason (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Reason"
              placeholderTextColor="#9ca3af"
              value={reason}
              onChangeText={setReason}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={processing}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, processing && styles.btnDisabled]}
                onPress={confirmCredit}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.confirmText}>Confirm</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    gap: 8,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: '#1f2937' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#8b5cf6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  info: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  role: { fontSize: 12, color: '#8b5cf6', fontWeight: '600', marginTop: 4 },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  balanceLabel: { fontSize: 12, color: '#6b7280' },
  balance: { fontSize: 22, fontWeight: 'bold', color: '#16a34a', marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  addBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
  },
  addBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
  },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1f2937' },
  modalSub: { fontSize: 14, color: '#6b7280', marginTop: 8, marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: '#1f2937',
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: { color: '#374151', fontWeight: '600' },
  confirmBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#16a34a',
    alignItems: 'center',
  },
  confirmText: { color: '#fff', fontWeight: '600' },
  btnDisabled: { opacity: 0.6 },
});
