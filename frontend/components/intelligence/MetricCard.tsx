import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useMiTheme } from '../../lib/intelligenceTheme';

interface Props {
  label: string;
  value: string;
  icon?: keyof typeof Ionicons.glyphMap;
  accent?: string;
  delay?: number;
}

export function MetricCard({ label, value, icon = 'stats-chart', accent, delay = 0 }: Props) {
  const { colors } = useMiTheme();
  const scale = useRef(new Animated.Value(0.92)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, delay, useNativeDriver: true, friction: 6 }),
      Animated.timing(opacity, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
    ]).start();
  }, [scale, opacity, delay]);

  return (
    <Animated.View
      style={[
        styles.card,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          transform: [{ scale }],
          opacity,
        },
      ]}
    >
      <View style={[styles.iconWrap, { backgroundColor: (accent ?? colors.primary) + '18' }]}>
        <Ionicons name={icon} size={20} color={accent ?? colors.primary} />
      </View>
      <Text style={[styles.value, { color: colors.text }]} numberOfLines={1}>
        {value}
      </Text>
      <Text style={[styles.label, { color: colors.textMuted }]} numberOfLines={2}>
        {label}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '47%',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  value: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  label: { fontSize: 12, lineHeight: 16 },
});
