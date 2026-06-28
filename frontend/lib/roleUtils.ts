/** Normalize production DB role strings to app roles (no DB migration). */

export type AppRole = 'farmer' | 'trader' | 'customer' | 'industrialist' | 'admin';

const TRADER_DB_ROLES = new Set(['trader', 'middleman', 'middlemen']);

export function isTraderDbRole(role: string | null | undefined): boolean {
  return TRADER_DB_ROLES.has((role ?? '').toLowerCase());
}

/** Map DB role → app routing role. */
export function normalizeAppRole(role: string | null | undefined): string {
  const value = (role ?? '').toLowerCase();
  if (TRADER_DB_ROLES.has(value)) return 'trader';
  return value || 'farmer';
}

/** Human-readable label for UI. */
export function displayRoleLabel(role: string | null | undefined): string {
  if (isTraderDbRole(role)) return 'Trader';
  const value = role ?? '';
  if (!value) return '—';
  return value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();
}

export function isSellerRole(role: string | null | undefined): boolean {
  const normalized = normalizeAppRole(role);
  return normalized === 'farmer' || normalized === 'trader' || normalized === 'industrialist';
}

/** Admin filter chip value vs profiles.role */
export function matchesAdminRoleFilter(
  profileRole: string,
  filter: string,
): boolean {
  if (filter === 'All') return true;
  if (filter === 'trader') return isTraderDbRole(profileRole);
  return profileRole.toLowerCase() === filter.toLowerCase();
}

export function countTradersInProfiles(
  profiles: Array<{ role: string }>,
): number {
  return profiles.filter((p) => isTraderDbRole(p.role)).length;
}
