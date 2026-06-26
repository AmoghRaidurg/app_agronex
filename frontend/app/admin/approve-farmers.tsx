import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AdminScreenHeader from '../../components/AdminScreenHeader';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps } from '../../lib/listConfig';
import {
  fetchPendingFarmers,
  setProfileApproved,
  rejectFarmer,
  friendlyError,
  type AdminProfile,
} from '../../lib/adminApi';

export default function ApproveFarmers() {
  const { userData } = useAuth();
  const router = useRouter();
  const [farmers, setFarmers] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setFetchError(null);
      setFarmers(await fetchPendingFarmers());
    } catch (error: unknown) {
      setFetchError(friendlyError(error, 'Failed to load pending farmers'));
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

  const handleApprove = async (farmer: AdminProfile) => {
    setActionId(farmer.id);
    try {
      await setProfileApproved(farmer.id, true);
      Alert.alert('Approved', `${farmer.name} can now use the platform.`);
      await load();
    } catch (error: unknown) {
      Alert.alert('Error', friendlyError(error, 'Approval failed'));
    } finally {
      setActionId(null);
    }
  };

  const handleReject = (farmer: AdminProfile) => {
    Alert.alert(
      'Reject Farmer',
      `Reject ${farmer.name}? They will be marked as suspended.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject',
          style: 'destructive',
          onPress: async () => {
            setActionId(farmer.id);
            try {
              await rejectFarmer(farmer.id);
              Alert.alert('Rejected', `${farmer.name} was not approved.`);
              await load();
            } catch (error: unknown) {
              Alert.alert('Error', friendlyError(error, 'Rejection failed'));
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const renderFarmer = ({ item }: { item: AdminProfile }) => {
    const busy = actionId === item.id;
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <Ionicons name="leaf" size={22} color="#fff" />
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.detail}>{item.email || 'No email'}</Text>
            {item.phone ? (
              <Text style={styles.detail}>{item.phone}</Text>
            ) : null}
            {item.address ? (
              <Text style={styles.address} numberOfLines={2}>
                {item.address}
              </Text>
            ) : null}
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.approveBtn, busy && styles.btnDisabled]}
            onPress={() => handleApprove(item)}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={18} color="#fff" />
                <Text style={styles.btnText}>Approve</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.rejectBtn, busy && styles.btnDisabled]}
            onPress={() => handleReject(item)}
            disabled={busy}
          >
            <Ionicons name="close-circle" size={18} color="#fff" />
            <Text style={styles.btnText}>Reject</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && farmers.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminScreenHeader title="Approve Farmers" />
      {fetchError ? (
        <ErrorBanner message={fetchError} onRetry={() => { setLoading(true); load(); }} />
      ) : null}
      <FlatList
        data={farmers}
        keyExtractor={(item) => item.id}
        renderItem={renderFarmer}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
        {...flatListPerfProps}
        ListEmptyComponent={
          <EmptyState
            icon="checkmark-done-circle-outline"
            title="No pending farmers"
            subtitle="All farmer accounts are approved"
          />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: { flexDirection: 'row', marginBottom: 16 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  info: { flex: 1 },
  name: { fontSize: 17, fontWeight: '600', color: '#1f2937' },
  detail: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  address: { fontSize: 13, color: '#9ca3af', marginTop: 6, lineHeight: 18 },
  actions: { flexDirection: 'row', gap: 12 },
  approveBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 10,
  },
  rejectBtn: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ef4444',
    paddingVertical: 12,
    borderRadius: 10,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
});
