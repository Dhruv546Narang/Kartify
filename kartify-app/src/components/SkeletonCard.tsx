/**
 * SkeletonCard — Animated loading placeholder.
 * Use while waiting for API responses instead of blank space.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet, type ViewStyle } from 'react-native';

interface SkeletonCardProps {
  width?: number;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

export default function SkeletonCard({
  width = 140,
  height = 172,
  borderRadius = 20,
  style,
}: SkeletonCardProps) {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: 'rgba(122,158,126,0.12)',
          opacity: anim,
        },
        style,
      ]}
    />
  );
}

/* ── Row skeleton (for deal-like horizontal cards) ── */
export function SkeletonRow({ style }: { style?: ViewStyle }) {
  const anim = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 0.75,
          duration: 750,
          useNativeDriver: true,
        }),
        Animated.timing(anim, {
          toValue: 0.35,
          duration: 750,
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [anim]);

  return (
    <Animated.View
      style={[
        styles.row,
        { opacity: anim },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: 88,
    borderRadius: 16,
    backgroundColor: 'rgba(122,158,126,0.10)',
    marginBottom: 10,
  },
});
