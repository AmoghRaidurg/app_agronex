import type { ProductCommerceMeta } from './commerceMeta';

/** Canonical marketplace filter chips (display order). */
export const MARKETPLACE_CATEGORIES = [
  'All',
  'Vegetables',
  'Fruits',
  'Grains',
  'Dairy',
  'Spices',
  'Pulses',
  'Raw Materials',
  'Processed',
  'Resale',
] as const;

export type MarketplaceCategory = (typeof MARKETPLACE_CATEGORIES)[number];

const VEGETABLES = new Set([
  'vegetable',
  'vegetables',
  'potato',
  'potatoes',
  'tomato',
  'tomatoes',
  'onion',
  'onions',
  'carrot',
  'carrots',
  'cabbage',
  'spinach',
  'cauliflower',
  'brinjal',
  'chilli',
  'chili',
  'pepper',
  'cucumber',
]);

const FRUITS = new Set([
  'fruit',
  'fruits',
  'mango',
  'mangoes',
  'banana',
  'bananas',
  'apple',
  'apples',
  'grape',
  'grapes',
  'orange',
  'oranges',
  'papaya',
  'watermelon',
]);

const GRAINS = new Set([
  'grain',
  'grains',
  'wheat',
  'rice',
  'paddy',
  'maize',
  'corn',
  'barley',
  'millet',
  'bajra',
  'jowar',
  'ragi',
]);

const DAIRY = new Set(['dairy', 'milk', 'ghee', 'butter', 'cheese', 'curd', 'yogurt']);
const SPICES = new Set([
  'spice',
  'spices',
  'turmeric',
  'chilli powder',
  'cumin',
  'coriander',
  'pepper',
  'cardamom',
]);
const PULSES = new Set([
  'pulse',
  'pulses',
  'dal',
  'lentil',
  'lentils',
  'chickpea',
  'moong',
  'urad',
  'toor',
  'bean',
  'beans',
]);

function tokenize(cropType: string): string[] {
  return cropType
    .toLowerCase()
    .split(/[\s,/|_-]+/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/** Map production crop_type + commerce meta to a canonical filter category. */
export function resolveProductCategory(
  cropType: string | null | undefined,
  meta?: Partial<ProductCommerceMeta> | null,
  isRelisted?: boolean,
): MarketplaceCategory | 'General' {
  if (isRelisted || meta?.product_kind === 'trader_relist') return 'Resale';
  if (meta?.product_kind === 'processed') return 'Processed';

  const raw = (cropType ?? '').trim();
  if (!raw) return 'General';

  const lower = raw.toLowerCase();
  const tokens = tokenize(raw);

  if (lower === 'raw' || lower === 'raw materials' || lower === 'raw material') {
    return 'Raw Materials';
  }
  if (lower === 'processed') return 'Processed';
  if (lower === 'general') return 'General';

  const inSet = (set: Set<string>) =>
    tokens.some((t) => set.has(t)) || set.has(lower);

  if (inSet(VEGETABLES)) return 'Vegetables';
  if (inSet(FRUITS)) return 'Fruits';
  if (inSet(GRAINS)) return 'Grains';
  if (inSet(DAIRY)) return 'Dairy';
  if (inSet(SPICES)) return 'Spices';
  if (inSet(PULSES)) return 'Pulses';

  // Title-case singular match (e.g. "Vegetable" from production)
  const title = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  if (title === 'Vegetable') return 'Vegetables';
  if (title === 'Fruit') return 'Fruits';
  if (title === 'Grain') return 'Grains';

  return 'General';
}

export function matchesMarketplaceCategory(
  cropType: string | null | undefined,
  meta: Partial<ProductCommerceMeta> | null | undefined,
  isRelisted: boolean,
  selected: MarketplaceCategory,
): boolean {
  if (selected === 'All') return true;
  const resolved = resolveProductCategory(cropType, meta, isRelisted);
  if (selected === 'Resale') return resolved === 'Resale';
  if (selected === 'Raw Materials') {
    return resolved === 'Raw Materials' || resolved === 'General';
  }
  return resolved === selected;
}
