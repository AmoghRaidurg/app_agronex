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
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function Marketplace() {
  const router = useRouter();
  const [crops, setCrops] = useState([]);
  const [filteredCrops, setFilteredCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');

  const categories = ['All', 'Grains', 'Vegetables', 'Fruits', 'Pulses', 'Raw Materials'];

  const fetchCrops = async () => {
    try {
      const backendUrl = process.env.EXPO_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/crops`);
      if (response.ok) {
        const data = await response.json();
        setCrops(data);
        setFilteredCrops(data);
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchCrops();
  }, []);

  useEffect(() => {
    let filtered = crops;

    if (selectedCategory !== 'All') {
      filtered = filtered.filter((crop) => crop.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter((crop) =>
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
      onPress={() => router.push(`/crop-details?id=${item._id}`)}
    >
      <Image source={{ uri: item.imageBase64 }} style={styles.cropImage} />
      <View style={styles.cropInfo}>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropCategory}>{item.category}</Text>
        <View style={styles.cropDetails}>
          <View>
            <Text style={styles.cropPrice}>₹{item.pricePerUnit}/{item.unit}</Text>
            <Text style={styles.cropQuantity}>
              {item.quantity - item.soldQuantity} {item.unit} available
            </Text>
          </View>
          <View style={styles.cropLocation}>
            <Ionicons name="location" size={14} color="#6b7280" />
            <Text style={styles.cropLocationText} numberOfLines={1}>
              {item.location}
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
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
      </View>

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
        keyExtractor={(item) => item._id}
        renderItem={renderCropCard}
        contentContainerStyle={styles.listContent}
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
    backgroundColor: '#10b981',
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
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 12,
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
    color: '#10b981',
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