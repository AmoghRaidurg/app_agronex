import React from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { useIntelligence } from '../../../hooks/useIntelligence';
import { IntelligenceHeader } from '../../../components/intelligence/IntelligenceHeader';
import { MetricCard } from '../../../components/intelligence/MetricCard';
import { NavTile } from '../../../components/intelligence/NavTile';
import { ShimmerGrid } from '../../../components/intelligence/ShimmerGrid';
import { TraderIntelligencePanel } from '../../../components/intelligence/TraderIntelligencePanel';
import { IndustrialistIntelligencePanel } from '../../../components/intelligence/IndustrialistIntelligencePanel';
import { ErrorBanner } from '../../../components/ScreenPrimitives';
import { useMiTheme } from '../../../lib/intelligenceTheme';
import { intelligenceBasePath, formatInr } from '../../../lib/intelligenceUtils';
import { formatCacheAge } from '../../../lib/intelligenceCache';
import type { TraderDashboard, IndustrialistDashboard } from '../../../lib/aiApi';
import { TAB_LIST_PADDING } from '../../../lib/listConfig';

export default function IntelligenceOverview() {
  const { userData } = useAuth();
  const location = userData?.address || undefined;
  const role = userData?.role ?? 'farmer';
  const base = intelligenceBasePath(role);
  const { colors } = useMiTheme();

  const { overview, dashboard, loading, refreshing, error, cachedAt, offline, refresh } =
    useIntelligence(userData?.uid, role, location);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <IntelligenceHeader
        title="Market Intelligence"
        subtitle={offline ? 'Offline / cached data' : 'Live insights from AgroElevate AI'}
        showBack={false}
      />

      <ScrollView
        contentContainerStyle={{ paddingBottom: TAB_LIST_PADDING }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      >
        {error ? <ErrorBanner message={error} onRetry={refresh} /> : null}
        {cachedAt ? (
          <Text style={[styles.cache, { color: colors.textMuted }]}>
            Last updated: {formatCacheAge(cachedAt)}
          </Text>
        ) : null}

        {loading && !overview ? (
          <ShimmerGrid count={6} />
        ) : overview ? (
          <View style={styles.metrics}>
            <MetricCard
              label="Today's Highest Crop Price"
              value={`${overview.highest_crop_price.crop} ${formatInr(overview.highest_crop_price.price)}`}
              icon="trophy"
              accent={colors.amber}
              delay={0}
            />
            <MetricCard
              label="Nearby Market"
              value={`${overview.nearby_market.name} (${overview.nearby_market.distance_km} km)`}
              icon="location"
              delay={80}
            />
            <MetricCard
              label="Best Selling Crop"
              value={`${overview.best_selling_crop.crop}`}
              icon="leaf"
              accent={colors.primary}
              delay={160}
            />
            <MetricCard
              label="Avg AgroElevate Price"
              value={formatInr(overview.avg_agroelevate_price)}
              icon="storefront"
              delay={240}
            />
            <MetricCard
              label="Avg Government Price"
              value={formatInr(overview.avg_government_price)}
              icon="business"
              accent={colors.blue}
              delay={320}
            />
            <MetricCard
              label="Difference %"
              value={`${overview.difference_pct > 0 ? '+' : ''}${overview.difference_pct}%`}
              icon="git-compare"
              delay={400}
            />
            <MetricCard
              label="Demand Score"
              value={String(overview.demand_score)}
              icon="flame"
              accent={colors.amber}
              delay={480}
            />
            <MetricCard
              label="Supply Score"
              value={String(overview.supply_score)}
              icon="cube"
              delay={560}
            />
            <MetricCard
              label="Weekly Trend"
              value={overview.weekly_trend}
              icon="trending-up"
              delay={640}
            />
            <MetricCard
              label="Regional Trend"
              value={overview.regional_trend}
              icon="earth"
              delay={720}
            />
          </View>
        ) : null}

        <View style={styles.nav}>
          <NavTile
            title="Live Prices"
            description="Mandi modal, min, max & arrivals"
            icon="pricetag"
            route={`${base}/live-prices`}
          />
          <NavTile
            title="Nearby Markets"
            description="Location-based mandis & distances"
            icon="navigate"
            route={`${base}/nearby-markets`}
            color={colors.blue}
          />
          <NavTile
            title="Price Comparison"
            description="AgroElevate vs government markets"
            icon="bar-chart"
            route={`${base}/price-comparison`}
          />
          <NavTile
            title="Forecast"
            description="Weekly, monthly & yearly trends"
            icon="analytics"
            route={`${base}/forecast`}
            color={colors.purple}
          />
          <NavTile
            title="MSP"
            description="Minimum support prices by crop"
            icon="shield-checkmark"
            route={`${base}/msp`}
            color={colors.amber}
          />
          <NavTile
            title="Recommendations"
            description="AI crop & market suggestions"
            icon="bulb"
            route={`${base}/recommendations`}
          />
          <NavTile
            title="Farmer Benchmark"
            description="Reference benchmark (illustrative)"
            icon="people"
            route={`${base}/benchmark`}
          />
          <NavTile
            title="Benchmark Comparison"
            description="With vs without AgroElevate"
            icon="stats-chart"
            route={`${base}/benchmark-comparison`}
            color={colors.blue}
          />
          <NavTile
            title="Market Map"
            description="Interactive map of nearby mandis"
            icon="map"
            route={`${base}/map`}
            color={colors.primary}
          />
        </View>

        {role === 'trader' && dashboard ? (
          <TraderIntelligencePanel dashboard={dashboard as TraderDashboard} />
        ) : null}
        {role === 'industrialist' && dashboard ? (
          <IndustrialistIntelligencePanel dashboard={dashboard as IndustrialistDashboard} />
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  cache: { fontSize: 12, paddingHorizontal: 16, marginBottom: 4 },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  nav: { padding: 16, paddingTop: 4 },
});
