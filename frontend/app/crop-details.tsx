import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { getProductImage } from '../lib/utils';
import { parseCommerceMeta } from '../lib/commerceMeta';
import { withRetry, friendlyError } from '../lib/asyncUtils';
import { ErrorBanner } from '../components/ScreenPrimitives';

function resolveProductId(id: string | string[] | undefined): string | null {
  if (!id) return null;
  return Array.isArray(id) ? id[0] ?? null : id;
}

export default function CropDetails() {
  const { id: rawId } = useLocalSearchParams<{ id?: string | string[] }>();
  const productId = resolveProductId(rawId);
  const router = useRouter();
  const { userData, refreshUserData } = useAuth();

  const [crop, setCrop] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [quantity, setQuantity] = useState('1');

  const fetchCrop = useCallback(async () => {
    if (!productId) return;
    setLoading(true);
    setFetchError(null);
    try {
      const data = await withRetry(async () => {
        const { data: row, error } = await supabase
          .from('products')
          .select(`
          *,
          profiles:seller_id (name, address)
        `)
          .eq('id', productId)
          .single();
        if (error) throw error;
        return row;
      });
      
      const meta = parseCommerceMeta(data.description);
      const isRelisted = meta?.product_kind === 'trader_relist';
      
      setCrop({
        ...data,
        farmerName: data.profiles?.name || 'Unknown',
        location: data.profiles?.address || 'Unknown Location',
        isRelisted,
        originalFarmerId: meta?.original_farmer_id,
      });
    } catch (error: unknown) {
      console.error('Error fetching crop:', error);
      setFetchError(friendlyError(error, 'Product not found'));
      setCrop(null);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (productId) fetchCrop();
    else {
      setLoading(false);
      setCrop(null);
      setFetchError('Invalid product link');
    }
  }, [productId, fetchCrop]);

  const handleBuy = async () => {
    if (!userData) {
      Alert.alert('Error', 'Please log in to buy');
      return;
    }

    const qty = parseFloat(quantity);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Error', 'Please enter a valid quantity');
      return;
    }

    const available = crop.quantity;
    if (qty > available) {
      Alert.alert('Error', `Only ${available} ${crop.unit} available`);
      return;
    }

    const totalPrice = qty * crop.price_per_unit;

    Alert.alert(
      'Proceed to Checkout',
      `Add ${qty} ${crop.unit} of ${crop.name} for ₹${totalPrice.toFixed(2)} to cart?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setBuying(true);
            try {
              const cart = [{ id: crop.id, qty }];

              const { error } = await supabase.rpc('checkout_order', {
                cart,
              });

              if (error) throw error;

              await refreshUserData();
              await fetchCrop();
              Alert.alert('Success! 🎉', 'Your purchase was successful!', [
                { text: 'View Orders', onPress: () => router.push(`/${userData.role}/orders` as any) },
              ]);
            } catch (error: unknown) {
              console.error('Buy error:', error);
              Alert.alert('Error', friendlyError(error, 'Failed to place order'));
            } finally {
              setBuying(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#16a34a" />
      </View>
    );
  }

  if (!crop) {
    return (
      <View style={styles.loadingContainer}>
        {fetchError ? (
          <>
            <ErrorBanner message={fetchError} onRetry={fetchCrop} />
            <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
              <Text style={styles.backLinkText}>Go back</Text>
            </TouchableOpacity>
          </>
        ) : (
          <Text>Product not found</Text>
        )}
      </View>
    );
  }

  const available = crop.quantity;
  const totalPrice = parseFloat(quantity) * crop.price_per_unit || 0;

  return (
    <ScrollView style={styles.container}>
      <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
        <Ionicons name="arrow-back" size={24} color="#1f2937" />
      </TouchableOpacity>

      <Image source={{ uri: getProductImage(crop.name) }} style={styles.image} contentFit="cover" transition={200} />

      <View style={styles.content}>
        <View style={styles.titleRow}>
          <Text style={styles.cropName}>{crop.name}</Text>
          <Text style={styles.category}>{crop.crop_type}</Text>
        </View>

        {crop.isRelisted && (
          <View style={styles.resaleBanner}>
            <Text style={styles.resaleBannerText}>🔄 This is a resale listing — 12.5% of profit goes to the original farmer</Text>
          </View>
        )}

        <View style={styles.priceSection}>
          <Text style={styles.price}>₹{crop.price_per_unit}</Text>
          <Text style={styles.unit}>per {crop.unit}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Ionicons name="cube-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Available</Text>
            <Text style={styles.infoValue}>{available} {crop.unit}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="location-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Location</Text>
            <Text style={styles.infoValue}>{crop.location}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="person-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Seller</Text>
            <Text style={styles.infoValue}>{crop.farmerName}</Text>
          </View>
          <View style={styles.infoItem}>
            <Ionicons name="calendar-outline" size={20} color="#16a34a" />
            <Text style={styles.infoLabel}>Harvest</Text>
            <Text style={styles.infoValue}>Recently Harvested</Text>
          </View>
        </View>

        {/* Don't show buy section if user is the seller */}
        {!userData && available > 0 && (
          <TouchableOpacity
            style={styles.buyButton}
            onPress={() => router.push('/auth/login')}
          >
            <Text style={styles.buyButtonText}>Sign in to Purchase</Text>
          </TouchableOpacity>
        )}

        {userData && crop.seller_id !== userData.uid && available > 0 && (
          <View style={styles.buySection}>
            <Text style={styles.buyLabel}>Quantity ({crop.unit})</Text>
            <TextInput
              style={styles.quantityInput}
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
              placeholder="Enter quantity"
            />
            <Text style={styles.totalText}>Total: ₹{totalPrice.toFixed(2)}</Text>
            <TouchableOpacity
              style={[styles.buyButton, buying && styles.buyButtonDisabled]}
              onPress={handleBuy}
              disabled={buying}
            >
              {buying ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buyButtonText}>Buy Now</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {userData && crop.seller_id !== userData.uid && available <= 0 && (
          <View style={styles.soldOutBanner}>
            <Text style={styles.soldOutText}>This product is currently sold out.</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  backLink: { marginTop: 24, padding: 12 },
  backLinkText: { color: '#16a34a', fontSize: 16, fontWeight: '600' },
  backButton: { position: 'absolute', top: 48, left: 16, zIndex: 10, backgroundColor: '#fff', borderRadius: 20, padding: 8, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, elevation: 3 },
  image: { width: '100%', height: 300, backgroundColor: '#f3f4f6' },
  content: { padding: 20 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cropName: { fontSize: 28, fontWeight: 'bold', color: '#1f2937', flex: 1, textTransform: 'capitalize' },
  category: { fontSize: 14, fontWeight: '600', color: '#16a34a', backgroundColor: '#ecfdf5', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  resaleBanner: { backgroundColor: '#fef3c7', padding: 12, borderRadius: 12, marginBottom: 16 },
  resaleBannerText: { color: '#92400e', fontSize: 13, fontWeight: '600' },
  priceSection: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  price: { fontSize: 36, fontWeight: 'bold', color: '#16a34a' },
  unit: { fontSize: 16, color: '#6b7280', marginLeft: 8 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 20 },
  infoItem: { width: '50%', padding: 12, alignItems: 'center' },
  infoLabel: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1f2937', marginTop: 2, textAlign: 'center' },
  buySection: { backgroundColor: '#fff', borderRadius: 16, padding: 20, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  buyLabel: { fontSize: 16, fontWeight: '600', color: '#374151', marginBottom: 8 },
  quantityInput: { borderWidth: 1, borderColor: '#d1d5db', borderRadius: 12, padding: 14, fontSize: 16, marginBottom: 12 },
  totalText: { fontSize: 20, fontWeight: 'bold', color: '#16a34a', marginBottom: 16, textAlign: 'center' },
  buyButton: { backgroundColor: '#16a34a', padding: 16, borderRadius: 12, alignItems: 'center' },
  buyButtonDisabled: { opacity: 0.6 },
  buyButtonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  soldOutBanner: { backgroundColor: '#fef2f2', padding: 16, borderRadius: 12, alignItems: 'center' },
  soldOutText: { color: '#b91c1c', fontSize: 16, fontWeight: '600' },
});
