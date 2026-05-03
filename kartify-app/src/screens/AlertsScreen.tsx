import React, { useState, useCallback, useEffect } from 'react';
import {
  ActivityIndicator, FlatList, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View, Modal, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PLATFORM_STYLES } from '../components/PlatformBadge';
import client from '../api/client';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

interface PriceAlert {
  id: string;
  productName: string;
  brand: string;
  unit: string;
  currentPrice: number;
  targetPrice: number;
  lowestPlatform: string;
  status: 'active' | 'triggered' | 'expired';
  createdAt: string;
  triggeredAt?: string;
}

/* ═══════════════════════════════════════════════════════
   MOCK DATA (until backend endpoints are built)
   ═══════════════════════════════════════════════════════ */

const MOCK_ALERTS: PriceAlert[] = [
  {
    id: '1', productName: 'Amul Gold Full Cream Milk', brand: 'Amul',
    unit: '1 L', currentPrice: 66, targetPrice: 60, lowestPlatform: 'jiomart',
    status: 'active', createdAt: '2 days ago',
  },
  {
    id: '2', productName: 'Monster Energy Drink', brand: 'Monster',
    unit: '350 ml', currentPrice: 119, targetPrice: 125, lowestPlatform: 'blinkit',
    status: 'triggered', createdAt: '5 days ago', triggeredAt: '1 hour ago',
  },
  {
    id: '3', productName: 'Maggi 2-Minute Noodles', brand: 'Maggi',
    unit: '280 g', currentPrice: 42, targetPrice: 38, lowestPlatform: 'bigbasket',
    status: 'active', createdAt: '1 week ago',
  },
  {
    id: '4', productName: 'Britannia Bread', brand: 'Britannia',
    unit: '400 g', currentPrice: 42, targetPrice: 40, lowestPlatform: 'zepto',
    status: 'expired', createdAt: '2 weeks ago',
  },
];

const PRICE_DROPS = [
  { id: 'pd1', name: 'Tata Salt', unit: '1 kg', oldPrice: 28, newPrice: 24, platform: 'bigbasket', dropPct: '14%' },
  { id: 'pd2', name: 'Lay\'s Classic Salted', unit: '52 g', oldPrice: 20, newPrice: 17, platform: 'zepto', dropPct: '15%' },
  { id: 'pd3', name: 'Nescafé Classic', unit: '50 g', oldPrice: 165, newPrice: 149, platform: 'blinkit', dropPct: '10%' },
  { id: 'pd4', name: 'Surf Excel Easy Wash', unit: '1 kg', oldPrice: 125, newPrice: 110, platform: 'jiomart', dropPct: '12%' },
];

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatINR(v: number) { return `₹${Math.round(v).toLocaleString('en-IN')}`; }

function getStatusConfig(status: PriceAlert['status']) {
  switch (status) {
    case 'triggered': return { label: '🎉 Price Dropped!', color: '#4F7A55', bg: 'rgba(79,122,85,0.12)' };
    case 'expired': return { label: 'Expired', color: '#7A8C7B', bg: 'rgba(122,140,123,0.08)' };
    default: return { label: '👁 Watching', color: '#C4855A', bg: 'rgba(196,133,90,0.12)' };
  }
}

/* ═══════════════════════════════════════════════════════
   ALERT CARD
   ═══════════════════════════════════════════════════════ */

