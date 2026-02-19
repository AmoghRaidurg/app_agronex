import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function CompleteProfile() {
  const { phoneNumber, uid } = useLocalSearchParams();
  const router = useRouter();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [bankUPI, setBankUPI] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const roles = [
    { value: 'farmer', label: 'Farmer', icon: '🌾', desc: 'Sell your crops directly' },
    { value: 'trader', label: 'Trader', icon: '👨‍💼', desc: 'Buy & resell products' },
    { value: 'customer', label: 'Customer', icon: '🛍️', desc: 'Buy fresh produce' },
    { value: 'industrialist', label: 'Industrialist', icon: '🏭', desc: 'Bulk purchase & processing' },
  ];

  const handleSubmit = async () => {
    if (!name || !address || !bankUPI || !selectedRole) {
      Alert.alert('Error', 'Please fill all fields and select a role');
      return;
    }

    setLoading(true);
    try {
      const backendUrl = process.env.EXPO_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: uid || `demo-${phoneNumber}`,
          phoneNumber: phoneNumber || '',
          role: selectedRole,
          name,
          address,
          bankUPI,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create profile');
      }

      const userData = await response.json();
      Alert.alert('Success', 'Profile created successfully!');
      
      // Route to appropriate dashboard
      router.replace(`/${selectedRole}/dashboard`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Complete Your Profile</Text>
          <Text style={styles.subtitle}>Tell us about yourself</Text>
        </View>

        <View style={styles.form}>
          <Text style={styles.label}>Full Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your name"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Address</Text>
          <TextInput
            style={styles.input}
            placeholder="Village/City, District, State"
            value={address}
            onChangeText={setAddress}
            multiline
          />

          <Text style={styles.label}>Bank Account / UPI ID</Text>
          <TextInput
            style={styles.input}
            placeholder="UPI ID or Account Number"
            value={bankUPI}
            onChangeText={setBankUPI}
          />

          <Text style={styles.label}>Select Your Role</Text>
          <View style={styles.rolesContainer}>
            {roles.map((role) => (
              <TouchableOpacity
                key={role.value}
                style={[
                  styles.roleCard,
                  selectedRole === role.value && styles.roleCardSelected,
                ]}
                onPress={() => setSelectedRole(role.value)}
              >
                <Text style={styles.roleIcon}>{role.icon}</Text>
                <Text style={styles.roleLabel}>{role.label}</Text>
                <Text style={styles.roleDesc}>{role.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    marginBottom: 32,
    marginTop: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
  },
  form: {
    width: '100%',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    fontSize: 16,
    color: '#1f2937',
  },
  rolesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  roleCard: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  roleCardSelected: {
    borderColor: '#10b981',
    backgroundColor: '#ecfdf5',
  },
  roleIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  roleLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 4,
  },
  roleDesc: {
    fontSize: 12,
    color: '#6b7280',
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
});