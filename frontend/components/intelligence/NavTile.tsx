import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMiTheme } from '../../lib/intelligenceTheme';

interface Props {
  title: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
  color?: string;
}

export function NavTile({ title, description, icon, route, color }: Props) {
  const router = useRouter();
  const { colors } = useMiTheme();
  const accent = color ?? colors.primary;

  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push(route as never)}
      activeOpacity={0.7}
    >
      <View style={[styles.icon, { backgroundColor: accent + '20' }]}>
        <Ionicons name={icon} size={24} color={accent} />
      </View>
      <View style={styles.text}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>{description}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tile: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    gap: 12,
  },
  icon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: { flex: 1 },
  title: { fontSize: 16, fontWeight: '600' },
  desc: { fontSize: 13, marginTop: 2 },
});
