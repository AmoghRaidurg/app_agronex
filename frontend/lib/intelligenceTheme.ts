import { useColorScheme } from 'react-native';

export const MI_COLORS = {
  primary: '#16a34a',
  primaryDark: '#15803d',
  background: '#f9fafb',
  card: '#ffffff',
  text: '#1f2937',
  textMuted: '#6b7280',
  border: '#e5e7eb',
  error: '#b91c1c',
  errorBg: '#fef2f2',
  blue: '#3b82f6',
  amber: '#f59e0b',
  purple: '#8b5cf6',
};

export const MI_DARK = {
  background: '#111827',
  card: '#1f2937',
  text: '#f9fafb',
  textMuted: '#9ca3af',
  border: '#374151',
};

export function useMiTheme() {
  const scheme = useColorScheme();
  const dark = scheme === 'dark';
  return {
    dark,
    colors: dark
      ? { ...MI_COLORS, ...MI_DARK }
      : MI_COLORS,
  };
}
