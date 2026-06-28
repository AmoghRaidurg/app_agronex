const AI_BASE = process.env.EXPO_PUBLIC_AI_API_URL || 'http://localhost:8000';
const AI_TIMEOUT_MS = 15_000;

export type AiServiceStatus = 'checking' | 'online' | 'offline' | 'unknown';

export function getAiBaseUrl() {
  return AI_BASE;
}

export class AiServiceError extends Error {
  readonly offline: boolean;
  constructor(message: string, offline = false) {
    super(message);
    this.name = 'AiServiceError';
    this.offline = offline;
  }
}

export interface CropRecommendation {
  crop_name: string;
  rank: number;
  suitability_score?: number;
  profitability_score?: number;
  risk_score: number;
  confidence_score: number;
  expected_profitability: number;
  expected_yield_quintals?: number;
  expected_yield_quintals_per_acre?: number;
  expected_demand?: number;
  explanation?: string;
  state?: string;
  district?: string | null;
  region?: string;
  season?: string;
  month?: number;
}

export interface MarketPrediction {
  crop_name: string;
  demand_score: number;
  trend: 'rising' | 'stable' | 'falling';
  demand_trend?: string;
  price_trend?: string;
  price_min: number;
  price_max: number;
  demand_confidence: number;
  market_confidence?: number;
  price_confidence?: number;
  insufficient_data?: boolean;
  trader_activity_kg?: number;
  industrialist_activity_kg?: number;
}

export interface DemandIntelligence {
  crop_name: string;
  demand_score: number;
  demand_trend: string;
  price_trend: string;
  current_price: number;
  projected_price: number;
  market_confidence: number;
  trader_activity_kg: number;
  industrialist_activity_kg: number;
  marketplace_volume_kg: number;
}

export interface IncomeForecast {
  horizon_years: number;
  forecast_year: number;
  scenario?: string;
  scenario_label?: string;
  projected_revenue: number;
  projected_profit?: number;
  baseline_revenue: number;
  growth_rate: number;
  cagr?: number;
  profit_margin?: number;
  confidence_score: number;
}

export interface UserInsight {
  insight_type: string;
  title: string;
  message: string;
  priority: string;
  crop_name?: string | null;
  confidence_score?: number;
}

export interface GeoContext {
  state: string;
  district: string | null;
  region: string;
}

export interface DistrictAnalytics {
  state: string;
  district: string | null;
  region: string;
  active_listings: number;
  avg_marketplace_price: number;
  top_crops: Array<{ crop_name: string; avg_price?: number; listings?: number; available_kg?: number; demand_score?: number }>;
  data_confidence: number;
}

export interface SeasonalAnalytics {
  season: string;
  month: number;
  recommended_crops: Array<{ crop_name: string; season_fit: number }>;
  planting_window: string;
  confidence: number;
}

export interface HistoricalTrend {
  crop_name: string;
  latest_month: string;
  volume_kg: number;
  volume_change_kg: number;
  avg_price: number;
  price_change: number;
  trend: string;
  confidence: number;
}

export interface WeatherSummary {
  temperature_c: number | null;
  precipitation_mm: number;
  rain_probability_pct: number;
  farming_note: string;
  source: string;
}

export interface FarmerDashboard {
  recommendations: CropRecommendation[];
  market_predictions: MarketPrediction[];
  demand_intelligence?: DemandIntelligence[];
  income_forecasts: IncomeForecast[];
  income_scenarios?: {
    optimistic: IncomeForecast[];
    realistic: IncomeForecast[];
    conservative: IncomeForecast[];
  };
  insights: UserInsight[];
  geo?: GeoContext;
  use_synthetic?: boolean;
  location?: string;
  income_insufficient_data?: boolean;
  demand_insufficient_data?: boolean;
  marketplace_insufficient_data?: boolean;
  district_analytics?: DistrictAnalytics;
  seasonal_analytics?: SeasonalAnalytics;
  historical_trends?: HistoricalTrend[];
  weather?: WeatherSummary | null;
  model_version?: string;
  _fallback?: boolean;
}

