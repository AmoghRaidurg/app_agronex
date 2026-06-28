import type { TraderDashboard, IndustrialistDashboard } from './aiApi';

export function intelligenceBasePath(role: string): string {
  if (role === 'trader') return '/trader/intelligence';
  if (role === 'industrialist') return '/industrialist/intelligence';
  return '/farmer/intelligence';
}

export function formatInr(n: number): string {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function traderHighlights(d: TraderDashboard) {
  const t = d.trader;
  return {
    cheapest: t?.best_buy_opportunities?.[0],
    suppliers: t?.regional_sourcing?.slice(0, 5) ?? [],
    supplyDensity: t?.inventory_optimization?.current_kg ?? 0,
    demandHotspots: t?.high_demand_crops?.slice(0, 5) ?? [],
    regional: t?.regional_sourcing ?? [],
    profit: t?.profit_opportunities?.[0],
    transport: t?.price_forecasts?.[0],
    volatility: t?.demand_alerts?.[0],
  };
}

export function industrialistHighlights(d: IndustrialistDashboard) {
  const i = d.industrialist;
  return {
    availability: i?.demand_planning?.slice(0, 5) ?? [],
    suppliers: i?.supplier_ranking?.slice(0, 5) ?? [],
    procurementCost: i?.cost_forecasting,
    regional: i?.procurement_forecast?.slice(0, 5) ?? [],
    priceTrend: i?.procurement_forecast?.[0],
    mfgCost: i?.cost_forecasting?.forecast_1y,
    forecast: i?.procurement_forecast ?? [],
    risks: i?.supply_risks?.slice(0, 3) ?? [],
  };
}
