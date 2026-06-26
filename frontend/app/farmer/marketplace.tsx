import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRouter, useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getProductImage } from '../../lib/utils';
import { parseCommerceMeta } from '../../lib/commerceMeta';
import { withRetry, friendlyError } from '../../lib/asyncUtils';
import { ErrorBanner, EmptyState } from '../../components/ScreenPrimitives';
import { flatListPerfProps, TAB_LIST_PADDING } from '../../lib/listConfig';
import {
  MARKETPLACE_CATEGORIES,
  matchesMarketplaceCategory,
  type MarketplaceCategory,
} from '../../lib/productCategories';

export default function Marketplace() {
  const router = useRouter();
  const { userData } = useAuth();
  const [crops, setCrops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<MarketplaceCategory>('All');

  const fetchCrops = async () => {
    try {
      setFetchError(null);
      const { data } = await withRetry(async () => {
        const res = await supabase
          .from('products')
          .select(`
          *,
          profiles:seller_id (name)
        `)
          .gt('quantity', 0)
          .order('created_at', { ascending: false });
        if (res.error) throw res.error;
        return res;
      });

      let filtered = (data ?? []).map((p: any) => {
        const meta = parseCommerceMeta(p.description);
        const isRelisted = meta?.product_kind === 'trader_relist';
        return {
          ...p,
          originalFarmerId: meta?.original_farmer_id,
          isRelisted,
          farmerName: p.profiles?.name || 'Unknown',
          commerceMeta: meta,
        };
      });

      if (userData?.role === 'farmer') {
        filtered = filtered.filter((crop: any) => !crop.isRelisted);
      }
      setCrops(filtered);
    } catch (error: unknown) {
      console.error('Error fetching crops:', error);
      setFetchError(friendlyError(error, 'Failed to load marketplace'));
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

  const filteredCrops = useMemo(() => {
    let filtered = crops;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((crop: any) =>
        matchesMarketplaceCategory(
          crop.crop_type,
          crop.commerceMeta,
          crop.isRelisted,
          selectedCategory,
        ),
      );
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      filtered = filtered.filter((crop: any) =>
        String(crop.name ?? '').toLowerCase().includes(q),
      );
    }

    return filtered;
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
      <Image source={{ uri: getProductImage(item.name) }} style={styles.cropImage} contentFit="cover" transition={200} />
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
        <ErrorBanner message={fetchError} onRetry={() => { setLoading(true); fetchCrops(); }} />
      ) : null}

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#9ca3af" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search crops..."
          placeholderTextColor="#9ca3af"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.categoryBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        >
          {MARKETPLACE_CATEGORIES.map((item) => (
            <TouchableOpacity
              key={item}
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
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={filteredCrops}
        keyExtractor={(item) => item.id}
        renderItem={renderCropCard}
        contentContainerStyle={[styles.listContent, { paddingBottom: TAB_LIST_PADDING }]}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        {...flatListPerfProps}
        ListEmptyComponent={
          !loading ? (
            <EmptyState
              icon="leaf-outline"
              title="No crops found"
              subtitle={searchQuery || selectedCategory !== 'All' ? 'Try a different search or filter' : 'Check back soon for new listings'}
            />
          ) : null
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
  categoryBar: {
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 10,
    zIndex: 2,
    elevation: 2,
  },
  categoryList: {
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  categoryTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 20,
    marginRight: 8,
    minHeight: 40,
    justifyContent: 'center',
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
