import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getProductImage } from '../../lib/utils';
import { parseCommerceMeta } from '../../lib/commerceMeta';

export default function Marketplace() {
  const router = useRouter();
  const { userData } = useAuth();
  const [crops, setCrops] = useState<any[]>([]);
  const [filteredCrops, setFilteredCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Pulses', 'Raw Materials', 'Resale'];

  const fetchCrops = async () => {
    try {
      setFetchError(null);
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          profiles:seller_id (name)
        `)
        .gt('quantity', 0)
        .order('created_at', { ascending: false });

      if (error) throw error;

      let filtered = (data ?? []).map((p: any) => {
        const meta = parseCommerceMeta(p.description);
        return {
          ...p,
          originalFarmerId: meta?.original_farmer_id,
          isRelisted: meta?.product_kind === 'trader_relist',
          farmerName: p.profiles?.name || 'Unknown',
        };
      });

      if (userData?.role === 'farmer') {
        filtered = filtered.filter((crop: any) => !crop.isRelisted);
      }
      setCrops(filtered);
      setFilteredCrops(filtered);
    } catch (error: any) {
      console.error('Error fetching crops:', error);
      setFetchError(error.message || 'Failed to load marketplace');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchCrops();
    }, [userData?.role])
  );

  useEffect(() => {
    let filtered = crops;

    if (selectedCategory !== 'All') {
      if (selectedCategory === 'Resale') {
        filtered = filtered.filter((crop: any) => crop.isRelisted);
      } else {
        filtered = filtered.filter((crop: any) => crop.crop_type === selectedCategory);
      }
    }

    if (searchQuery) {
      filtered = filtered.filter((crop: any) =>
        crop.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCrops(filtered);
  }, [searchQuery, selectedCategory, crops]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchCrops();
  };

  const renderCropCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.cropCard}
      onPress={() => router.push(`/crop-details?id=${item.id}`)}
    >
      <Image source={{ uri: getProductImage(item.name) }} style={styles.cropImage} />
      <View style={styles.cropInfo}>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropCategory}>{item.crop_type}</Text>
        {item.isRelisted && (
          <View style={styles.resaleBadge}>
            <Text style={styles.resaleBadgeText}>🔄 Trader Certified</Text>
          </View>
        )}
        <View style={styles.cropDetails}>
          <View>
            <Text style={styles.cropPrice}>₹{item.price_per_unit}/{item.unit}</Text>
            <Text style={styles.cropQuantity}>
              {item.quantity} {item.unit} available
            </Text>
          </View>
        </View>
        <Text style={styles.farmerName}>By: {item.farmerName}</Text>
      </View>
    </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

      {fetchError ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color="#b91c1c" />
          <Text style={styles.errorText}>{fetchError}</Text>
        </View>
      ) : null}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search crops..."
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={categories}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.categoryTab,
              selectedCategory === item && styles.categoryTabActive,
            ]}
            onPress={() => setSelectedCategory(item)}
          >
            <Text
              style={[
                styles.categoryTabText,
                selectedCategory === item && styles.categoryTabTextActive,
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
        contentContainerStyle={styles.categoryList}
      />

      <FlatList
        data={filteredCrops}
        keyExtractor={(item) => item.id}
        renderItem={renderCropCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="leaf-outline" size={64} color="#d1d5db" />
            <Text style={styles.emptyText}>No crops found</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    margin: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#1f2937',
  },
  categoryList: {
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  categoryTab: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
  },
  categoryTabActive: {
    backgroundColor: '#16a34a',
  },
  categoryTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  categoryTabTextActive: {
    color: '#fff',
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
    marginBottom: 8,
  },
  resaleBadge: {
    backgroundColor: '#fef3c7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 8,
  },
  resaleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400e',
  },
  cropDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  cropPrice: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  cropQuantity: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  cropLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: 150,
  },
  cropLocationText: {
    fontSize: 12,
    color: '#6b7280',
    marginLeft: 4,
  },
  farmerName: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
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
