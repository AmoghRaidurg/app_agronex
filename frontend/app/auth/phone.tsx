import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { PhoneAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../../lib/firebase';

export default function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [verificationId, setVerificationId] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const otpRefs = useRef<Array<TextInput | null>>([]);

  const sendOTP = async () => {
    if (phoneNumber.length < 10) {
      Alert.alert('Error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      // For demo purposes, simulate OTP sending
      // In production, you would use Firebase Phone Auth here
      setTimeout(() => {
        setShowOTP(true);
        setVerificationId('demo-verification-id');
        setLoading(false);
        Alert.alert(
          'Demo Mode - OTP Simulated ✅', 
          '⚠️ This is DEMO mode. No SMS sent.\n\nEnter ANY 6-digit code to continue.\n\nExample: 123456',
          [{ text: 'Got it!', style: 'default' }]
        );
      }, 1000);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message);
    }
  };

  const verifyOTP = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      Alert.alert('Error', 'Please enter complete 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      // For demo, accept any 6-digit OTP
      // In production, verify with Firebase
      
      // Create a demo user
      const demoUid = `demo-${phoneNumber}`;
      
      // Check if user profile exists
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/users/${demoUid}`);
      
      if (response.status === 404) {
        // New user, redirect to profile completion
        router.replace({
          pathname: '/auth/complete-profile',
          params: { phoneNumber, uid: demoUid },
        });
      } else {
        // Existing user, fetch profile and redirect to dashboard
        const userData = await response.json();
        router.replace(`/${userData.role}/dashboard`);
      }
      
      setLoading(false);
    } catch (error: any) {
      setLoading(false);
      Alert.alert('Error', error.message || 'Failed to verify OTP');
    }
  };

  const handleOTPChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Auto-focus next input
    if (text && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOTPKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.content}>
          <Text style={styles.logo}>AGRONEX</Text>
          <Text style={styles.subtitle}>Agricultural Marketplace</Text>
          
          <View style={styles.demoBanner}>
            <Text style={styles.demoBannerText}>🧪 DEMO MODE</Text>
            <Text style={styles.demoBannerSubtext}>No SMS sent - Use any 6-digit code</Text>
          </View>

          {!showOTP ? (
            <View style={styles.form}>
              <Text style={styles.label}>Enter Phone Number</Text>
              <View style={styles.phoneInputContainer}>
                <Text style={styles.countryCode}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  placeholder="10-digit mobile number"
                  keyboardType="phone-pad"
                  maxLength={10}
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                />
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={sendOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Send OTP</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.form}>
              <Text style={styles.label}>Enter 6-Digit OTP</Text>
              <Text style={styles.hint}>Sent to +91 {phoneNumber}</Text>

              <View style={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <TextInput
                    key={index}
                    ref={(ref) => (otpRefs.current[index] = ref)}
                    style={styles.otpInput}
                    maxLength={1}
                    keyboardType="number-pad"
                    value={digit}
                    onChangeText={(text) => handleOTPChange(text, index)}
                    onKeyPress={({ nativeEvent }) =>
                      handleOTPKeyPress(nativeEvent.key, index)
                    }
                  />
                ))}
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={verifyOTP}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.buttonText}>Verify OTP</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity onPress={() => setShowOTP(false)}>
                <Text style={styles.changeNumberText}>Change Phone Number</Text>
              </TouchableOpacity>
            </View>
          )}

          <Text style={styles.footer}>
            By continuing, you agree to AGRONEX's Terms & Privacy Policy
          </Text>
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
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#10b981',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 48,
  },
  demoBanner: {
    backgroundColor: '#fef3c7',
    borderWidth: 2,
    borderColor: '#f59e0b',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  demoBannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#92400e',
    marginBottom: 4,
  },
  demoBannerSubtext: {
    fontSize: 13,
    color: '#92400e',
    textAlign: 'center',
  },
  form: {
    width: '100%',
    maxWidth: 400,
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 16,
    textAlign: 'center',
  },
  hint: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 24,
  },
  phoneInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    marginBottom: 24,
    paddingHorizontal: 16,
  },
  countryCode: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    marginRight: 8,
  },
  phoneInput: {
    flex: 1,
    height: 56,
    fontSize: 18,
    color: '#1f2937',
  },
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 32,
  },
  otpInput: {
    width: 48,
    height: 56,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    color: '#1f2937',
  },
  button: {
    backgroundColor: '#10b981',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  changeNumberText: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 32,
    paddingHorizontal: 32,
  },
});