export interface TraderDashboard extends FarmerDashboard {
  trader?: {
    high_demand_crops: Array<{ crop_name: string; demand_score: number; avg_price: number }>;
    best_buy_opportunities?: Array<{
      crop_name: string;
      buy_score: number;
      current_price: number;
      projected_price: number;
      demand_trend: string;
      reason: string;
    }>;
    profit_opportunities: Array<{
      crop_name: string;
      profit_score: number;
      estimated_margin_pct: number;
      suggested_sell_price: number;
    }>;
    inventory_health?: { score: number; label: string };
    demand_alerts?: Array<{ crop_name: string; alert_type: string; message: string; priority: string }>;
    inventory_optimization: {
      current_kg: number;
      current_value: number;
      health_score?: number;
      health_label?: string;
      recommendations: Array<{ crop_name: string; action: string; reason: string }>;
    };
    regional_sourcing: Array<{ crop_name: string; recommended_region: string; demand_score: number }>;
    price_forecasts: Array<{ crop_name: string; current_price: number; forecast_3m: number; forecast_6m: number; trend: string; confidence?: number }>;
    future_price_prediction?: Array<{ crop_name: string; current_price: number; forecast_6m: number; trend: string }>;
  };
}

export interface IndustrialistDashboard extends FarmerDashboard {
  industrialist?: {
    procurement_forecast: Array<{
      crop_name: string;
      forecast_monthly_kg: number;
      expected_unit_cost: number;
      total_cost_estimate: number;
      demand_trend?: string;
      priority?: string;
    }>;
    procurement_planning?: Array<{
      crop_name: string;
      forecast_monthly_kg: number;
      expected_unit_cost: number;
      total_cost_estimate: number;
      priority?: string;
    }>;
    supplier_ranking: Array<{
      farmer_id: string;
      reliability_score: number;
      total_volume_kg: number;
      total_value: number;
      on_time_score?: number;
    }>;
    supply_risks: Array<{ crop_name: string; risk_level: string; risk_score: number; reason: string }>;
    supply_risk_alerts?: Array<{ crop_name: string; risk_level: string; risk_score: number; reason: string }>;
    cost_forecasting: {
      current_annual_spend: number;
      forecast_1y: number;
      forecast_3y: number;
      forecast_5y?: number;
      scenarios?: { optimistic: number; realistic: number; conservative: number };
      confidence: number;
    };
    future_cost_forecasting?: {
      current_annual_spend: number;
      forecast_1y: number;
      forecast_3y: number;
      confidence: number;
    };
    demand_planning: Array<{ crop_name: string; demand_score: number; avg_price: number }>;
  };
}

export interface CopilotResponse {
  reply: string;
  intent: string;
  context?: Record<string, unknown>;
  location?: GeoContext;
  season?: string;
  recommendations?: CropRecommendation[];
  suggestions?: string[];
}

