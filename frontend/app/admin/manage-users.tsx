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
  Alert,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AdminScreenHeader from '../../components/AdminScreenHeader';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps } from '../../lib/listConfig';
import {
  fetchAllProfiles,
  setProfileSuspended,
  friendlyError,
  type AdminProfile,
} from '../../lib/adminApi';

const ROLES = ['All', 'farmer', 'trader', 'customer', 'industrialist', 'admin'] as const;
const STATUS_FILTERS = ['All', 'Approved', 'Pending', 'Suspended'] as const;

export default function ManageUsers() {
  const { userData } = useAuth();
  const router = useRouter();
  const [profiles, setProfiles] = useState<AdminProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<(typeof ROLES)[number]>('All');
  const [statusFilter, setStatusFilter] =
    useState<(typeof STATUS_FILTERS)[number]>('All');
  const [actionId, setActionId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setFetchError(null);
      setProfiles(await fetchAllProfiles());
    } catch (error: unknown) {
      setFetchError(friendlyError(error, 'Failed to load users'));
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
    return profiles.filter((p) => {
      if (roleFilter !== 'All' && p.role !== roleFilter) return false;
      if (statusFilter === 'Approved' && (!p.approved || p.suspended)) return false;
      if (statusFilter === 'Pending' && (p.approved || p.suspended)) return false;
      if (statusFilter === 'Suspended' && !p.suspended) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.email ?? '').toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q)
      );
    });
  }, [profiles, search, roleFilter, statusFilter]);

  const toggleSuspend = async (profile: AdminProfile) => {
    const next = !profile.suspended;
    Alert.alert(
      next ? 'Suspend User' : 'Unsuspend User',
      `${next ? 'Suspend' : 'Restore'} ${profile.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setActionId(profile.id);
            try {
              await setProfileSuspended(profile.id, next);
              await load();
            } catch (error: unknown) {
              Alert.alert('Error', friendlyError(error, 'Action failed'));
            } finally {
              setActionId(null);
            }
          },
        },
      ],
    );
  };

  const renderUser = ({ item }: { item: AdminProfile }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name.charAt(0).toUpperCase()}</Text>
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.name}>{item.name}</Text>
          <Text style={styles.email}>{item.email || '—'}</Text>
          <Text style={styles.meta}>{item.role.toUpperCase()}</Text>
        </View>
      </View>
      <View style={styles.badges}>
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
        {item.suspended ? (
          <View style={[styles.badge, { backgroundColor: '#fee2e2' }]}>
            <Text style={[styles.badgeText, { color: '#b91c1c' }]}>Suspended</Text>
          </View>
        ) : null}
      </View>
      <TouchableOpacity
        style={[styles.actionBtn, item.suspended && styles.restoreBtn]}
        onPress={() => toggleSuspend(item)}
        disabled={actionId === item.id}
      >
        {actionId === item.id ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Text style={styles.actionBtnText}>
            {item.suspended ? 'Unsuspend' : 'Suspend'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && profiles.length === 0) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AdminScreenHeader title="Manage Users" />
      <View style={styles.searchRow}>
        <Ionicons name="search" size={18} color="#9ca3af" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search name, email, or ID"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
      </View>
      <View style={styles.chips}>
        {ROLES.map((role) => (
          <TouchableOpacity
            key={role}
            style={[styles.chip, roleFilter === role && styles.chipActive]}
            onPress={() => setRoleFilter(role)}
          >
            <Text
              style={[styles.chipText, roleFilter === role && styles.chipTextActive]}
            >
              {role === 'All' ? 'All roles' : role}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.chips}>
        {STATUS_FILTERS.map((status) => (
          <TouchableOpacity
            key={status}
            style={[styles.chip, statusFilter === status && styles.chipActive]}
            onPress={() => setStatusFilter(status)}
          >
            <Text
              style={[
                styles.chipText,
                statusFilter === status && styles.chipTextActive,
              ]}
            >
              {status}
            </Text>
          </TouchableOpacity>
        ))}
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
          <EmptyState
            icon="people-outline"
            title="No users match"
            subtitle="Try adjusting search or filters"
          />
        }
      />
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
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    marginBottom: 8,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#f3f4f6',
  },
  chipActive: { backgroundColor: '#16a34a' },
  chipText: { fontSize: 13, color: '#6b7280', fontWeight: '500' },
  chipTextActive: { color: '#fff' },
  list: { padding: 16, paddingTop: 0, paddingBottom: 32 },
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
  cardTop: { flexDirection: 'row', marginBottom: 12 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: { color: '#fff', fontWeight: 'bold', fontSize: 18 },
  cardInfo: { flex: 1 },
  name: { fontSize: 16, fontWeight: '600', color: '#1f2937' },
  email: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  meta: { fontSize: 12, color: '#16a34a', fontWeight: '600', marginTop: 4 },
  badges: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  actionBtn: {
    backgroundColor: '#ef4444',
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
  },
  restoreBtn: { backgroundColor: '#16a34a' },
  actionBtnText: { color: '#fff', fontWeight: '600' },
});
