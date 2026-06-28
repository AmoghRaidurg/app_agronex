import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { IndustrialistDashboard } from '../../lib/aiApi';
import { useMiTheme } from '../../lib/intelligenceTheme';
import { formatInr, industrialistHighlights } from '../../lib/intelligenceUtils';

export function IndustrialistIntelligencePanel({
  dashboard,
}: {
  dashboard: IndustrialistDashboard;
}) {
  const { colors } = useMiTheme();
  const h = industrialistHighlights(dashboard);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.section, { color: colors.text }]}>Industrial Procurement Intelligence</Text>

      {h.availability.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Raw Material Availability"
          body={h.availability.map((a: { crop_name: string; demand_score: number }) => `${a.crop_name}: demand ${a.demand_score}`).join(' · ')}
        />
      ) : null}

      {h.suppliers.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Nearby Suppliers"
          body={h.suppliers
            .map((s: { reliability_score: number; total_volume_kg: number }) => `Reliability ${Math.round(s.reliability_score * 100)}% · ${s.total_volume_kg} kg`)
            .join('\n')}
        />
      ) : null}

      {h.procurementCost ? (
        <InfoCard
          colors={colors}
          title="Procurement Cost Forecast"
          body={`Current ${formatInr(h.procurementCost.current_annual_spend)} → 1Y ${formatInr(h.procurementCost.forecast_1y)} → 3Y ${formatInr(h.procurementCost.forecast_3y)}`}
        />
      ) : null}

      {h.regional.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Regional Availability"
          body={h.regional
            .map((r: { crop_name: string; forecast_monthly_kg: number; expected_unit_cost: number }) => `${r.crop_name}: ${r.forecast_monthly_kg} kg/mo @ ${formatInr(r.expected_unit_cost)}`)
            .join('\n')}
        />
      ) : null}

      {h.priceTrend ? (
        <InfoCard
          colors={colors}
          title="Price Trend"
          body={`${h.priceTrend.crop_name}: ${h.priceTrend.demand_trend ?? 'stable'} · total ${formatInr(h.priceTrend.total_cost_estimate)}`}
        />
      ) : null}

      {h.mfgCost != null ? (
        <InfoCard
          colors={colors}
          title="Manufacturing Cost Impact"
          body={`Estimated annual procurement: ${formatInr(h.mfgCost)}`}
        />
      ) : null}

      {h.forecast.length > 0 ? (
        <InfoCard
          colors={colors}
          title="Procurement Forecast"
          body={h.forecast
            .slice(0, 4)
            .map((f: { crop_name: string; forecast_monthly_kg: number }) => `${f.crop_name}: ${f.forecast_monthly_kg} kg/mo`)
            .join(' · ')}
        />
      ) : null}

      {h.risks.map((r: { crop_name: string; risk_level: string; reason: string }) => (
        <InfoCard
          key={r.crop_name}
          colors={colors}
          title={`Supply Risk — ${r.crop_name}`}
          body={`${r.risk_level}: ${r.reason}`}
        />
      ))}
    </View>
  );
}

function InfoCard({
  title,
  body,
  colors,
}: {
  title: string;
  body: string;
  colors: ReturnType<typeof useMiTheme>['colors'];
}) {
  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Text style={[styles.cardTitle, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.cardBody, { color: colors.textMuted }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 24 },
  section: { fontSize: 18, fontWeight: '700', marginBottom: 12 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600', marginBottom: 6 },
  cardBody: { fontSize: 14, lineHeight: 20 },
});
