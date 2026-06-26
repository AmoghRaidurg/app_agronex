import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  Image,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { buildFarmerListingMeta } from '../../lib/commerceMeta';
import { friendlyError } from '../../lib/asyncUtils';

export default function AddCrop() {
  const { userData } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [harvestDate, setHarvestDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(userData?.address || '');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['Grains', 'Vegetables', 'Fruits', 'Pulses', 'Raw Materials'];
  const units = ['kg', 'quintal', 'ton', 'pieces'];

  const requestMediaPermission = async (type: 'library' | 'camera') => {
    const result =
      type === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (result.status === 'granted') return true;

    Alert.alert(
      'Permission required',
      type === 'camera'
        ? 'Camera access is needed to photograph your crop.'
        : 'Photo library access is needed to upload crop images.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: () => Linking.openSettings() },
      ],
    );
    return false;
  };

  const pickImage = async () => {
    if (!(await requestMediaPermission('library'))) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const takePhoto = async () => {
    if (!(await requestMediaPermission('camera'))) return;

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      setImageBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
    }
  };

  const handleSubmit = async () => {
    if (!userData?.uid) {
      Alert.alert('Error', 'Please sign in again to list crops');
      return;
    }
    if (!name || !quantity || !price || !category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }
    if (parseFloat(quantity) <= 0 || parseFloat(price) <= 0) {
      Alert.alert('Error', 'Quantity and price must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const description = buildFarmerListingMeta(userData.uid);

      const { error } = await supabase.from('products').insert({
        seller_id: userData.uid,
        name,
        crop_type: category,
        quantity: parseFloat(quantity),
        unit,
        price_per_unit: parseFloat(price),
        description,
        // imageBase64, harvestDate, location are preserved in UI but not stored
        // to strictly match the website schema and prevent Android-only fields.
      });

      if (error) throw error;

      Alert.alert('Success', 'Crop listed successfully!');
      router.back();
    } catch (error: unknown) {
      Alert.alert('Error', friendlyError(error, 'Failed to add crop'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Add New Crop</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content}>
        <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
          {imageBase64 ? (
            <Image source={{ uri: imageBase64 }} style={styles.image} />
          ) : (
            <View style={styles.imagePickerPlaceholder}>
              <Ionicons name="camera" size={48} color="#9ca3af" />
              <Text style={styles.imagePickerText}>Upload Crop Image</Text>
            </View>
          )}
        </TouchableOpacity>
        <View style={styles.imageActions}>
          <TouchableOpacity style={styles.imageActionBtn} onPress={pickImage}>
            <Ionicons name="images-outline" size={18} color="#16a34a" />
            <Text style={styles.imageActionText}>Gallery</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.imageActionBtn} onPress={takePhoto}>
            <Ionicons name="camera-outline" size={18} color="#16a34a" />
            <Text style={styles.imageActionText}>Camera</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Crop Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g., Wheat, Rice, Tomato"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>Category *</Text>
        <View style={styles.categoryContainer}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                category === cat && styles.categoryChipSelected,
              ]}
              onPress={() => setCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  category === cat && styles.categoryChipTextSelected,
                ]}
              >
                {cat}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.row}>
          <View style={styles.halfInput}>
            <Text style={styles.label}>Quantity *</Text>
            <TextInput
              style={styles.input}
              placeholder="100"
              keyboardType="numeric"
              value={quantity}
              onChangeText={setQuantity}
            />
          </View>

          <View style={styles.halfInput}>
            <Text style={styles.label}>Unit</Text>
            <View style={styles.unitPicker}>
              {units.map((u) => (
                <TouchableOpacity
                  key={u}
                  style={[
                    styles.unitOption,
                    unit === u && styles.unitOptionSelected,
                  ]}
                  onPress={() => setUnit(u)}
                >
                  <Text
                    style={[
                      styles.unitText,
                      unit === u && styles.unitTextSelected,
                    ]}
                  >
                    {u}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <Text style={styles.label}>Price per {unit} *</Text>
        <TextInput
          style={styles.input}
          placeholder="₹ 0"
          keyboardType="numeric"
          value={price}
          onChangeText={setPrice}
        />

        <Text style={styles.label}>Harvest Date (Optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          value={harvestDate}
          onChangeText={setHarvestDate}
        />

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Describe your crop quality, growing methods, etc."
          multiline
          numberOfLines={4}
          value={description}
          onChangeText={setDescription}
        />

        <Text style={styles.label}>Location</Text>
        <TextInput
          style={styles.input}
          placeholder="Village, District, State"
          value={location}
          onChangeText={setLocation}
        />

        <TouchableOpacity
          style={[styles.submitButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>List Crop for Sale</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
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
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  imagePicker: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 24,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imagePickerPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f3f4f6',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#d1d5db',
    borderStyle: 'dashed',
    borderRadius: 16,
  },
  imagePickerText: {
    marginTop: 8,
    fontSize: 16,
    color: '#9ca3af',
  },
  imageActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: -12,
    marginBottom: 24,
  },
  imageActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#ecfdf5',
  },
  imageActionText: {
    color: '#16a34a',
    fontWeight: '600',
    fontSize: 14,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
    marginBottom: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoryContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  categoryChip: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    marginBottom: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#16a34a',
  },
  categoryChipText: {
    color: '#6b7280',
    fontSize: 14,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#fff',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfInput: {
    width: '48%',
  },
  unitPicker: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  unitOption: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginRight: 4,
    marginBottom: 8,
  },
  unitOptionSelected: {
    backgroundColor: '#16a34a',
  },
  unitText: {
    color: '#6b7280',
    fontSize: 12,
  },
  unitTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#16a34a',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});