async function aiFetch<T>(path: string, params: Record<string, string>, method: 'GET' | 'POST' = 'GET', body?: unknown): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const res = await fetch(`${AI_BASE}${path}?${qs}`, {
      method,
      signal: controller.signal,
      headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const text = await res.text();
      throw new AiServiceError(text || `AI API error ${res.status}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof AiServiceError) throw err;
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new AiServiceError('AI service request timed out', true);
    }
    throw new AiServiceError('AI service unavailable. Check EXPO_PUBLIC_AI_API_URL or start ai-service locally.', true);
  } finally {
    clearTimeout(timeout);
  }
}

function emptyDashboard(): FarmerDashboard {
  return {
    recommendations: [],
    market_predictions: [],
    demand_intelligence: [],
    income_forecasts: [],
    income_scenarios: { optimistic: [], realistic: [], conservative: [] },
    insights: [],
    income_insufficient_data: true,
    demand_insufficient_data: true,
    marketplace_insufficient_data: true,
    model_version: 'offline',
    _fallback: true,
  };
}

async function withFallback<T extends FarmerDashboard>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof AiServiceError && e.offline) {
      return emptyDashboard() as T;
    }
    throw e;
  }
}

export async function refreshIntelligence(userId: string, role: string, location?: string) {
  const params: Record<string, string> = { user_id: userId, role };
  if (location) params.location = location;
  return aiFetch<FarmerDashboard | TraderDashboard | IndustrialistDashboard>(
    '/api/intelligence/refresh', params, 'POST'
  );
}

export async function fetchFarmerDashboard(userId: string, location?: string) {
  const params: Record<string, string> = { user_id: userId };
  if (location) params.location = location;
  return withFallback(() => aiFetch<FarmerDashboard>('/api/intelligence/farmer/dashboard', params));
}

export async function fetchTraderDashboard(userId: string) {
  return withFallback(() => aiFetch<TraderDashboard>('/api/intelligence/trader/dashboard', { user_id: userId }));
}

export async function fetchIndustrialistDashboard(userId: string) {
  return withFallback(() => aiFetch<IndustrialistDashboard>('/api/intelligence/industrialist/dashboard', { user_id: userId }));
}

export async function sendCopilotMessage(
  userId: string,
  message: string,
  role: string,
  location?: string,
  context?: Record<string, unknown>
) {
  const params: Record<string, string> = { user_id: userId, role };
  if (location) params.location = location;
  try {
    return await aiFetch<CopilotResponse>('/api/intelligence/copilot', params, 'POST', { message, context });
  } catch (e) {
    if (e instanceof AiServiceError && e.offline) {
      return {
        reply: 'Intelligence service is temporarily unavailable. Marketplace and wallet features remain fully operational.',
        intent: 'offline',
        suggestions: ['Retry in a moment', 'Browse marketplace', 'Check wallet balance'],
      } satisfies CopilotResponse;
    }
    throw e;
  }
}

export async function checkAiHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${AI_BASE}/health`, { signal: controller.signal });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

// ─── Market Intelligence (shared with Web) ───────────────────────────────────

export interface LiveMarketPrice {
  crop: string;
  market: string;
  district: string;
  state: string;
  modal_price: number;
  min_price: number;
  max_price: number;
  arrival_quantity: string;
  date: string;
  last_updated: string;
}

export interface NearbyMarket {
  id: string;
  name: string;
  crop: string;
  price: number;
  unit: string;
  latitude: number;
  longitude: number;
  distance_km: number;
  travel_time_min: number;
  district: string;
  state: string;
}

export interface PriceComparisonPoint {
  period: string;
  agroelevate_avg: number;
  government_avg: number;
}

export interface PriceComparisonData {
  crop_name: string;
  agroelevate_avg: number;
  government_avg: number;
  difference_pct: number;
  profit_difference: number;
  expected_earnings: number;
  percentage_gain: number;
  weekly: PriceComparisonPoint[];
  monthly: PriceComparisonPoint[];
  yearly: PriceComparisonPoint[];
}

export interface MspEntry {
  crop: string;
  season: string;
  msp_per_quintal: number;
  state: string;
  effective_from: string;
  last_updated: string;
}

export interface ForecastEntry {
  crop_name: string;
  horizon: 'weekly' | 'monthly' | 'yearly';
  period_label: string;
  predicted_price: number;
  confidence: number;
  trend: string;
}

export interface CropPricingAssistant {
  crop_name: string;
  todays_mandi_price: number;
  district_average: number;
  state_average: number;
  agroelevate_average: number;
  nearby_highest_price: number;
  suggested_price: number;
  confidence: number;
  expected_extra_profit: number;
  recommendation: string;
  unit: string;
  reasons: string[];
  _fallback?: boolean;
}

export interface ReferenceBenchmark {
  average_land_hectares: number;
  average_production_kg_year: number;
  average_annual_income: number;
  income_per_kg: number;
  label: string;
  disclaimer: string;
}

export interface BenchmarkProjectionYear {
  year: number;
  income: number;
  income_per_kg: number;
  royalty: number;
  direct_selling_gain: number;
  waste_reduction: number;
  market_linkage: number;
}

export interface BenchmarkComparison {
  without_agroelevate: BenchmarkProjectionYear[];
  with_agroelevate: BenchmarkProjectionYear[];
  disclaimer: string;
}

export interface IntelligenceOverview {
  highest_crop_price: { crop: string; price: number; market: string };
  nearby_market: { name: string; distance_km: number };
  best_selling_crop: { crop: string; volume_kg: number };
  avg_agroelevate_price: number;
  avg_government_price: number;
  difference_pct: number;
  demand_score: number;
  supply_score: number;
  weekly_trend: string;
  regional_trend: string;
  last_updated: string;
}

async function miFetchOrNull<T>(path: string, params: Record<string, string>): Promise<T | null> {
  try {
    return await aiFetch<T>(path, params);
  } catch {
    return null;
  }
}

function deriveOverview(d: FarmerDashboard): IntelligenceOverview {
  const topPred = [...(d.market_predictions || [])].sort(
    (a, b) => b.price_max - a.price_max,
  )[0];
  const topCrop = d.district_analytics?.top_crops?.[0];
  const demand = d.demand_intelligence?.[0];
  const hist = d.historical_trends?.[0];
  const govAvg = topPred ? (topPred.price_min + topPred.price_max) / 2 : 0;
  const aeAvg = d.district_analytics?.avg_marketplace_price ?? govAvg;
  const diff = govAvg > 0 ? ((aeAvg - govAvg) / govAvg) * 100 : 0;

  return {
    highest_crop_price: {
      crop: topPred?.crop_name ?? '—',
      price: topPred?.price_max ?? 0,
      market: d.geo?.district ?? 'Regional',
    },
    nearby_market: { name: d.geo?.district ?? 'Nearby mandi', distance_km: 12 },
    best_selling_crop: {
      crop: topCrop?.crop_name ?? topPred?.crop_name ?? '—',
      volume_kg: topCrop?.available_kg ?? 0,
    },
    avg_agroelevate_price: aeAvg,
    avg_government_price: govAvg,
    difference_pct: Math.round(diff * 10) / 10,
    demand_score: demand?.demand_score ?? topPred?.demand_score ?? 0,
    supply_score: Math.max(0, 100 - (demand?.demand_score ?? 50)),
    weekly_trend: hist?.trend ?? topPred?.trend ?? 'stable',
    regional_trend: d.seasonal_analytics?.season ?? 'stable',
    last_updated: new Date().toISOString(),
  };
}

function deriveLivePrices(d: FarmerDashboard): LiveMarketPrice[] {
  const geo = d.geo;
  return (d.market_predictions || []).map((p) => ({
    crop: p.crop_name,
    market: geo?.district ?? 'Regional Mandi',
    district: geo?.district ?? '—',
    state: geo?.state ?? '—',
    modal_price: Math.round((p.price_min + p.price_max) / 2),
    min_price: p.price_min,
    max_price: p.price_max,
    arrival_quantity: `${p.trader_activity_kg ?? 0} kg`,
    date: new Date().toISOString().slice(0, 10),
    last_updated: new Date().toISOString(),
  }));
}

function deriveNearbyMarkets(
  d: FarmerDashboard,
  lat = 20.5937,
  lng = 78.9629,
): NearbyMarket[] {
  const geo = d.geo;
  return (d.market_predictions || []).slice(0, 8).map((p, i) => ({
    id: `m-${i}`,
    name: `${geo?.district ?? 'Regional'} Mandi`,
    crop: p.crop_name,
    price: Math.round((p.price_min + p.price_max) / 2),
    unit: 'kg',
    latitude: lat + (i - 4) * 0.05,
    longitude: lng + (i % 3) * 0.04,
    distance_km: 5 + i * 3,
    travel_time_min: 10 + i * 5,
    district: geo?.district ?? '—',
    state: geo?.state ?? '—',
  }));
}

function derivePriceComparison(d: FarmerDashboard, crop?: string): PriceComparisonData {
  const pred = d.market_predictions?.find((p) => !crop || p.crop_name === crop)
    ?? d.market_predictions?.[0];
  const ae = d.district_analytics?.avg_marketplace_price
    ?? (pred ? (pred.price_min + pred.price_max) / 2 : 0);
  const gov = pred ? (pred.price_min + pred.price_max) / 2 * 0.86 : ae * 0.86;
  const diff = gov > 0 ? ((ae - gov) / gov) * 100 : 0;
  const mk = (n: number, label: string): PriceComparisonPoint => ({
    period: label,
    agroelevate_avg: Math.round(ae * (1 + n * 0.02)),
    government_avg: Math.round(gov * (1 + n * 0.01)),
  });

  return {
    crop_name: pred?.crop_name ?? crop ?? 'All crops',
    agroelevate_avg: ae,
    government_avg: gov,
    difference_pct: Math.round(diff * 10) / 10,
    profit_difference: Math.round((ae - gov) * 100) / 100,
    expected_earnings: Math.round(ae * 400),
    percentage_gain: Math.round(diff * 10) / 10,
    weekly: ['W1', 'W2', 'W3', 'W4'].map((w, i) => mk(i, w)),
    monthly: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'].map((m, i) => mk(i, m)),
    yearly: ['Y1', 'Y2', 'Y3'].map((y, i) => mk(i + 1, y)),
  };
}

function deriveMsp(d: FarmerDashboard): MspEntry[] {
  return (d.market_predictions || []).map((p) => ({
    crop: p.crop_name,
    season: d.seasonal_analytics?.season ?? 'Kharif',
    msp_per_quintal: Math.round(p.price_min * 100),
    state: d.geo?.state ?? '—',
    effective_from: new Date().toISOString().slice(0, 10),
    last_updated: new Date().toISOString(),
  }));
}

function deriveForecasts(d: FarmerDashboard): ForecastEntry[] {
  const entries: ForecastEntry[] = [];
  for (const p of d.market_predictions || []) {
    entries.push({
      crop_name: p.crop_name,
      horizon: 'weekly',
      period_label: 'Next 7 days',
      predicted_price: Math.round((p.price_min + p.price_max) / 2),
      confidence: p.demand_confidence ?? 70,
      trend: p.trend,
    });
  }
  for (const f of d.income_forecasts || []) {
    entries.push({
      crop_name: 'Portfolio',
      horizon: 'yearly',
      period_label: String(f.forecast_year),
      predicted_price: f.projected_revenue,
      confidence: f.confidence_score,
      trend: f.growth_rate >= 0 ? 'rising' : 'falling',
    });
  }
  return entries;
}

function deriveCropPricing(d: FarmerDashboard, cropName: string): CropPricingAssistant {
  const pred = d.market_predictions?.find(
    (p) => p.crop_name.toLowerCase() === cropName.toLowerCase(),
  ) ?? d.market_predictions?.[0];
  const demand = d.demand_intelligence?.find(
    (x) => x.crop_name.toLowerCase() === cropName.toLowerCase(),
  );
  const mandi = pred ? (pred.price_min + pred.price_max) / 2 : 36;
  const district = d.district_analytics?.avg_marketplace_price ?? mandi;
  const state = mandi * 0.95;
  const ae = district * 1.08;
  const nearby = pred?.price_max ?? mandi * 1.08;
  const suggested = Math.round((ae + nearby) / 2);
  const reasons: string[] = [];
  if (pred) reasons.push(`Nearby mandi price ₹${Math.round(mandi)}/kg`);
  if (demand) {
    reasons.push(`Marketplace demand ${demand.demand_score > 70 ? 'High' : 'Moderate'}`);
    reasons.push(`District demand ${demand.demand_trend ?? 'stable'}`);
  }
  reasons.push(`Average AgroElevate sale ₹${Math.round(ae)}/kg`);
  if (pred) reasons.push(`Supply ${pred.demand_score > 60 ? 'Moderate' : 'High'}`);

  return {
    crop_name: cropName,
    todays_mandi_price: Math.round(mandi),
    district_average: Math.round(district),
    state_average: Math.round(state),
    agroelevate_average: Math.round(ae),
    nearby_highest_price: Math.round(nearby),
    suggested_price: suggested,
    confidence: pred?.demand_confidence ?? demand?.market_confidence ?? 85,
    expected_extra_profit: Math.max(0, suggested - mandi),
    recommendation: suggested >= ae ? 'Sell via AgroElevate' : 'Consider local mandi',
    unit: 'kg',
    reasons,
    _fallback: d._fallback,
  };
}

function deriveBenchmark(): ReferenceBenchmark {
  return {
    average_land_hectares: 1.34,
    average_production_kg_year: 4000,
    average_annual_income: 245000,
    income_per_kg: 61.25,
    label: 'Reference Benchmark',
    disclaimer: 'Illustrative Only — Not Personal Income',
  };
}

function deriveBenchmarkComparison(d: FarmerDashboard): BenchmarkComparison {
  const base = d.income_forecasts?.[0]?.baseline_revenue ?? 245000;
  const mk = (mult: number, y: number): BenchmarkProjectionYear => ({
    year: y,
    income: Math.round(base * mult * (1 + y * 0.05)),
    income_per_kg: Math.round((base * mult) / 4000),
    royalty: Math.round(base * 0.125 * y),
    direct_selling_gain: Math.round(base * 0.15 * y),
    waste_reduction: Math.round(base * 0.05 * y),
    market_linkage: Math.round(base * 0.08 * y),
  });

  return {
    without_agroelevate: [1, 2, 3].map((y) => mk(1, y)),
    with_agroelevate: [1, 2, 3].map((y) => mk(1.35, y)),
    disclaimer: 'Illustrative Projection — Based on benchmark assumptions',
  };
}

export async function fetchIntelligenceOverview(
  userId: string,
  location?: string,
): Promise<IntelligenceOverview> {
  const remote = await miFetchOrNull<IntelligenceOverview>(
    '/api/intelligence/overview',
    { user_id: userId, ...(location ? { location } : {}) },
  );
  if (remote) return remote;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveOverview(dash);
}

export async function fetchLiveMarketPrices(
  userId: string,
  location?: string,
): Promise<LiveMarketPrice[]> {
  const remote = await miFetchOrNull<{ prices: LiveMarketPrice[] }>(
    '/api/intelligence/market-prices',
    { user_id: userId, ...(location ? { location } : {}) },
  );
  if (remote?.prices?.length) return remote.prices;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveLivePrices(dash);
}

export async function fetchNearbyMarkets(
  userId: string,
  location?: string,
  lat?: number,
  lng?: number,
): Promise<NearbyMarket[]> {
  const params: Record<string, string> = { user_id: userId };
  if (location) params.location = location;
  if (lat != null) params.lat = String(lat);
  if (lng != null) params.lng = String(lng);
  const remote = await miFetchOrNull<{ markets: NearbyMarket[] }>(
    '/api/intelligence/nearby-markets',
    params,
  );
  if (remote?.markets?.length) return remote.markets;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveNearbyMarkets(dash, lat, lng);
}

export async function fetchPriceComparison(
  userId: string,
  crop?: string,
  location?: string,
): Promise<PriceComparisonData> {
  const params: Record<string, string> = { user_id: userId };
  if (crop) params.crop = crop;
  if (location) params.location = location;
  const remote = await miFetchOrNull<PriceComparisonData>(
    '/api/intelligence/price-comparison',
    params,
  );
  if (remote) return remote;
  const dash = await fetchFarmerDashboard(userId, location);
  return derivePriceComparison(dash, crop);
}

export async function fetchMspData(
  userId: string,
  location?: string,
): Promise<MspEntry[]> {
  const remote = await miFetchOrNull<{ entries: MspEntry[] }>(
    '/api/intelligence/msp',
    { user_id: userId, ...(location ? { location } : {}) },
  );
  if (remote?.entries?.length) return remote.entries;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveMsp(dash);
}

export async function fetchMarketForecasts(
  userId: string,
  location?: string,
): Promise<ForecastEntry[]> {
  const remote = await miFetchOrNull<{ forecasts: ForecastEntry[] }>(
    '/api/intelligence/forecast',
    { user_id: userId, ...(location ? { location } : {}) },
  );
  if (remote?.forecasts?.length) return remote.forecasts;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveForecasts(dash);
}

export async function fetchCropPricing(
  userId: string,
  cropName: string,
  location?: string,
): Promise<CropPricingAssistant> {
  const params: Record<string, string> = { user_id: userId, crop_name: cropName };
  if (location) params.location = location;
  const remote = await miFetchOrNull<CropPricingAssistant>(
    '/api/intelligence/crop-pricing',
    params,
  );
  if (remote) return remote;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveCropPricing(dash, cropName);
}

export async function fetchReferenceBenchmark(
  userId: string,
): Promise<ReferenceBenchmark> {
  const remote = await miFetchOrNull<ReferenceBenchmark>(
    '/api/intelligence/benchmark',
    { user_id: userId },
  );
  if (remote) return remote;
  return deriveBenchmark();
}

export async function fetchBenchmarkComparison(
  userId: string,
  location?: string,
): Promise<BenchmarkComparison> {
  const remote = await miFetchOrNull<BenchmarkComparison>(
    '/api/intelligence/benchmark-comparison',
    { user_id: userId, ...(location ? { location } : {}) },
  );
  if (remote) return remote;
  const dash = await fetchFarmerDashboard(userId, location);
  return deriveBenchmarkComparison(dash);
}

export async function fetchIntelligenceDashboard(
  userId: string,
  role: string,
  location?: string,
): Promise<FarmerDashboard | TraderDashboard | IndustrialistDashboard> {
  if (role === 'trader') return fetchTraderDashboard(userId);
  if (role === 'industrialist') return fetchIndustrialistDashboard(userId);
  return fetchFarmerDashboard(userId, location);
}
