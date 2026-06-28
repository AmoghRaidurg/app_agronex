import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, ViewStyle } from 'react-native';
import { useMiTheme } from '../../lib/intelligenceTheme';

export function ShimmerBox({
  width,
  height,
  style,
}: {
  width: number | `${number}%`;
  height: number;
  style?: ViewStyle;
}) {
  const { colors } = useMiTheme();
  const anim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.shimmer,
        { width, height, backgroundColor: colors.border, opacity: anim },
        style,
      ]}
    />
  );
}

export function ShimmerGrid({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.grid}>
      {Array.from({ length: count }).map((_, i) => (
        <ShimmerBox key={i} width="47%" height={100} style={styles.card} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  shimmer: { borderRadius: 12 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    padding: 16,
  },
  card: { marginBottom: 8 },
});
