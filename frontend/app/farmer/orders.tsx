import React, { useState } from 'react';
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
  TextInput
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
} from '../../lib/orderUtils';
import { useCallback } from 'react';

export default function Orders() {
  const { userData } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Resell Modal State
  const [resellModalVisible, setResellModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [resellPrice, setResellPrice] = useState('');
  const [isReselling, setIsReselling] = useState(false);

  const fetchOrders = async () => {
    if (!userData) return;
    
    try {
      setFetchError(null);
      // 1. Get orders where user is the BUYER
      const { data: buyerOrders, error: buyerErr } = await supabase
        .from('orders')
        .select('*, order_items(*)')
        .eq('buyerId', userData.uid);
      if (buyerErr) throw buyerErr;
      
      // 2. Get orders where user is the SELLER
      let sellerOrders: any[] = [];
      if (userData.role === 'farmer' || userData.role === 'trader') {
        const { data: items, error: itemsErr } = await supabase
          .from('order_items')
          .select('orderId')
          .eq('farmerId', userData.uid);
        if (itemsErr) throw itemsErr;
        
        if (items && items.length > 0) {
          const orderIds = [...new Set(items.map((i: any) => i.orderId))];
          const { data: sOrders, error: sOrdersErr } = await supabase
            .from('orders')
            .select('*, order_items(*)')
            .in('id', orderIds);
          if (sOrdersErr) throw sOrdersErr;
          sellerOrders = sOrders || [];
        }
      }

      // Combine and deduplicate
      const allOrdersMap: any = {};
      [...(buyerOrders || []), ...sellerOrders].forEach((o: any) => {
        allOrdersMap[o.id] = o;
      });
      const allOrders = Object.values(allOrdersMap);
      allOrders.sort((a: any, b: any) => {
        const tb = new Date(orderCreatedAt(b)).getTime();
        const ta = new Date(orderCreatedAt(a)).getTime();
        return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
      });

      setOrders(allOrders as any);
    } catch (error: any) {
      console.error('Error fetching orders:', error);
      setFetchError(error.message || 'Failed to load orders');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchOrders();
    }, [userData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#f59e0b';
      case 'accepted': return '#3b82f6';
      case 'shipped': return '#8b5cf6';
      case 'delivered': return '#16a34a';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
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
      // Create relist metadata string as expected by the production backend
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
        description: description,
      };

      const { error } = await supabase.from('products').insert(payload);

      if (error) throw error;

      Alert.alert('Success', 'Item successfully listed on the marketplace for resale!');
      setResellModalVisible(false);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Could not list item.');
    } finally {
      setIsReselling(false);
    }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const buyerId = orderBuyerId(item);
    const total = orderTotal(item);

    return (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>Order #{(item.id).substring(0, 8)}</Text>
          <Text style={styles.orderDate}>{formatDate(orderCreatedAt(item))}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{(item.status ?? 'pending').toUpperCase()}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <Text style={styles.buyerName}>
          {buyerId === userData?.uid ? 'Your Purchase' : `Sale to: ${item.buyerName ?? item.buyer_name ?? 'Buyer'}`}
        </Text>
        {item.order_items && item.order_items.map((orderItem: any, index: number) => (
          <View key={index} style={styles.itemRow}>
            <View>
              <Text style={styles.itemName}>{orderItemName(orderItem)}</Text>
              <Text style={styles.itemQuantity}>
                {orderItem.quantity}{orderItem.unit} x ₹{orderItemPrice(orderItem)}
              </Text>
            </View>
            
            {userData?.role === 'trader' && buyerId === userData.uid && (
              <TouchableOpacity 
                style={styles.resellBtn}
                onPress={() => handleResellClick(orderItem)}
              >
                <Ionicons name="pricetag" size={12} color="#fff" />
                <Text style={styles.resellBtnText}>Resell</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <View style={styles.orderFooter}>
        <Text style={styles.totalLabel}>Total Amount:</Text>
        <Text style={styles.totalAmount}>₹{total.toFixed(2)}</Text>
      </View>
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
        <Text style={styles.headerTitle}>My Orders</Text>
      </View>

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      <FlatList
        data={orders}
        keyExtractor={(item: any) => item.id}
        renderItem={renderOrder}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        }
      />

      {/* Resell Modal */}
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
              You bought this at ₹{orderItemPrice(selectedItem)}/{selectedItem?.unit}. 
              Enter your new selling price. (12.5% of profit goes to the original farmer).
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>New Price Per {selectedItem?.unit} (₹)</Text>
              <TextInput
                style={styles.input}
                value={resellPrice}
                onChangeText={setResellPrice}
                keyboardType="numeric"
                placeholder="E.g. 50"
              />
            </View>

            <TouchableOpacity 
              style={styles.submitBtn} 
              onPress={submitResell}
              disabled={isReselling}
            >
              {isReselling ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>List for Resale</Text>}
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
  header: { backgroundColor: '#fff', padding: 16, paddingTop: 48, borderBottomWidth: 1, borderBottomColor: '#e5e7eb' },
  headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#1f2937' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 12,
    gap: 8,
  },
  errorText: { flex: 1, color: '#b91c1c', fontSize: 14 },
  listContent: { padding: 16 },
  orderCard: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#f3f4f6' },
  orderId: { fontSize: 16, fontWeight: 'bold', color: '#1f2937', marginBottom: 4 },
  orderDate: { fontSize: 13, color: '#9ca3af' },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 11, fontWeight: 'bold' },
  orderDetails: { marginBottom: 16 },
  buyerName: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  itemName: { fontSize: 14, color: '#4b5563', fontWeight: '500' },
  itemQuantity: { fontSize: 13, color: '#6b7280', marginTop: 2 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 16, borderTopWidth: 1, borderTopColor: '#f3f4f6' },
  totalLabel: { fontSize: 16, fontWeight: '600', color: '#374151' },
  totalAmount: { fontSize: 20, fontWeight: 'bold', color: '#16a34a' },
  emptyContainer: { alignItems: 'center', paddingVertical: 64 },
  emptyText: { fontSize: 16, color: '#9ca3af', marginTop: 16 },
  
  // Resell button
  resellBtn: { flexDirection: 'row', backgroundColor: '#f59e0b', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignItems: 'center' },
  resellBtnText: { color: '#fff', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: 16, padding: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
  modalSub: { fontSize: 14, color: '#6b7280', marginBottom: 20, lineHeight: 20 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8, padding: 12, fontSize: 16 },
  submitBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center' },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: 'bold' }
});
