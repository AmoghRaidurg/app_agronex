import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { getProductImage } from '../../lib/utils';
import { withRetry, friendlyError } from '../../lib/asyncUtils';
import { ErrorBanner } from '../../components/ScreenPrimitives';
import { flatListPerfProps, TAB_LIST_PADDING } from '../../lib/listConfig';

export default function MyCrops() {
  const { userData } = useAuth();
  const router = useRouter();
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchMyCrops = useCallback(async () => {
    if (!userData) return;
    
    try {
      setFetchError(null);
      const data = await withRetry(async () => {
        const { data: rows, error } = await supabase
          .from('products')
          .select('*')
          .eq('seller_id', userData.uid)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return rows ?? [];
      });
      setCrops(data);
    } catch (error: unknown) {
      console.error('Error fetching crops:', error);
      setFetchError(friendlyError(error, 'Failed to load your crops'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userData]);

  useFocusEffect(
    useCallback(() => {
      fetchMyCrops();
    }, [fetchMyCrops]),
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCrops();
  };

  const renderCrop = ({ item }: { item: any }) => (
    <View style={styles.cropCard}>
      <Image source={{ uri: getProductImage(item.name) }} style={styles.cropImage} contentFit="cover" transition={200} />
      <View style={styles.cropInfo}>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropCategory}>{item.crop_type}</Text>
        <View style={styles.cropDetails}>
          <Text style={styles.cropPrice}>₹{item.price_per_unit}/{item.unit}</Text>
          <View style={{
            backgroundColor: item.quantity > 0 ? '#16a34a' : '#ef4444',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={styles.statusText}>{item.quantity > 0 ? 'AVAILABLE' : 'SOLD OUT'}</Text>
          </View>
        </View>
        <Text style={styles.cropQuantity}>
          Available: {item.quantity}{item.unit}
        </Text>
      </View>
    </View>
  );

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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Crops</Text>
        <TouchableOpacity onPress={() => router.push('/farmer/add-crop')}>
          <Ionicons name="add-circle" size={24} color="#16a34a" />
        </TouchableOpacity>
      </View>

      {fetchError ? (
        <ErrorBanner message={fetchError} onRetry={() => { setLoading(true); fetchMyCrops(); }} />
      ) : null}

      <FlatList
        data={crops}
        keyExtractor={(item) => item.id}
        renderItem={renderCrop}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_LIST_PADDING }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        {...flatListPerfProps}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No crops listed yet</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/farmer/add-crop')}
            >
              <Text style={styles.addButtonText}>Add Your First Crop</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    paddingTop: 48,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  listContent: {
    padding: 16,
  },
  cropCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cropImage: {
    width: '100%',
    height: 200,
    backgroundColor: '#f3f4f6',
  },
  cropInfo: {
    padding: 16,
  },
  cropName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  cropCategory: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
    marginBottom: 12,
  },
  cropDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  cropPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  cropQuantity: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  soldText: {
    fontSize: 14,
    color: '#16a34a',
    fontWeight: '600',
    marginTop: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
    marginTop: 16,
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#16a34a',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