function AlertCard({ alert, onPress }: { alert: PriceAlert; onPress: () => void }) {
  const statusCfg = getStatusConfig(alert.status);
  const ps = PLATFORM_STYLES[alert.lowestPlatform?.toLowerCase()] || { bg: '#888' };
  const progress = alert.targetPrice > 0
    ? Math.min(100, Math.max(0, ((alert.currentPrice - alert.targetPrice) / alert.currentPrice) * 100))
    : 0;
  const isClose = alert.currentPrice - alert.targetPrice <= 5;

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [styles.alertCard, alert.status === 'triggered' && styles.alertCardTriggered, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {/* Status badge */}
      <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
        <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
      </View>

      {/* Product info */}
      <View style={styles.alertContent}>
        <View style={{ flex: 1 }}>
          <Text style={styles.alertProductName} numberOfLines={2}>{alert.productName}</Text>
          <Text style={styles.alertUnit}>{alert.unit} • {alert.brand}</Text>
        </View>
        <View style={styles.alertPriceCol}>
          <Text style={styles.alertCurrentPrice}>{formatINR(alert.currentPrice)}</Text>
          <Text style={styles.alertPriceLabel}>current</Text>
        </View>
      </View>

      {/* Target price bar */}
      <View style={styles.targetRow}>
        <View style={styles.targetBarBg}>
          <View style={[styles.targetBarFill, {
            width: `${100 - progress}%`,
            backgroundColor: alert.status === 'triggered' ? '#4F7A55' : isClose ? '#C4855A' : '#7A9E7E',
          }]} />
        </View>
        <Text style={styles.targetLabel}>Target: {formatINR(alert.targetPrice)}</Text>
      </View>

      {/* Bottom row */}
      <View style={styles.alertFooter}>
        <View style={[styles.platformDot, { backgroundColor: ps.bg }]} />
        <Text style={styles.alertFooterText}>Cheapest on {alert.lowestPlatform}</Text>
        <Text style={styles.alertFooterTime}>{alert.triggeredAt || alert.createdAt}</Text>
      </View>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════
   PRICE DROP CARD
   ═══════════════════════════════════════════════════════ */

function PriceDropCard({ item, onPress }: { item: typeof PRICE_DROPS[0]; onPress: () => void }) {
  const ps = PLATFORM_STYLES[item.platform?.toLowerCase()] || { bg: '#888' };
  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [styles.dropCard, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
      <View style={styles.dropBadge}>
        <Text style={styles.dropBadgeText}>↓ {item.dropPct}</Text>
      </View>
      <View style={styles.dropContent}>
        <Text style={styles.dropName} numberOfLines={1}>{item.name}</Text>
        <Text style={styles.dropUnit}>{item.unit}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
          <Text style={styles.dropOldPrice}>{formatINR(item.oldPrice)}</Text>
          <Text style={styles.dropNewPrice}>{formatINR(item.newPrice)}</Text>
        </View>
      </View>
      <View style={[styles.dropPlatformDot, { backgroundColor: ps.bg }]} />
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════ */

type FilterType = 'all' | 'active' | 'triggered' | 'expired';

export default function AlertsScreen({ navigation }: { navigation: any }) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await client.get('/alerts');
      if (res.data?.alerts) {
        setAlerts(res.data.alerts.map((a: any) => ({
          id: a.id,
          productName: a.product_name,
          brand: a.brand || '',
          unit: a.unit || '',
          currentPrice: a.current_price || a.target_price, // fallback
          targetPrice: a.target_price,
          lowestPlatform: a.platform || 'Unknown',
          status: a.status,
          createdAt: new Date(a.created_at).toLocaleDateString(),
        })));
      }
    } catch (e) {
      console.warn('Failed to fetch alerts', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAlerts();
  }, [fetchAlerts]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAlerts();
  };

  const filteredAlerts = alerts.filter(a => filter === 'all' || a.status === filter);
  const activeCount = alerts.filter(a => a.status === 'active').length;
  const triggeredCount = alerts.filter(a => a.status === 'triggered').length;

  const filters: { key: FilterType; label: string; count?: number }[] = [
    { key: 'all', label: 'All', count: alerts.length },
    { key: 'active', label: 'Watching', count: activeCount },
    { key: 'triggered', label: 'Dropped', count: triggeredCount },
    { key: 'expired', label: 'Expired' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={{ paddingBottom: 120 }} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F7A55" />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.headerTitle}>Price Alerts</Text>
            <Text style={styles.headerSubtitle}>Track prices, buy at the right time</Text>
          </View>
          <Pressable onPress={() => navigation.navigate('SearchTab')}
            style={({ pressed }) => [styles.addButton, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="add" size={22} color="#fff" />
          </Pressable>
        </View>

        {/* Stats Banner */}
        <LinearGradient colors={['#4F7A55', '#7A9E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.statsBanner}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{activeCount}</Text>
            <Text style={styles.statLabel}>Tracking</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>{triggeredCount}</Text>
            <Text style={styles.statLabel}>Dropped</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNum}>₹47</Text>
            <Text style={styles.statLabel}>Saved</Text>
          </View>
        </LinearGradient>

        {/* Today's Drops */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Today's Price Drops 🔥</Text>
        </View>
        <FlatList
          data={PRICE_DROPS}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
          keyExtractor={i => i.id}
          renderItem={({ item }) => (
            <PriceDropCard item={item} onPress={() => navigation.navigate('SearchTab', { autoFocus: true })} />
          )}
        />

        {/* Filter chips */}
        <View style={styles.filterRow}>
          {filters.map(f => (
            <Pressable key={f.key} onPress={() => setFilter(f.key)}
              style={({ pressed }) => [styles.filterChip, filter === f.key && styles.filterChipActive, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}{f.count !== undefined ? ` (${f.count})` : ''}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Alert Cards */}
        <View style={{ paddingHorizontal: 16 }}>
          {loading ? (
             <ActivityIndicator size="large" color="#4F7A55" style={{ marginTop: 40 }} />
          ) : filteredAlerts.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48 }}>🔔</Text>
              <Text style={styles.emptyTitle}>No alerts yet</Text>
              <Text style={styles.emptySubtitle}>Search for a product and tap "Set Alert" to track its price</Text>
              <Pressable onPress={() => navigation.navigate('SearchTab', { autoFocus: true })}
                style={({ pressed }) => [styles.emptyButton, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                <Text style={styles.emptyButtonText}>Search Products</Text>
              </Pressable>
            </View>
          ) : (
            filteredAlerts.map(alert => (
              <AlertCard key={alert.id} alert={alert} onPress={() => {}} />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },
  scroll: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#2C3E2D' },
  headerSubtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B', marginTop: 2 },
  addButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#7A9E7E', alignItems: 'center', justifyContent: 'center', shadowColor: '#4F7A55', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.25, shadowRadius: 12, elevation: 6 },

  // Stats banner
  statsBanner: { marginHorizontal: 16, marginTop: 12, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: '#fff' },
  statLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  // Section
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },

  // Price Drop Cards
  dropCard: { width: 150, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 12, position: 'relative' },
  dropBadge: { position: 'absolute', top: 8, right: 8, backgroundColor: '#4F7A55', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  dropBadgeText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 10 },
  dropContent: { marginTop: 4 },
  dropName: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#2C3E2D' },
  dropUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B', marginTop: 2 },
  dropOldPrice: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#7A8C7B', textDecorationLine: 'line-through' },
  dropNewPrice: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#4F7A55' },
  dropPlatformDot: { position: 'absolute', bottom: 8, right: 8, width: 8, height: 8, borderRadius: 4 },

  // Filter chips
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 20, marginBottom: 14 },
  filterChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  filterChipActive: { backgroundColor: '#4F7A55', borderColor: '#4F7A55' },
  filterText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B' },
  filterTextActive: { color: '#fff' },

  // Alert Cards
  alertCard: { borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', padding: 16, marginBottom: 12 },
  alertCardTriggered: { borderColor: 'rgba(79,122,85,0.4)', backgroundColor: 'rgba(79,122,85,0.06)' },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, marginBottom: 10 },
  statusText: { fontFamily: 'Nunito_700Bold', fontSize: 12 },
  alertContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  alertProductName: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#2C3E2D', lineHeight: 20 },
  alertUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 4 },
  alertPriceCol: { alignItems: 'flex-end' },
  alertCurrentPrice: { fontFamily: 'Nunito_700Bold', fontSize: 20, color: '#4F7A55' },
  alertPriceLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 10, color: '#7A8C7B', marginTop: 1 },

  // Target bar
  targetRow: { marginTop: 14, gap: 6 },
  targetBarBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(122,158,126,0.12)', overflow: 'hidden' },
  targetBarFill: { height: '100%', borderRadius: 3 },
  targetLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B' },

  // Footer
  alertFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 6 },
  platformDot: { width: 8, height: 8, borderRadius: 4 },
  alertFooterText: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B', flex: 1, textTransform: 'capitalize' },
  alertFooterTime: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: '#7A8C7B' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#2C3E2D', marginTop: 12 },
  emptySubtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B', textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },
  emptyButton: { marginTop: 20, height: 44, borderRadius: 22, backgroundColor: '#7A9E7E', paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  emptyButtonText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
});
