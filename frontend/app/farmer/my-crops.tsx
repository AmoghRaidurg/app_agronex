import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function MyCrops() {
  const { userData } = useAuth();
  const router = useRouter();
  const [crops, setCrops] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchMyCrops = async () => {
    if (!userData) return;
    
    try {
      const backendUrl = process.env.EXPO_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/crops/farmer/${userData.uid}`);
      if (response.ok) {
        const data = await response.json();
        setCrops(data);
      }
    } catch (error) {
      console.error('Error fetching crops:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMyCrops();
  }, [userData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyCrops();
  };

  const renderCrop = ({ item }: { item: any }) => (
    <View style={styles.cropCard}>
      <Image source={{ uri: item.imageBase64 }} style={styles.cropImage} />
      <View style={styles.cropInfo}>
        <Text style={styles.cropName}>{item.name}</Text>
        <Text style={styles.cropCategory}>{item.category}</Text>
        <View style={styles.cropDetails}>
          <Text style={styles.cropPrice}>₹{item.pricePerUnit}/{item.unit}</Text>
          <View style={{
            backgroundColor: item.status === 'available' ? '#10b981' : '#ef4444',
            paddingHorizontal: 12,
            paddingVertical: 4,
            borderRadius: 12,
          }}>
            <Text style={styles.statusText}>{item.status.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={styles.cropQuantity}>
          Available: {item.quantity - item.soldQuantity}{item.unit} / {item.quantity}{item.unit}
        </Text>
        {item.soldQuantity > 0 && (
          <Text style={styles.soldText}>Sold: {item.soldQuantity}{item.unit}</Text>
        )}
      </View>
    </View>
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
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Crops</Text>
        <TouchableOpacity onPress={() => router.push('/farmer/add-crop')}>
          <Ionicons name="add-circle" size={24} color="#10b981" />
        </TouchableOpacity>
      </View>

      <FlatList
        data={crops}
        keyExtractor={(item) => item._id}
        renderItem={renderCrop}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
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
    color: '#10b981',
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
    color: '#10b981',
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
    color: '#10b981',
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
    backgroundColor: '#10b981',
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