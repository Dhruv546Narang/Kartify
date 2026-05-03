import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import client from '../api/client';
import { GlassCard, GlassTokens, ScalePressable } from '../components/GlassPrimitives';

interface HistoryEntry {
  id: string;
  user_id: string;
  query: string;
  searched_at: string | null;
}

interface HistoryResponse {
  entries: HistoryEntry[];
  total: number;
}

interface DateGroup {
  dateLabel: string;
  items: HistoryEntry[];
}

function relativeTime(timestamp: string | null): string {
  if (!timestamp) return 'Unknown time';
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'Unknown time';
  const diffMins = Math.floor((Date.now() - parsed.getTime()) / 60000);
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function dateHeader(timestamp: string | null): string {
  if (!timestamp) return 'Unknown';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segment, setSegment] = useState<'searches' | 'orders'>('searches');

  const fetchHistory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await client.get<HistoryResponse>('/history');
      setEntries(response.data.entries || []);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to fetch search history.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory().catch(() => undefined);
  }, []);

  const groupedSearches = useMemo<DateGroup[]>(() => {
    const grouped = new Map<string, HistoryEntry[]>();
    for (const entry of entries) {
      const key = dateHeader(entry.searched_at);
      grouped.set(key, [...(grouped.get(key) || []), entry]);
    }
    return [...grouped.entries()].map(([dateLabel, items]) => ({ dateLabel, items }));
  }, [entries]);

  const orderRows = useMemo(
    () =>
      entries.slice(0, 8).map((entry, index) => ({
        id: `order-${entry.id}`,
        title: `Order #KTY-${(1040 + index).toString()}`,
        subtitle: `${entry.query} • 2 items`,
        total: `₹${(180 + index * 24).toLocaleString('en-IN')}`,
        date: relativeTime(entry.searched_at),
      })),
    [entries]
  );

  const clearHistory = () => {
    Alert.alert('Clear History', 'Delete your full search history?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.delete('/history');
            setEntries([]);
          } catch (e: unknown) {
            const message = e instanceof Error ? e.message : 'Could not clear history.';
            setError(message);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>History</Text>
          {entries.length > 0 ? (
            <ScalePressable style={styles.clearWrap} activeStyle={styles.pressActive} onPress={clearHistory}>
              <Text style={styles.clearText}>Clear all</Text>
            </ScalePressable>
          ) : null}
        </View>

        <GlassCard style={styles.segmentShell} intensity={40}>
          <View style={styles.segmentTrack}>
            <ScalePressable
              style={[styles.segmentPill, segment === 'searches' && styles.segmentPillActive]}
              activeStyle={styles.pressActive}
              onPress={() => setSegment('searches')}
            >
              <Text style={[styles.segmentText, segment === 'searches' && styles.segmentTextActive]}>Searches</Text>
            </ScalePressable>
            <ScalePressable
              style={[styles.segmentPill, segment === 'orders' && styles.segmentPillActive]}
              activeStyle={styles.pressActive}
              onPress={() => setSegment('orders')}
            >
              <Text style={[styles.segmentText, segment === 'orders' && styles.segmentTextActive]}>Orders</Text>
            </ScalePressable>
          </View>
        </GlassCard>

        {error ? (
          <GlassCard style={styles.errorCard} intensity={40}>
            <Text style={styles.errorText}>{error}</Text>
          </GlassCard>
        ) : null}

        {isLoading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator size="large" color={GlassTokens.colors.primaryDark} />
          </View>
        ) : segment === 'searches' ? (
          <FlatList
            data={groupedSearches}
            keyExtractor={(item) => item.dateLabel}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <View style={styles.groupBlock}>
                <Text style={styles.groupLabel}>{item.dateLabel}</Text>
                <GlassCard style={styles.groupCard} intensity={40}>
                  {item.items.map((entry, index) => (
                    <View key={entry.id} style={[styles.searchRow, index < item.items.length - 1 && styles.rowDivider]}>
                      <View style={styles.searchLeft}>
                        <Ionicons name="search-outline" size={18} color={GlassTokens.colors.primary} />
                        <View>
                          <Text style={styles.searchQuery}>{entry.query}</Text>
                          <Text style={styles.searchTime}>{relativeTime(entry.searched_at)}</Text>
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={GlassTokens.colors.textMuted} />
                    </View>
                  ))}
                </GlassCard>
              </View>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>📜</Text>
                <Text style={styles.emptyTitle}>No search history</Text>
                <Text style={styles.emptyBody}>Your recent searches will appear here.</Text>
                <ScalePressable style={styles.emptyCta} activeStyle={styles.pressActive} onPress={fetchHistory}>
                  <Text style={styles.emptyCtaText}>Refresh</Text>
                </ScalePressable>
              </View>
            }
          />
        ) : (
          <FlatList
            data={orderRows}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
            renderItem={({ item }) => (
              <GlassCard style={styles.orderRow} intensity={40}>
                <View style={styles.orderLeft}>
                  <Ionicons name="bag-handle-outline" size={20} color={GlassTokens.colors.primary} />
                  <View>
                    <Text style={styles.orderTitle}>{item.title}</Text>
                    <Text style={styles.orderSubtitle}>{item.subtitle}</Text>
                  </View>
                </View>
                <View style={styles.orderRight}>
                  <Text style={styles.orderTotal}>{item.total}</Text>
                  <Text style={styles.orderDate}>{item.date}</Text>
                </View>
              </GlassCard>
            )}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyEmoji}>🛒</Text>
                <Text style={styles.emptyTitle}>No orders yet</Text>
                <Text style={styles.emptyBody}>Past orders will appear in this section.</Text>
              </View>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: GlassTokens.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: GlassTokens.colors.bg,
    paddingHorizontal: 16,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: GlassTokens.colors.textPrimary,
  },
  clearWrap: {
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: GlassTokens.colors.white20,
  },
  clearText: {
    color: GlassTokens.colors.accent,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
  },
  segmentShell: {
    marginTop: 10,
    padding: 4,
    borderRadius: 22,
  },
  segmentTrack: {
    flexDirection: 'row',
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    gap: 4,
  },
  segmentPill: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  segmentPillActive: {
    backgroundColor: 'rgba(122,158,126,0.85)',
    shadowColor: '#4F7A55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 10,
  },
  segmentText: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: GlassTokens.colors.textMuted,
  },
  segmentTextActive: {
    color: '#FFFFFF',
  },
  errorCard: {
    marginTop: 10,
    padding: 14,
  },
  errorText: {
    color: '#C0614A',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  loadingState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingTop: 12,
    paddingBottom: 100,
  },
  groupBlock: {
    marginBottom: 12,
  },
  groupLabel: {
    marginBottom: 6,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 12,
    color: GlassTokens.colors.textMuted,
  },
  groupCard: {
    padding: 0,
  },
  searchRow: {
    height: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  searchLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchQuery: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: GlassTokens.colors.textPrimary,
  },
  searchTime: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: GlassTokens.colors.textMuted,
  },
  orderRow: {
    height: 72,
    marginBottom: 10,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  orderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  orderTitle: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: GlassTokens.colors.textPrimary,
  },
  orderSubtitle: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 12,
    color: GlassTokens.colors.textMuted,
  },
  orderRight: {
    alignItems: 'flex-end',
  },
  orderTotal: {
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
    color: GlassTokens.colors.primaryDark,
  },
  orderDate: {
    marginTop: 2,
    fontFamily: 'Nunito_400Regular',
    fontSize: 11,
    color: GlassTokens.colors.textMuted,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 56,
  },
  emptyEmoji: {
    fontSize: 64,
  },
  emptyTitle: {
    marginTop: 10,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18,
    color: GlassTokens.colors.textPrimary,
  },
  emptyBody: {
    marginTop: 6,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: GlassTokens.colors.textMuted,
    textAlign: 'center',
  },
  emptyCta: {
    marginTop: 12,
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(122,158,126,0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  emptyCtaText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 14,
  },
  pressActive: {
    shadowColor: '#4F7A55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
});
