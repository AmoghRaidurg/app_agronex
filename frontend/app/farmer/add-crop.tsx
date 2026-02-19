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
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { Ionicons } from '@expo/vector-icons';

export default function AddCrop() {
  const { userData } = useAuth();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unit, setUnit] = useState('kg');
  const [price, setPrice] = useState('');
  const [harvest Date, setHarvestDate] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [location, setLocation] = useState(userData?.address || '');
  const [imageBase64, setImageBase64] = useState('');
  const [loading, setLoading] = useState(false);

  const categories = ['Grains', 'Vegetables', 'Fruits', 'Pulses', 'Raw Materials'];
  const units = ['kg', 'quintal', 'ton', 'pieces'];

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Need camera roll permission to upload images');
      return;
    }

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

  const handleSubmit = async () => {
    if (!name || !quantity || !price || !category || !imageBase64) {
      Alert.alert('Error', 'Please fill all required fields and upload an image');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.EXPO_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/crops`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          farmerId: userData?.uid,
          farmerName: userData?.name,
          name,
          quantity: parseFloat(quantity),
          unit,
          pricePerUnit: parseFloat(price),
          harvestDate: harvestDate || new Date().toISOString().split('T')[0],
          description,
          category,
          location,
          imageBase64,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to add crop');
      }

      Alert.alert('Success', 'Crop listed successfully!');
      router.back();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add crop');
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
    backgroundColor: '#10b981',
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
    backgroundColor: '#10b981',
  },
  unitText: {
    color: '#6b7280',
    fontSize: 12,
  },
  unitTextSelected: {
    color: '#fff',
  },
  submitButton: {
    backgroundColor: '#10b981',
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