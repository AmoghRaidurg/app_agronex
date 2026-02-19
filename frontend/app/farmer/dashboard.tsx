import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function FarmerDashboard() {
  const { userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    if (!userData) return;
    
    try {
      const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL || '';
      const response = await fetch(`${backendUrl}/api/analytics/farmer/${userData.uid}`);
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUserData();
    await fetchAnalytics();
    setRefreshing(false);
  };

  const formatCurrency = (amount: number) => `₹${amount.toFixed(2)}`;

  // Prepare chart data
  const chartData = analytics?.monthlyData
    ? Object.entries(analytics.monthlyData).map(([month, value]: [string, any]) => ({
        value: value,
        label: month.substring(5), // Show only month
      }))
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Namaste, {userData?.name}! 👋</Text>
          <Text style={styles.role}>Farmer Dashboard</Text>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#10b981' }]}>
            <Ionicons name="cash" size={32} color="#fff" />
            <Text style={styles.statValue}>{formatCurrency(userData?.walletBalance || 0)}</Text>
            <Text style={styles.statLabel}>Wallet Balance</Text>
          </View>

          <View style={[styles.statCard, { backgroundColor: '#3b82f6' }]}>
            <Ionicons name="trending-up" size={32} color="#fff" />
            <Text style={styles.statValue}>
              {formatCurrency(analytics?.totalEarnings || 0)}
            </Text>
            <Text style={styles.statLabel}>Total Sales</Text>
          </View>
        </View>

        {/* Income Prediction */}
        {analytics && chartData.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Income Trend 📈</Text>
            <Text style={styles.predictionText}>
              Predicted Annual Income: {formatCurrency(analytics.predictedAnnualIncome)}
            </Text>
            <LineChart
              data={chartData}
              width={width - 80}
              height={200}
              color="#10b981"
              thickness={3}
              dataPointsColor="#10b981"
              textColor="#6b7280"
              textFontSize={12}
              yAxisTextStyle={{ color: '#6b7280' }}
              xAxisLabelTextStyle={{ color: '#6b7280' }}
              curved
              areaChart
              startFillColor="#10b981"
              endFillColor="#10b98120"
              startOpacity={0.8}
              endOpacity={0.3}
            />
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Quick Actions</Text>
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/farmer/add-crop')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#10b981' }]}>
                <Ionicons name="add-circle" size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Add Crop</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/farmer/my-crops')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#f59e0b' }]}>
                <Ionicons name="leaf" size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>My Crops</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/farmer/orders')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#3b82f6' }]}>
                <Ionicons name="document-text" size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Orders</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => router.push('/farmer/wallet')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#8b5cf6' }]}>
                <Ionicons name="wallet" size={28} color="#fff" />
              </View>
              <Text style={styles.actionText}>Wallet</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Best Selling Crops */}
        {analytics?.bestSellingCrops && analytics.bestSellingCrops.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Top Performing Crops 🌟</Text>
            {analytics.bestSellingCrops.map((crop: any, index: number) => (
              <View key={index} style={styles.cropItem}>
                <View style={styles.cropRank}>
                  <Text style={styles.cropRankText}>{index + 1}</Text>
                </View>
                <View style={styles.cropInfo}>
                  <Text style={styles.cropName}>{crop.name}</Text>
                  <Text style={styles.cropDetails}>
                    Sold: {crop.soldQuantity}{crop.unit} | ₹{crop.pricePerUnit}/{crop.unit}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  header: {
    backgroundColor: '#fff',
    padding: 24,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  role: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 12,
  },
  statLabel: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    opacity: 0.9,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  predictionText: {
    fontSize: 16,
    color: '#10b981',
    fontWeight: '600',
    marginBottom: 16,
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: '48%',
    alignItems: 'center',
    marginBottom: 16,
  },
  actionIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  cropItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  cropRank: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cropRankText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  cropInfo: {
    flex: 1,
  },
  cropName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  cropDetails: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});