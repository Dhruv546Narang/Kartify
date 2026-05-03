import React, { useMemo, useState } from 'react';
import {
  Dimensions, Pressable, ScrollView, StatusBar, StyleSheet,
  Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PLATFORM_STYLES } from '../components/PlatformBadge';

const SCREEN_W = Dimensions.get('window').width;

/* ═══════════════════════════════════════════════════════
   MOCK DATA (until backend spending endpoints exist)
   ═══════════════════════════════════════════════════════ */

const MONTHLY_SPEND = [
  { month: 'Jan', amount: 3200 },
  { month: 'Feb', amount: 2800 },
  { month: 'Mar', amount: 3600 },
  { month: 'Apr', amount: 4100 },
  { month: 'May', amount: 2400 },
];

const PLATFORM_SPEND = [
  { platform: 'blinkit', name: 'Blinkit', amount: 4250, percentage: 35, orders: 12 },
  { platform: 'zepto', name: 'Zepto', amount: 3100, percentage: 25, orders: 9 },
  { platform: 'instamart', name: 'Instamart', amount: 2700, percentage: 22, orders: 7 },
  { platform: 'bigbasket', name: 'BigBasket', amount: 1400, percentage: 12, orders: 4 },
  { platform: 'jiomart', name: 'JioMart', amount: 750, percentage: 6, orders: 2 },
];

const SAVINGS_HISTORY = [
  { id: '1', product: 'Amul Gold Milk 1L', savedAmount: 4, cheapest: 'jiomart', expensive: 'instamart', date: 'Today' },
  { id: '2', product: 'Maggi 2-Min 280g', savedAmount: 8, cheapest: 'bigbasket', expensive: 'blinkit', date: 'Today' },
  { id: '3', product: 'Monster Energy 350ml', savedAmount: 12, cheapest: 'blinkit', expensive: 'instamart', date: 'Yesterday' },
  { id: '4', product: 'Lay\'s Classic 52g', savedAmount: 3, cheapest: 'zepto', expensive: 'jiomart', date: 'Yesterday' },
  { id: '5', product: 'Tata Salt 1kg', savedAmount: 5, cheapest: 'bigbasket', expensive: 'zepto', date: '2 days ago' },
  { id: '6', product: 'Surf Excel 1kg', savedAmount: 15, cheapest: 'jiomart', expensive: 'blinkit', date: '3 days ago' },
];

/* ═══════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════ */

function formatINR(v: number) { return `₹${Math.round(v).toLocaleString('en-IN')}`; }

/* ═══════════════════════════════════════════════════════
   MINI BAR CHART
   ═══════════════════════════════════════════════════════ */

