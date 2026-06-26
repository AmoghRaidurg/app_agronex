import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { useRouter, useFocusEffect } from 'expo-router';
import { useAuth } from '../../contexts/AuthContext';
import { LineChart } from 'react-native-gifted-charts';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import {
  fetchWalletBalance,
  fetchWalletHistory,
  groupEarningsByMonth,
  sumWalletEarnings,
} from '../../lib/walletApi';

const { width } = Dimensions.get('window');

export default function FarmerDashboard() {
  const { userData, refreshUserData } = useAuth();
  const router = useRouter();
  const [analytics, setAnalytics] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAnalytics = async () => {
    if (!userData) return;
    
    try {
      const [walletBal, transactions] = await Promise.all([
        fetchWalletBalance(userData.uid),
        fetchWalletHistory(userData.uid),
      ]);
      setBalance(walletBal);

      const monthlyData = groupEarningsByMonth(transactions);
      const totalEarnings = sumWalletEarnings(transactions);
      const months = Object.values(monthlyData);
      const avgMonthly = months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;
      
      // Fetch best selling crops (we can sort by lowest quantity remaining for now as a proxy if we don't have sold_quantity)
      const { data: bestCrops } = await supabase
        .from('products')
        .select('*')
        .eq('seller_id', userData.uid)
        .order('quantity', { ascending: true }) // Less quantity left = more sold
        .limit(5);

      const mappedCrops = (bestCrops || []).map((p: any) => ({
        ...p,
        soldQuantity: 0, // Placeholder until orders schema is fully integrated
        pricePerUnit: p.price_per_unit
      }));
      
      setAnalytics({
        totalEarnings,
        monthlyData,
        avgMonthlyEarnings: avgMonthly,
        predictedAnnualIncome: avgMonthly * 12,
        bestSellingCrops: mappedCrops,
        transactionCount: transactions.length,
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchAnalytics();
    }, [userData])
  );

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
        contentContainerStyle={{ paddingBottom: 24 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Stats Cards */}
        <View style={styles.statsContainer}>
          <View style={[styles.statCard, { backgroundColor: '#16a34a' }]}>
            <Ionicons name="cash" size={32} color="#fff" />
            <Text style={styles.statValue}>{formatCurrency(balance)}</Text>
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
              color="#16a34a"
              thickness={3}
              dataPointsColor="#16a34a"
              textColor="#6b7280"
              textFontSize={12}
              yAxisTextStyle={{ color: '#6b7280' }}
              xAxisLabelTextStyle={{ color: '#6b7280' }}
              curved
              areaChart
              startFillColor="#16a34a"
              endFillColor="#16a34a20"
              startOpacity={0.8}
              endOpacity={0.3}
              yAxisSide={0}
              isAnimated
              animationDuration={1200}
              initialSpacing={20}
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
              <View style={[styles.actionIcon, { backgroundColor: '#16a34a' }]}>
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
    color: '#16a34a',
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
    backgroundColor: '#16a34a',
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
