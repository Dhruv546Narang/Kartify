/**
 * PlatformBadge — Shared badge component for quick-commerce platform names.
 * Used across HomeScreen, SearchScreen, CartScreen, HistoryScreen.
 */
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const PLATFORM_STYLES: Record<string, { bg: string; text: string }> = {
  blinkit:   { bg: '#F5C842', text: '#5A4200' },
  zepto:     { bg: '#8B5CF6', text: '#FFFFFF' },
  instamart: { bg: '#FF6B35', text: '#FFFFFF' },
  bigbasket: { bg: '#89C73A', text: '#FFFFFF' },
  jiomart:   { bg: '#0066CC', text: '#FFFFFF' },
};

interface PlatformBadgeProps {
  platform: string;
  /** compact renders a smaller pill (default false) */
  compact?: boolean;
}

export default function PlatformBadge({ platform, compact }: PlatformBadgeProps) {
  const key = platform?.toLowerCase().replace(/\s+/g, '') ?? '';
  const style = PLATFORM_STYLES[key] || { bg: '#888', text: '#fff' };

  return (
    <View style={[styles.badge, { backgroundColor: style.bg }, compact && styles.compact]}>
      <Text style={[styles.label, { color: style.text }, compact && styles.compactLabel]}>
        {platform}
      </Text>
    </View>
  );
}

export { PLATFORM_STYLES };

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    alignSelf: 'flex-start',
  },
  compact: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  label: {
    fontSize: 10,
    fontFamily: 'Nunito_700Bold',
    textTransform: 'capitalize',
  },
  compactLabel: {
    fontSize: 9,
  },
});
