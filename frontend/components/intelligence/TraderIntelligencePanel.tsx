import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { TraderDashboard } from '../../lib/aiApi';
import { useMiTheme } from '../../lib/intelligenceTheme';
import { formatInr, traderHighlights } from '../../lib/intelligenceUtils';

export function TraderIntelligencePanel({ dashboard }: { dashboard: TraderDashboard }) {
  const { colors } = useMiTheme();
  const h = traderHighlights(dashboard);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.section, { color: colors.text }]}>Trader Market Intelligence</Text>

      {h.cheapest ? (
        <InfoCard
          colors={colors}
          title="Cheapest Procurement Market"
          body={`${h.cheapest.crop_name} — ${formatInr(h.cheapest.current_price)}/kg → projected ${formatInr(h.cheapest.projected_price)}`}
          sub={h.cheapest.reason}
        />
      ) : null}

      {h.profit ? (
        <InfoCard
          colors={colors}
          title="Profit Opportunity"
          body={`${h.profit.crop_name}: ${h.profit.estimated_margin_pct}% margin · sell at ${formatInr(h.profit.suggested_sell_price)}`}
        />
      ) : null}

      {h.demandHotspots.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Demand Hotspots"
          body={h.demandHotspots.map((c: { crop_name: string; demand_score: number }) => `${c.crop_name} (${c.demand_score})`).join(' · ')}
        />
      ) : null}

      {h.suppliers.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Nearby Suppliers / Sourcing"
          body={h.suppliers.map((s: { crop_name: string; recommended_region: string }) => `${s.crop_name} → ${s.recommended_region}`).join('\n')}
        />
      ) : null}

      <InfoCard
        colors={colors}
        title="Supply Density"
        body={`${h.supplyDensity.toLocaleString()} kg in active inventory`}
      />

      {h.transport ? (
        <InfoCard
          colors={colors}
          title="Transport & Volatility Estimate"
          body={`${h.transport.crop_name}: 3m ${formatInr(h.transport.forecast_3m)} · 6m ${formatInr(h.transport.forecast_6m)} (${h.transport.trend})`}
        />
      ) : null}

      {h.volatility ? (
        <InfoCard
          colors={colors}
          title="Volatility Alert"
          body={h.volatility.message}
        />
      ) : null}
    </View>
  );
}

function InfoCard({
  title,
  body,
  sub,
  colors,
}: {
  title: string;
  body: string;
  sub?: string;
  colors: ReturnType<typeof useMiTheme>['colors'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardBody, { color: colors.textMuted }]}>{body}</Text>
      {sub ? <Text style={[styles.cardSub, { color: colors.primary }]}>{sub}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  cardBody: { fontSize: 14, lineHeight: 20 },
  cardSub: { fontSize: 13, marginTop: 6, fontStyle: 'italic' },
});
