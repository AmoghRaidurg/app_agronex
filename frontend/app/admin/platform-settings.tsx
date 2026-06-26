import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import AdminScreenHeader from '../../components/AdminScreenHeader';

const RESERVED_ITEMS = [
  {
    icon: 'pricetag-outline' as const,
    title: 'Royalty percentage',
    detail: 'Configured per listing in product metadata on the web platform.',
  },
  {
    icon: 'shield-checkmark-outline' as const,
    title: 'Platform policies',
    detail: 'Terms, fees, and compliance rules are managed outside this mobile app.',
  },
  {
    icon: 'notifications-outline' as const,
    title: 'Notification templates',
    detail: 'Push and email templates are not exposed via the production API.',
  },
];

export default function PlatformSettings() {
  const { userData } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (userData && userData.role !== 'admin') {
      router.replace('/');
    }
  }, [userData, router]);

  return (
    <View style={styles.container}>
      <AdminScreenHeader title="Platform Settings" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <Ionicons name="construct-outline" size={48} color="#16a34a" />
          <Text style={styles.heroTitle}>Reserved for future implementation</Text>
          <Text style={styles.heroText}>
            Production Supabase does not expose a platform_settings table or admin
            configuration RPC. This screen documents planned controls so the
            navigation path stays functional without dead UI.
          </Text>
        </View>

        {RESERVED_ITEMS.map((item) => (
          <View key={item.title} style={styles.card}>
            <Ionicons name={item.icon} size={24} color="#374151" />
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardDetail}>{item.detail}</Text>
            </View>
          </View>
        ))}

        <View style={styles.note}>
          <Ionicons name="information-circle-outline" size={18} color="#6b7280" />
          <Text style={styles.noteText}>
            User approval, suspension, and order monitoring are available from the
            other admin screens. When backend settings endpoints are added, this
            screen can be wired without changing routes.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  content: { padding: 16, paddingBottom: 40 },
  hero: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginTop: 16,
    textAlign: 'center',
  },
  heroText: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 22,
    marginTop: 12,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    gap: 14,
    alignItems: 'flex-start',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1f2937' },
  cardDetail: { fontSize: 13, color: '#6b7280', marginTop: 4, lineHeight: 20 },
  note: {
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f3f4f6',
    borderRadius: 12,
    padding: 14,
    marginTop: 8,
    alignItems: 'flex-start',
  },
  noteText: { flex: 1, fontSize: 13, color: '#6b7280', lineHeight: 20 },
});
