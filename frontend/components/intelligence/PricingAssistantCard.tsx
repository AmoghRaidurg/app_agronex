import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { CropPricingAssistant } from '../../lib/aiApi';
import { useMiTheme } from '../../lib/intelligenceTheme';
import { ShimmerGrid } from './ShimmerGrid';

interface Props {
  data: CropPricingAssistant | null;
  loading?: boolean;
}

export function PricingAssistantCard({ data, loading }: Props) {
  const { colors } = useMiTheme();

  if (loading) {
    return (
      <View style={[styles.wrap, { borderColor: colors.border }]}>
        <Text style={[styles.heading, { color: colors.text }]}>AI Price Assistant</Text>
        <ShimmerGrid count={2} />
      </View>
    );
  }

  if (!data) return null;

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: colors.primary }]}>
      <View style={styles.headerRow}>
        <Ionicons name="sparkles" size={22} color={colors.primary} />
        <Text style={[styles.heading, { color: colors.text }]}>AI Price Assistant</Text>
      </View>

      <View style={styles.grid}>
        <PriceCell label="Today's Mandi Price" value={`₹${data.todays_mandi_price}/${data.unit}`} colors={colors} />
        <PriceCell label="Nearby Highest" value={`₹${data.nearby_highest_price}/${data.unit}`} colors={colors} />
        <PriceCell label="AgroElevate Average" value={`₹${data.agroelevate_average}/${data.unit}`} colors={colors} />
        <PriceCell label="Suggested Price" value={`₹${data.suggested_price}/${data.unit}`} highlight colors={colors} />
      </View>

      <View style={styles.meta}>
        <Text style={[styles.confidence, { color: colors.primary }]}>
          Confidence {data.confidence}%
        </Text>
        <Text style={[styles.profit, { color: colors.blue }]}>
          Expected Extra Profit +₹{data.expected_extra_profit}/{data.unit}
        </Text>
      </View>

      <View style={[styles.recBox, { backgroundColor: colors.primary + '12' }]}>
        <Text style={[styles.rec, { color: colors.primary }]}>{data.recommendation}</Text>
      </View>

      <Text style={[styles.reasonTitle, { color: colors.text }]}>Why this price?</Text>
      {data.reasons.map((r, i) => (
        <View key={i} style={styles.reasonRow}>
          <Ionicons name="checkmark-circle" size={16} color={colors.primary} />
          <Text style={[styles.reason, { color: colors.textMuted }]}>{r}</Text>
        </View>
      ))}
    </View>
  );
}

function PriceCell({
  label,
  value,
  highlight,
  colors,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  colors: ReturnType<typeof useMiTheme>['colors'];
}) {
  return (
    <View style={[styles.cell, highlight && { backgroundColor: colors.primary + '10' }]}>
      <Text style={[styles.cellLabel, { color: colors.textMuted }]}>{label}</Text>
      <Text style={[styles.cellValue, { color: highlight ? colors.primary : colors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 16,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  heading: { fontSize: 17, fontWeight: '700' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  cell: { width: '48%', padding: 10, borderRadius: 10, marginBottom: 8 },
  cellLabel: { fontSize: 11, marginBottom: 4 },
  cellValue: { fontSize: 16, fontWeight: '700' },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  confidence: { fontSize: 14, fontWeight: '600' },
  profit: { fontSize: 14, fontWeight: '600' },
  recBox: { padding: 12, borderRadius: 10, marginTop: 12 },
  rec: { fontSize: 15, fontWeight: '700', textAlign: 'center' },
  reasonTitle: { fontSize: 14, fontWeight: '600', marginTop: 14, marginBottom: 6 },
  reasonRow: { flexDirection: 'row', gap: 6, marginBottom: 4, alignItems: 'flex-start' },
  reason: { flex: 1, fontSize: 13, lineHeight: 18 },
});
