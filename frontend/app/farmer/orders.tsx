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
} from 'react-native';
import { useAuth } from '../../contexts/AuthContext';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { buildRelistMeta } from '../../lib/commerceMeta';
import {
  orderBuyerId,
  orderCreatedAt,
  orderItemName,
  orderItemOriginalFarmerId,
  orderItemPrice,
  orderTotal,
  safeOrderId,
  orderItems,
} from '../../lib/orderUtils';
import { fetchUserOrders, friendlyError, type OrderRow } from '../../lib/ordersApi';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps, TAB_LIST_PADDING } from '../../lib/listConfig';

export default function Orders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [resellModalVisible, setResellModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [resellPrice, setResellPrice] = useState('');
  const [isReselling, setIsReselling] = useState(false);

  const fetchOrders = useCallback(async () => {
    if (!userData?.uid) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setFetchError(null);
      setOrders(await fetchUserOrders(userData.uid, userData.role));
    } catch (error: unknown) {
      console.error('Error fetching orders:', error);
      setFetchError(friendlyError(error, 'Failed to load orders'));
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData?.uid, userData?.role]);

  useFocusEffect(
    useCallback(() => {
      if (!userData?.uid) {
        setLoading(false);
        return;
      }
      fetchOrders();
    }, [userData?.uid, userData?.role, fetchOrders]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch ((status ?? '').toLowerCase()) {
      case 'pending':
        return '#f59e0b';
      case 'accepted':
        return '#3b82f6';
      case 'shipped':
        return '#8b5cf6';
      case 'delivered':
      case 'completed':
        return '#16a34a';
      default:
        return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleResellClick = (item: any) => {
    setSelectedItem(item);
    setResellPrice('');
    setResellModalVisible(true);
  };

  const submitResell = async () => {
    if (!resellPrice || isNaN(Number(resellPrice))) {
      Alert.alert('Invalid Price', 'Please enter a valid selling price.');
      return;
    }

    setIsReselling(true);
    try {
      const description = buildRelistMeta(userData!.uid, {
        originalFarmerId: orderItemOriginalFarmerId(selectedItem) ?? null,
        orderItemId: selectedItem.id,
        listQty: selectedItem.quantity,
        pricePerUnit: parseFloat(resellPrice),
      });

      const payload = {
        seller_id: userData!.uid,
        name: orderItemName(selectedItem),
        crop_type: 'Resale',
        quantity: selectedItem.quantity,
        unit: selectedItem.unit,
        price_per_unit: parseFloat(resellPrice),
        description,
      };

      const { error } = await supabase.from('products').insert(payload);
      if (error) throw error;

      Alert.alert('Success', 'Item successfully listed on the marketplace for resale!');
      setResellModalVisible(false);
    } catch (error: unknown) {
      Alert.alert('Error', friendlyError(error, 'Could not list item.'));
    } finally {
      setIsReselling(false);
    }
  };

  const renderOrder = ({ item }: { item: OrderRow }) => {
    const buyerId = orderBuyerId(item);
    const total = orderTotal(item);
    const items = orderItems(item);
    const orderId = safeOrderId(item);

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{orderId.substring(0, 8)}</Text>
            <Text style={styles.orderDate}>{formatDate(orderCreatedAt(item))}</Text>
          </View>
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: getStatusColor(String(item.status ?? 'pending')) },
            ]}
          >
            <Text style={styles.statusText}>
              {String(item.status ?? 'pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.buyerName}>
            {buyerId === userData?.uid
              ? 'Your Purchase'
              : `Sale to: ${(item.buyerName as string) ?? (item.buyer_name as string) ?? 'Buyer'}`}
          </Text>
          {items.length === 0 ? (
            <Text style={styles.itemQuantity}>No line items recorded</Text>
          ) : (
            items.map((orderItem: any, index: number) => (
              <View key={orderItem?.id ?? `${orderId}-${index}`} style={styles.itemRow}>
                <View>
                  <Text style={styles.itemName}>{orderItemName(orderItem)}</Text>
                  <Text style={styles.itemQuantity}>
                    {orderItem?.quantity ?? 0}
                    {orderItem?.unit ?? ''} x ₹{orderItemPrice(orderItem)}
                  </Text>
                </View>

                {userData?.role === 'trader' && buyerId === userData.uid ? (
                  <TouchableOpacity
                    style={styles.resellBtn}
                    onPress={() => handleResellClick(orderItem)}
                  >
                    <Ionicons name="pricetag" size={12} color="#fff" />
                    <Text style={styles.resellBtnText}>Resell</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ))
          )}
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.totalLabel}>Total Amount:</Text>
          <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
        </View>
      </View>
    );
  };

  if (loading && orders.length === 0 && !fetchError) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {fetchError ? (
        <ErrorBanner
          message={fetchError}
          onRetry={() => {
            setLoading(true);
            fetchOrders();
          }}
        />
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => safeOrderId(item)}
        renderItem={renderOrder}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_LIST_PADDING }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        {...flatListPerfProps}
        ListEmptyComponent={
          !fetchError ? (
            <EmptyState
              icon="receipt-outline"
              title="No orders yet"
              subtitle="Purchases and sales will appear here"
            />
          ) : null
        }
      />

      <Modal visible={resellModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Resell {orderItemName(selectedItem)}</Text>
              <TouchableOpacity onPress={() => setResellModalVisible(false)}>
                <Ionicons name="close" size={24} color="#6b7280" />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSub}>
              You bought this at ₹{orderItemPrice(selectedItem)}/{selectedItem?.unit}. Enter your
              new selling price. (12.5% of profit goes to the original farmer).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Price Per {selectedItem?.unit} (₹)</Text>
              <TextInput
                style={styles.input}
                value={resellPrice}
                onChangeText={setResellPrice}
                keyboardType="numeric"
                placeholder="E.g. 50"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={submitResell}
              disabled={isReselling}
            >
              {isReselling ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>List for Resale</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    backgroundColor: '#fff',
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  listContent: { padding: 16 },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  orderDate: { fontSize: 13, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  orderDetails: { marginBottom: 16 },
  buyerName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
  itemQuantity: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
  },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#16a34a' },
  resellBtn: {
    flexDirection: 'row',
    backgroundColor: '#f59e0b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignItems: 'center',
  },
  resellBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  modalSub: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
});
