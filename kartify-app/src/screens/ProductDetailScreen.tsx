import React, { useMemo, useState, useEffect } from 'react';
import { Alert, Dimensions, Image, Pressable, ScrollView, Share, StatusBar, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { PLATFORM_STYLES } from '../components/PlatformBadge';
import { useCart } from '../hooks/useCart';
import client from '../api/client';

const SCREEN_W = Dimensions.get('window').width;
function formatINR(v: number) { return `₹${Math.round(v).toLocaleString('en-IN')}`; }

/* ── Mock 7-day price history ── */
function genHistory(base: number) {
  const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Today'];
  return days.map((d,i) => ({ day: d, price: Math.round(base + (Math.random()-0.4)*base*0.15) }));
}

function MiniPriceChart({ basePrice }: { basePrice: number }) {
  const data = useMemo(() => genHistory(basePrice), [basePrice]);
  const max = Math.max(...data.map(d=>d.price));
  const min = Math.min(...data.map(d=>d.price));
  const range = max - min || 1;
  const W = SCREEN_W - 64;
  const H = 80;
  const step = W / (data.length - 1);
  const points = data.map((d,i) => ({ x: i*step, y: H - ((d.price-min)/range)*H }));
  const pathD = points.map((p,i) => `${i===0?'M':'L'}${p.x},${p.y}`).join(' ');

  return (
    <View style={s2.chartWrap}>
      <View style={s2.chartHeader}>
        <Text style={s2.chartTitle}>7-Day Price Trend</Text>
        <View style={s2.chartRange}>
          <Text style={s2.chartLow}>Low {formatINR(min)}</Text>
          <Text style={s2.chartHigh}>High {formatINR(max)}</Text>
        </View>
      </View>
      <View style={{ height: H+20, marginTop: 8 }}>
        <View style={{ position:'absolute', top:0, left:0, right:0, bottom:20 }}>
          {points.map((p,i) => (
            <View key={i} style={{ position:'absolute', left:p.x-3, top:p.y-3, width:6, height:6, borderRadius:3, backgroundColor: i===points.length-1 ? '#4F7A55' : '#7A9E7E' }} />
          ))}
          {points.slice(0,-1).map((p,i) => {
            const next = points[i+1];
            const dx = next.x-p.x, dy = next.y-p.y;
            const len = Math.sqrt(dx*dx+dy*dy);
            const angle = Math.atan2(dy,dx)*180/Math.PI;
            return <View key={`l${i}`} style={{ position:'absolute', left:p.x, top:p.y, width:len, height:2, backgroundColor:'rgba(122,158,126,0.3)', transformOrigin:'left center', transform:[{rotate:`${angle}deg`}] }} />;
          })}
        </View>
        <View style={{ position:'absolute', bottom:0, left:0, right:0, flexDirection:'row', justifyContent:'space-between' }}>
          {data.map((d,i) => <Text key={i} style={[s2.chartDayLabel, i===data.length-1 && {color:'#4F7A55',fontFamily:'Nunito_700Bold'}]}>{d.day}</Text>)}
        </View>
      </View>
    </View>
  );
}

const s2 = StyleSheet.create({
  chartWrap: { marginHorizontal:16, marginBottom:16, borderRadius:16, padding:14, backgroundColor:'rgba(255,255,255,0.25)', borderWidth:1, borderColor:'rgba(255,255,255,0.45)' },
  chartHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  chartTitle: { fontFamily:'Nunito_700Bold', fontSize:14, color:'#2C3E2D' },
  chartRange: { flexDirection:'row', gap:10 },
  chartLow: { fontFamily:'Nunito_600SemiBold', fontSize:11, color:'#4F7A55' },
  chartHigh: { fontFamily:'Nunito_600SemiBold', fontSize:11, color:'#C4855A' },
  chartDayLabel: { fontFamily:'Nunito_600SemiBold', fontSize:10, color:'#7A8C7B', width:36, textAlign:'center' },
});

export default function ProductDetailScreen({ route, navigation }: { route: any; navigation: any }) {
  const insets = useSafeAreaInsets();
  const product = route.params?.productData;
  const { getActiveCart, createCart, addItem } = useCart();

  const platforms = product?.platforms || (product?.platform ? [{ platform: product.platform, price: product.price, eta: null, inStock: true }] : []);
  const [selectedPlatform, setSelectedPlatform] = useState(platforms[0] || null);
  const [quantity, setQuantity] = useState(1);
  const [imgErr, setImgErr] = useState(false);
  const [adding, setAdding] = useState(false);
  const [settingAlert, setSettingAlert] = useState(false);

  const handleSetAlert = async () => {
    if (!platforms.length || settingAlert) return;
    setSettingAlert(true);
    const target = Math.round((platforms[0]?.price || 100) * 0.9);
    try {
      await client.post('/alerts', {
        product_name: product.name || product.product_name || 'Unknown Product',
        target_price: target,
        platform: platforms[0]?.platform || '',
        product_catalog_id: product.id || '',
      });
      Alert.alert('Price Alert Set!', `We'll notify you when the price drops below ${formatINR(target)}`);
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not set alert');
    } finally {
      setSettingAlert(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedPlatform || adding) return;
    setAdding(true);
    try {
      let cart = getActiveCart();
      if (!cart) {
        cart = await createCart('My Cart');
      }
      await addItem(cart.id, {
        product_name: product.name || product.product_name || 'Product',
        platform: selectedPlatform.platform,
        price: selectedPlatform.price,
        quantity,
        product_id: product.id || '',
      });
      Alert.alert('Added to Cart', `${product.name || 'Item'} × ${quantity} from ${selectedPlatform.platform}`);
      navigation.goBack();
    } catch (e: any) {
      Alert.alert('Error', e?.message || 'Could not add to cart');
    } finally {
      setAdding(false);
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
        <View style={styles.emptyWrap}>
          <Text style={{ fontSize: 56 }}>🛒</Text>
          <Text style={styles.emptyTitle}>Product not found</Text>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.ctaBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            <Text style={styles.ctaText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const imageUri = product.image || product.image_url || product.imageUrl;

  useEffect(() => {
    setImgErr(false);
  }, [imageUri]);

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="chevron-back" size={22} color="#2C3E2D" />
          </Pressable>
          <Text style={styles.headerTitle}>Compare Prices</Text>
          <Pressable onPress={() => Share.share({ message: `Check out ${product?.name} on Kartify! Compare prices across Blinkit, Zepto & more.` })} style={({ pressed }) => [styles.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="share-outline" size={20} color="#2C3E2D" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>
          {/* Product Hero */}
          <View style={styles.heroCard}>
            <View style={styles.heroImgWrap}>
              {!imgErr && imageUri ? (
                <Image source={{ uri: imageUri }} style={{ width: 100, height: 100 }} resizeMode="contain" onError={() => setImgErr(true)} />
              ) : (
                <Text style={{ fontSize: 48 }}>🛍️</Text>
              )}
            </View>
            <Text style={styles.heroName}>{product.name || product.product_name}</Text>
            <Text style={styles.heroUnit}>{product.unit || ''}</Text>
          </View>

          {/* Price History Chart */}
          <MiniPriceChart basePrice={platforms[0]?.price || 100} />

          {/* Set Price Alert */}
          <Pressable onPress={handleSetAlert}
            style={({ pressed }) => [styles.alertBtn, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <Ionicons name="notifications-outline" size={18} color="#C4855A" />
            <Text style={styles.alertBtnText}>{settingAlert ? 'Setting...' : 'Set Price Alert'}</Text>
            <Text style={styles.alertBtnTarget}>Target: {formatINR(Math.round((platforms[0]?.price || 100) * 0.9))}</Text>
          </Pressable>

          {/* Platform selection */}
          <Text style={styles.choosePlatform}>CHOOSE PLATFORM</Text>

          {platforms.map((p: any, idx: number) => {
            const isSelected = selectedPlatform?.platform === p.platform;
            const isCheapest = idx === 0;
            const ps = PLATFORM_STYLES[p.platform?.toLowerCase()] || { bg: '#888', text: '#fff' };
            const effectivePrice = (p.price || 0) + (p.delivery_fee || 0) + (p.surge_charge || 0);
            return (
              <Pressable key={idx} onPress={() => setSelectedPlatform(p)}
                style={({ pressed }) => [styles.platformRow, {
                  backgroundColor: isSelected ? 'rgba(79,122,85,0.1)' : 'rgba(255,255,255,0.22)',
                  borderWidth: isSelected ? 2 : 1,
                  borderColor: isSelected ? '#7A9E7E' : 'rgba(255,255,255,0.45)',
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                }]}>
                {/* Platform badge */}
                <View style={[styles.platformPill, { backgroundColor: ps.bg }]}>
                  <Text style={[styles.platformPillText, { color: ps.text }]}>{p.platform}</Text>
                </View>
                {/* ETA + fees */}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.etaText}>{p.eta ? `⚡ ${p.eta}` : '🛵 ~20 min'}</Text>
                  <Text style={[styles.feeText, { color: p.delivery_fee > 0 ? '#C4855A' : '#7A9E7E' }]}>
                    {p.delivery_fee > 0 ? `+₹${p.delivery_fee} delivery` : 'Free delivery'}
                  </Text>
                  {p.surge_charge > 0 && (
                    <Text style={{ color: '#C4855A', fontSize: 11, fontFamily: 'Nunito_600SemiBold', marginTop: 1 }}>
                      ⚡ +₹{p.surge_charge} surge
                    </Text>
                  )}
                </View>
                {/* Price */}
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.platPrice, { color: isCheapest ? '#4F7A55' : '#2C3E2D' }]}>{formatINR(p.price)}</Text>
                  {(p.delivery_fee > 0 || p.surge_charge > 0) && (
                    <Text style={{ fontSize: 11, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' }}>Total: {formatINR(effectivePrice)}</Text>
                  )}
                  {isCheapest && <View style={styles.cheapBadge}><Text style={styles.cheapText}>CHEAPEST</Text></View>}
                  {isSelected && <Text style={{ fontSize: 18, color: '#7A9E7E', marginTop: 2 }}>✓</Text>}
                </View>
              </Pressable>
            );
          })}

          {/* Savings callout */}
          {platforms.length > 1 && (() => {
            const saving = platforms[platforms.length - 1].price - platforms[0].price;
            if (saving <= 0) return null;
            return (
              <View style={styles.savingsCard}>
                <Text style={{ fontSize: 20 }}>💡</Text>
                <Text style={styles.savingsText}>
                  Buying from {platforms[0].platform} saves you ₹{saving} vs the most expensive option
                </Text>
              </View>
            );
          })()}

          {/* Quantity */}
          <View style={styles.qtyBar}>
            <Text style={styles.qtyLabel}>Quantity</Text>
            <View style={styles.qtyStepper}>
              <Pressable onPress={() => setQuantity((q) => Math.max(1, q - 1))} style={styles.qtyBtn}>
                <Text style={styles.qtyBtnText}>−</Text>
              </Pressable>
              <Text style={styles.qtyValue}>{quantity}</Text>
              <Pressable onPress={() => setQuantity((q) => q + 1)} style={styles.qtyBtn}>
                <Text style={styles.qtyBtnText}>+</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>

        {/* Fixed bottom CTA */}
        <View style={[styles.bottomCta, { paddingBottom: insets.bottom + 16 }]}>
          {selectedPlatform && (
            <View style={styles.ctaSummary}>
              <Text style={styles.ctaSumLabel}>{selectedPlatform.platform} · {quantity} item{quantity > 1 ? 's' : ''}</Text>
              <Text style={styles.ctaSumPrice}>{formatINR(((selectedPlatform.price || 0) + (selectedPlatform.delivery_fee || 0) + (selectedPlatform.surge_charge || 0)) * quantity)}</Text>
            </View>
          )}
          <Pressable onPress={handleAddToCart}
            style={({ pressed }) => [styles.addCartBtn, { backgroundColor: pressed ? '#4F7A55' : '#7A9E7E', opacity: selectedPlatform ? 1 : 0.5 }]}>
            <Text style={styles.addCartText}>
              {adding ? 'Adding...' : selectedPlatform ? `Add to Cart · ${selectedPlatform.platform}` : 'Select a Platform First'}
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#2C3E2D' },
  heroCard: { margin: 16, borderRadius: 20, padding: 20, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', alignItems: 'center' },
  heroImgWrap: { width: 120, height: 120, borderRadius: 20, backgroundColor: 'rgba(240,244,239,0.9)', alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  heroName: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#2C3E2D', textAlign: 'center', marginBottom: 4 },
  heroUnit: { fontSize: 14, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' },
  alertBtn: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 14, backgroundColor: 'rgba(196,133,90,0.08)', borderWidth: 1, borderColor: 'rgba(196,133,90,0.25)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  alertBtnText: { flex: 1, fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#C4855A' },
  alertBtnTarget: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B' },
  choosePlatform: { fontSize: 13, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', paddingHorizontal: 16, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  platformRow: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, padding: 16, flexDirection: 'row', alignItems: 'center' },
  platformPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, minWidth: 90, alignItems: 'center' },
  platformPillText: { fontSize: 12, fontFamily: 'Nunito_700Bold', textTransform: 'capitalize' },
  etaText: { fontSize: 13, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' },
  feeText: { fontSize: 11, marginTop: 2, fontFamily: 'Nunito_600SemiBold' },
  platPrice: { fontSize: 20, fontFamily: 'Nunito_700Bold' },
  cheapBadge: { backgroundColor: '#C4855A', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginTop: 3 },
  cheapText: { color: '#fff', fontSize: 9, fontFamily: 'Nunito_700Bold' },
  savingsCard: { marginHorizontal: 16, marginBottom: 16, borderRadius: 14, padding: 14, backgroundColor: 'rgba(196,133,90,0.1)', borderWidth: 1, borderColor: 'rgba(196,133,90,0.25)', flexDirection: 'row', alignItems: 'center', gap: 10 },
  savingsText: { flex: 1, fontSize: 13, color: '#C4855A', fontFamily: 'Nunito_700Bold' },
  qtyBar: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  qtyLabel: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#2C3E2D' },
  qtyStepper: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(122,158,126,0.12)', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(122,158,126,0.25)', overflow: 'hidden' },
  qtyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 20, color: '#4F7A55' },
  qtyValue: { fontSize: 16, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', minWidth: 32, textAlign: 'center' },
  bottomCta: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: 'rgba(240,244,239,0.95)', borderTopWidth: 1, borderTopColor: 'rgba(122,158,126,0.15)' },
  ctaSummary: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  ctaSumLabel: { fontSize: 13, color: '#7A8C7B', fontFamily: 'Nunito_600SemiBold' },
  ctaSumPrice: { fontSize: 15, fontFamily: 'Nunito_700Bold', color: '#4F7A55' },
  addCartBtn: { borderRadius: 26, height: 52, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)' },
  addCartText: { color: '#fff', fontSize: 16, fontFamily: 'Nunito_700Bold' },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#2C3E2D', marginTop: 12 },
  ctaBtn: { marginTop: 20, height: 44, borderRadius: 22, backgroundColor: '#7A9E7E', paddingHorizontal: 28, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
});