function SpendChart({ data }: { data: typeof MONTHLY_SPEND }) {
  const maxAmount = Math.max(...data.map(d => d.amount));
  const barWidth = (SCREEN_W - 80) / data.length;

  return (
    <View style={styles.chartContainer}>
      <View style={styles.chartBars}>
        {data.map((item, idx) => {
          const height = (item.amount / maxAmount) * 100;
          const isLast = idx === data.length - 1;
          return (
            <View key={item.month} style={[styles.chartBarCol, { width: barWidth }]}>
              <Text style={styles.chartBarValue}>{formatINR(item.amount)}</Text>
              <View style={[styles.chartBar, {
                height,
                backgroundColor: isLast ? '#4F7A55' : 'rgba(122,158,126,0.25)',
                borderColor: isLast ? '#4F7A55' : 'rgba(122,158,126,0.15)',
              }]} />
              <Text style={[styles.chartBarLabel, isLast && { color: '#4F7A55', fontFamily: 'Nunito_700Bold' }]}>{item.month}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   PLATFORM SPEND BREAKDOWN
   ═══════════════════════════════════════════════════════ */

function PlatformSpendCard({ item }: { item: typeof PLATFORM_SPEND[0] }) {
  const ps = PLATFORM_STYLES[item.platform?.toLowerCase()] || { bg: '#888', text: '#fff' };
  return (
    <View style={styles.platSpendCard}>
      <View style={styles.platSpendHeader}>
        <View style={[styles.platSpendDot, { backgroundColor: ps.bg }]} />
        <Text style={styles.platSpendName}>{item.name}</Text>
        <Text style={styles.platSpendPct}>{item.percentage}%</Text>
      </View>
      <View style={styles.platSpendBarBg}>
        <View style={[styles.platSpendBarFill, { width: `${item.percentage}%`, backgroundColor: ps.bg }]} />
      </View>
      <View style={styles.platSpendFooter}>
        <Text style={styles.platSpendAmount}>{formatINR(item.amount)}</Text>
        <Text style={styles.platSpendOrders}>{item.orders} orders</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   SAVINGS ITEM
   ═══════════════════════════════════════════════════════ */

function SavingsItem({ item }: { item: typeof SAVINGS_HISTORY[0] }) {
  const cheapestPs = PLATFORM_STYLES[item.cheapest?.toLowerCase()] || { bg: '#888' };
  const expensivePs = PLATFORM_STYLES[item.expensive?.toLowerCase()] || { bg: '#888' };
  return (
    <View style={styles.savingsItem}>
      <View style={styles.savingsIconWrap}>
        <Text style={{ fontSize: 18 }}>💰</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.savingsProduct} numberOfLines={1}>{item.product}</Text>
        <View style={styles.savingsRoute}>
          <View style={[styles.miniDot, { backgroundColor: cheapestPs.bg }]} />
          <Text style={styles.savingsRouteText}>{item.cheapest}</Text>
          <Text style={styles.savingsVs}>vs</Text>
          <View style={[styles.miniDot, { backgroundColor: expensivePs.bg }]} />
          <Text style={styles.savingsRouteText}>{item.expensive}</Text>
        </View>
      </View>
      <View style={styles.savingsAmountCol}>
        <Text style={styles.savingsAmount}>-{formatINR(item.savedAmount)}</Text>
        <Text style={styles.savingsDate}>{item.date}</Text>
      </View>
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════ */

type PeriodType = 'week' | 'month' | 'year';

export default function SavingsScreen({ navigation }: { navigation: any }) {
  const [period, setPeriod] = useState<PeriodType>('month');
  const totalSpend = PLATFORM_SPEND.reduce((sum, p) => sum + p.amount, 0);
  const totalSaved = SAVINGS_HISTORY.reduce((sum, s) => sum + s.savedAmount, 0);
  const totalOrders = PLATFORM_SPEND.reduce((sum, p) => sum + p.orders, 0);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Savings</Text>
          <Text style={styles.headerSubtitle}>Your grocery spending insights</Text>
        </View>

        {/* Hero Stats */}
        <LinearGradient colors={['#2C5530', '#4F7A55']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroBanner}>
          <View style={styles.heroMain}>
            <Text style={styles.heroLabel}>Total Saved by Comparing</Text>
            <Text style={styles.heroAmount}>{formatINR(totalSaved)}</Text>
          </View>
          <View style={styles.heroRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{formatINR(totalSpend)}</Text>
              <Text style={styles.heroStatLabel}>Total Spend</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>{totalOrders}</Text>
              <Text style={styles.heroStatLabel}>Orders</Text>
            </View>
            <View style={styles.heroStatDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatNum}>5</Text>
              <Text style={styles.heroStatLabel}>Platforms</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Period tabs */}
        <View style={styles.periodRow}>
          {(['week', 'month', 'year'] as PeriodType[]).map(p => (
            <Pressable key={p} onPress={() => setPeriod(p)}
              style={[styles.periodChip, period === p && styles.periodChipActive]}>
              <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                {p === 'week' ? 'This Week' : p === 'month' ? 'This Month' : 'This Year'}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Monthly Spend Chart */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Monthly Spending</Text>
        </View>
        <View style={styles.chartCard}>
          <SpendChart data={MONTHLY_SPEND} />
        </View>

        {/* Platform Breakdown */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>By Platform</Text>
        </View>
        <View style={styles.platList}>
          {PLATFORM_SPEND.map(p => (
            <PlatformSpendCard key={p.platform} item={p} />
          ))}
        </View>

        {/* Savings Feed */}
        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Savings History 💰</Text>
        </View>
        <View style={styles.savingsList}>
          {SAVINGS_HISTORY.map(s => (
            <SavingsItem key={s.id} item={s} />
          ))}
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
  header: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4 },
  headerTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 26, color: '#2C3E2D' },
  headerSubtitle: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B', marginTop: 2 },

  // Hero banner
  heroBanner: { marginHorizontal: 16, marginTop: 12, borderRadius: 24, padding: 24 },
  heroMain: { alignItems: 'center', marginBottom: 20 },
  heroLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: 'rgba(255,255,255,0.7)' },
  heroAmount: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 42, color: '#fff', marginTop: 4 },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center' },
  heroStatNum: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#fff' },
  heroStatLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: 'rgba(255,255,255,0.6)', marginTop: 2 },
  heroStatDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.15)' },

  // Period tabs
  periodRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginTop: 20 },
  periodChip: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  periodChipActive: { backgroundColor: '#4F7A55', borderColor: '#4F7A55' },
  periodText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B' },
  periodTextActive: { color: '#fff' },

  // Section
  sectionRow: { paddingHorizontal: 16, marginTop: 24, marginBottom: 12 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },

  // Chart
  chartCard: { marginHorizontal: 16, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 16 },
  chartContainer: { height: 160 },
  chartBars: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-around', height: 140 },
  chartBarCol: { alignItems: 'center' },
  chartBarValue: { fontFamily: 'Nunito_600SemiBold', fontSize: 9, color: '#7A8C7B', marginBottom: 4 },
  chartBar: { width: 28, borderRadius: 8, borderWidth: 1, minHeight: 8 },
  chartBarLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B', marginTop: 6 },

  // Platform spend
  platList: { paddingHorizontal: 16, gap: 8 },
  platSpendCard: { borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', padding: 14 },
  platSpendHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  platSpendDot: { width: 10, height: 10, borderRadius: 5 },
  platSpendName: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#2C3E2D', flex: 1 },
  platSpendPct: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#4F7A55' },
  platSpendBarBg: { height: 6, borderRadius: 3, backgroundColor: 'rgba(122,158,126,0.1)', marginTop: 10, overflow: 'hidden' },
  platSpendBarFill: { height: '100%', borderRadius: 3 },
  platSpendFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  platSpendAmount: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#2C3E2D' },
  platSpendOrders: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B' },

  // Savings list
  savingsList: { paddingHorizontal: 16 },
  savingsItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(122,158,126,0.08)', gap: 12 },
  savingsIconWrap: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(79,122,85,0.08)', alignItems: 'center', justifyContent: 'center' },
  savingsProduct: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#2C3E2D' },
  savingsRoute: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  miniDot: { width: 6, height: 6, borderRadius: 3 },
  savingsRouteText: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B', textTransform: 'capitalize' },
  savingsVs: { fontFamily: 'Nunito_400Regular', fontSize: 10, color: '#7A8C7B' },
  savingsAmountCol: { alignItems: 'flex-end' },
  savingsAmount: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#4F7A55' },
  savingsDate: { fontFamily: 'Nunito_400Regular', fontSize: 11, color: '#7A8C7B', marginTop: 2 },
});
