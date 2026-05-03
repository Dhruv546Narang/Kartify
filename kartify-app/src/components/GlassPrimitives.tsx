import React from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

interface GlassInputProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
}

interface ScalePressableProps extends Omit<PressableProps, 'style'> {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  activeStyle?: StyleProp<ViewStyle>;
}

const SHADOW = {
  shadowColor: '#2C3E2D',
  shadowOffset: { width: 0, height: 10 } as const,
  shadowOpacity: 0.08,
  shadowRadius: 18,
  elevation: 8,
};

export function GlassCard({ children, style, intensity = 40 }: GlassCardProps) {
  return (
    <View style={[styles.cardBase, SHADOW, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function GlassInput({ children, style, intensity = 30 }: GlassInputProps) {
  return (
    <View style={[styles.inputBase, SHADOW, style]}>
      <BlurView intensity={intensity} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

export function ScalePressable({ children, style, activeStyle, ...props }: ScalePressableProps) {
  const scale = useSharedValue(1);
  const [isPressed, setIsPressed] = React.useState(false);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      {...props}
      onPressIn={(e) => {
        scale.value = withSpring(0.96, { damping: 16, stiffness: 260 });
        setIsPressed(true);
        props.onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.value = withSpring(1, { damping: 16, stiffness: 260 });
        setIsPressed(false);
        props.onPressOut?.(e);
      }}
    >
      <Animated.View style={[style, animatedStyle, isPressed ? activeStyle : null]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export const GlassTokens = {
  colors: {
    bg: '#F0F4EF',
    surface: '#E8EFE6',
    primary: '#7A9E7E',
    primaryDark: '#4F7A55',
    accent: '#C4855A',
    accentLight: '#E8C4A8',
    textPrimary: '#2C3E2D',
    textMuted: '#7A8C7B',
    white10: 'rgba(255,255,255,0.10)',
    white15: 'rgba(255,255,255,0.15)',
    white20: 'rgba(255,255,255,0.20)',
    white30: 'rgba(255,255,255,0.30)',
    white40: 'rgba(255,255,255,0.40)',
    borderGlass: 'rgba(255,255,255,0.28)',
  },
  badges: {
    blinkit: { bg: '#F5C842', text: '#5A4200' },
    zepto: { bg: '#8B5CF6', text: '#FFFFFF' },
    instamart: { bg: '#FF6B35', text: '#FFFFFF' },
    bigbasket: { bg: '#89C73A', text: '#FFFFFF' },
    jiomart: { bg: '#0066CC', text: '#FFFFFF' },
  },
} as const;

const styles = StyleSheet.create({
  cardBase: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  inputBase: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  content: {
    zIndex: 1,
  },
});
