import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, RefreshControl, ScrollView, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useCart } from '../hooks/useCart';
import client from '../api/client';
import PlatformBadge, { PLATFORM_STYLES } from '../components/PlatformBadge';

interface ProductResult { product_name: string; platform: string; price: number; unit: string; image_url: string; eta_minutes: number | null; platform_product_id: string; in_stock: boolean; }
interface ItemOffer { platform: string; price: number; eta_minutes: number | null; in_stock: boolean; }
interface CartItem { id: string; product_name: string; platform: string; price: number; quantity: number; product_id: string; }

const normalizeName = (n: string) => n.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const similarityScore = (a: string, b: string) => { if (!a || !b) return 0; if (a === b) return 1; if (a.includes(b) || b.includes(a)) return 0.85; const at = new Set(a.split(' ').filter(t => t.length > 2)); const bt = b.split(' ').filter(t => t.length > 2); if (!at.size || !bt.length) return 0; let o = 0; for (const t of bt) { if (at.has(t)) o++; } return o / Math.max(at.size, bt.length); };
const bestOffersByPlatform = (offers: ProductResult[]): ItemOffer[] => { const m = new Map<string, ItemOffer>(); for (const o of offers) { const k = o.platform.toLowerCase(); const c: ItemOffer = { platform: k, price: o.price, eta_minutes: o.eta_minutes, in_stock: o.in_stock }; const e = m.get(k); if (!e) { m.set(k, c); continue; } if (e.in_stock && !c.in_stock) continue; if (!e.in_stock && c.in_stock) { m.set(k, c); continue; } if (c.price > 0 && (e.price <= 0 || c.price < e.price)) m.set(k, c); } return [...m.values()].sort((a, b) => a.price - b.price); };
function formatINR(v: number) { return `₹${Math.round(v).toLocaleString('en-IN')}`; }

/* ── Cart Item Card with proper stepper ── */
function CartItemCard({ item, onIncrement, onDecrement, onRemove }: { item: CartItem; onIncrement: () => void; onDecrement: () => void; onRemove: () => void }) {
  return (
    <View style={styles.itemCard}>
      <View style={styles.itemImgWrap}><Text style={{ fontSize: 28 }}>🛍️</Text></View>
      <View style={styles.itemMid}>
        <Text style={styles.itemName} numberOfLines={2}>{item.product_name || 'Product'}</Text>
        <PlatformBadge platform={item.platform} compact />
      </View>
      <View style={styles.itemRight}>
        <Text style={styles.itemPrice}>{formatINR((item.price || 0) * (item.quantity || 1))}</Text>
        <View style={styles.stepper}>
          <Pressable onPress={() => item.quantity <= 1 ? onRemove() : onDecrement()}
            style={({ pressed }) => [styles.stepBtn, { backgroundColor: pressed ? 'rgba(122,158,126,0.2)' : 'transparent' }]}>
            <Text style={[styles.stepText, { color: item.quantity <= 1 ? '#C4855A' : '#4F7A55' }]}>
              {item.quantity <= 1 ? '🗑' : '−'}
            </Text>
          </Pressable>
          <Text style={styles.stepQty}>{item.quantity || 1}</Text>
          <Pressable onPress={onIncrement}
            style={({ pressed }) => [styles.stepBtn, { backgroundColor: pressed ? 'rgba(122,158,126,0.2)' : 'transparent' }]}>
            <Text style={styles.stepText}>+</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

export default function CartScreen({ navigation }: { navigation: any }) {
  const insets = useSafeAreaInsets();
  const { carts, activeCartId, isLoading, error, fetchCarts, createCart, deleteCart, removeItem, setActiveCart, getActiveCart, clearError } = useCart();
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [itemComparisons, setItemComparisons] = useState<Record<string, ItemOffer[]>>({});

  useEffect(() => { fetchCarts().catch(() => undefined); }, []);
  const activeCart = getActiveCart();
  const cartFp = useMemo(() => activeCart ? activeCart.items.map((i: CartItem) => `${i.id}:${i.quantity}`).join('|') : '', [activeCart]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!activeCart?.items.length) { setItemComparisons({}); return; }
      setComparisonLoading(true);
      try {
        const names = [...new Set(activeCart.items.map((i: CartItem) => i.product_name.trim()))];
        const res = await Promise.all(names.map(async (n) => ({ name: n, results: ((await client.get('/search', { params: { q: n } })).data?.results || []) as ProductResult[] })));
        if (cancelled) return;
        const byN = new Map<string, ProductResult[]>(); for (const r of res) byN.set(r.name, r.results);
        const next: Record<string, ItemOffer[]> = {};
        for (const i of activeCart.items) { const c = byN.get(i.product_name.trim()) || []; const t = normalizeName(i.product_name); const m = c.filter(x => similarityScore(normalizeName(x.product_name), t) >= 0.55); next[i.id] = bestOffersByPlatform(m.length ? m : c); }
        setItemComparisons(next);
      } catch { if (!cancelled) setItemComparisons({}); }
      finally { if (!cancelled) setComparisonLoading(false); }
    };
    load(); return () => { cancelled = true; };
  }, [activeCart?.id, cartFp]);

  const totalItems = useMemo(() => activeCart?.items.reduce((s: number, i: CartItem) => s + i.quantity, 0) ?? 0, [activeCart]);
  const selectedTotal = activeCart?.total || 0;

  const platformTotals = useMemo(() => {
    if (!activeCart?.items.length) return [];
    const agg = new Map<string, { total: number; eta: number | null; coverage: number }>();
    for (const item of activeCart.items) for (const o of (itemComparisons[item.id] || [])) { if (!o.in_stock) continue; const e = agg.get(o.platform) || { total: 0, eta: null, coverage: 0 }; e.total += o.price * item.quantity; e.coverage++; if (o.eta_minutes !== null) e.eta = Math.max(e.eta ?? 0, o.eta_minutes); agg.set(o.platform, e); }
    return [...agg.entries()].filter(([, v]) => v.coverage === activeCart.items.length).map(([p, v]) => ({ platform: p, total: v.total, eta: v.eta })).sort((a, b) => a.total - b.total);
  }, [activeCart, itemComparisons]);

  const groupedByPlatform = useMemo(() => {
    if (!activeCart) return [];
    const map = new Map<string, CartItem[]>();
    for (const i of activeCart.items) { const k = i.platform.toLowerCase(); map.set(k, [...(map.get(k) || []), i]); }
    return [...map.entries()].map(([p, items]) => ({ platform: p, items, subtotal: items.reduce((s, i) => s + i.price * i.quantity, 0) }));
  }, [activeCart]);

  const cheapestSplit = platformTotals[0]?.total || selectedTotal;
  const singlePlatform = platformTotals.find(r => r.platform === (activeCart?.items[0]?.platform || ''))?.total || selectedTotal;
  const savings = Math.max(0, singlePlatform - cheapestSplit);
  const hasItems = activeCart && activeCart.items.length > 0;

  const handleRemoveItem = (item: CartItem) => {
    Alert.alert('Remove item', `Remove ${item.product_name}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => activeCart && removeItem(activeCart.id, item.id).catch(() => undefined) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="chevron-back" size={20} color="#2C3E2D" />
          </Pressable>
          <Text style={styles.title}>My Cart</Text>
          <View style={styles.countChip}><Text style={styles.countChipText}>{totalItems}</Text></View>
        </View>

        {error && <Pressable onPress={clearError} style={styles.errorCard}><Text style={styles.errorText}>{error}</Text><Text style={styles.dismissText}>Dismiss</Text></Pressable>}

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingTop: 8, paddingBottom: 16 }} showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={isLoading} onRefresh={() => fetchCarts().catch(() => undefined)} tintColor="#4F7A55" />}>

          {!activeCart && !isLoading && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 56 }}>🛒</Text>
              <Text style={styles.emptyTitle}>No active cart</Text>
              <Text style={styles.emptyDesc}>Create a cart and add items from Explore.</Text>
              <Pressable onPress={() => createCart(`My Cart ${carts.length + 1}`).catch(() => undefined)} style={({ pressed }) => [styles.primaryBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                <Text style={styles.primaryBtnText}>Create Cart</Text>
              </Pressable>
            </View>
          )}

          {activeCart && !activeCart.items.length && (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 56 }}>🧺</Text>
              <Text style={styles.emptyTitle}>Cart is empty</Text>
              <Text style={styles.emptyDesc}>Add products from Explore to compare totals here.</Text>
            </View>
          )}

          {groupedByPlatform.map((g) => (
            <View key={g.platform} style={styles.groupWrap}>
              <View style={styles.groupHeader}>
                <PlatformBadge platform={g.platform} />
                <Text style={styles.groupSubtotal}>{formatINR(g.subtotal)}</Text>
              </View>
              {g.items.map((item: CartItem) => (
                <CartItemCard key={item.id} item={item}
                  onIncrement={() => {}} // TODO: implement qty update
                  onDecrement={() => {}} // TODO: implement qty update
                  onRemove={() => handleRemoveItem(item)}
                />
              ))}
            </View>
          ))}
        </ScrollView>

        {hasItems && (
          <View style={[styles.bottomPanel, { paddingBottom: insets.bottom + 80 }]}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Smart Summary</Text>
              {comparisonLoading ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color="#4F7A55" />
                  <Text style={styles.loadingText}>Recomputing best split...</Text>
                </View>
              ) : (<>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Cheapest split</Text><Text style={styles.summaryValue}>{formatINR(cheapestSplit)}</Text></View>
                <View style={styles.summaryRow}><Text style={styles.summaryLabel}>Single platform</Text><Text style={styles.summaryValue}>{formatINR(singlePlatform)}</Text></View>
                <View style={styles.divider} />
                <View style={styles.summaryRow}><Text style={styles.savingsText}>Savings</Text><Text style={styles.savingsText}>{formatINR(savings)}</Text></View>
              </>)}
            </View>
            <Pressable onPress={() => navigation.getParent()?.navigate('Checkout')}
              style={({ pressed }) => [styles.checkoutBtn, { backgroundColor: pressed ? '#4F7A55' : '#7A9E7E' }]}>
              <Text style={styles.checkoutText}>Proceed to Checkout</Text>
            </Pressable>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' }, container: { flex: 1, paddingHorizontal: 16 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#2C3E2D' },
  countChip: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, backgroundColor: '#7A9E7E' },
  countChipText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 12 },
  errorCard: { marginBottom: 10, padding: 14, borderRadius: 16, backgroundColor: 'rgba(192,97,74,0.1)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  errorText: { flex: 1, color: '#C0614A', fontFamily: 'Nunito_600SemiBold', fontSize: 13 },
  dismissText: { fontFamily: 'Nunito_600SemiBold', color: '#7A8C7B', fontSize: 12, marginLeft: 10 },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingTop: 48 },
  emptyTitle: { marginTop: 10, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#2C3E2D' },
  emptyDesc: { marginTop: 6, fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7A8C7B', textAlign: 'center' },
  primaryBtn: { marginTop: 16, height: 44, borderRadius: 22, paddingHorizontal: 24, justifyContent: 'center', alignItems: 'center', backgroundColor: '#7A9E7E' },
  primaryBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  groupWrap: { marginBottom: 12 },
  groupHeader: { height: 40, paddingHorizontal: 4, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupSubtotal: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#4F7A55' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', padding: 14 },
  itemImgWrap: { width: 56, height: 56, borderRadius: 12, backgroundColor: 'rgba(240,244,239,0.9)', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  itemMid: { flex: 1, marginLeft: 12, gap: 6 },
  itemName: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', lineHeight: 19 },
  itemRight: { alignItems: 'flex-end', justifyContent: 'space-between', gap: 8, marginLeft: 10 },
  itemPrice: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#4F7A55' },
  stepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(122,158,126,0.12)', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(122,158,126,0.25)', overflow: 'hidden' },
  stepBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, color: '#4F7A55', lineHeight: 22 },
  stepQty: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', minWidth: 24, textAlign: 'center' },
  bottomPanel: { paddingTop: 12, backgroundColor: 'rgba(240,244,239,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(122,158,126,0.15)' },
  summaryCard: { backgroundColor: 'rgba(255,255,255,0.3)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', padding: 16, marginBottom: 12 },
  summaryTitle: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', marginBottom: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  loadingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B' },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  summaryLabel: { fontSize: 13, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' },
  summaryValue: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#2C3E2D' },
  divider: { height: 1, backgroundColor: 'rgba(122,158,126,0.15)', marginVertical: 8 },
  savingsText: { fontSize: 14, fontFamily: 'Nunito_700Bold', color: '#C4855A' },
  checkoutBtn: { borderRadius: 26, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  checkoutText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
});
