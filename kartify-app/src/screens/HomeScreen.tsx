import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { GlassTokens } from '../components/GlassPrimitives';
import PlatformBadge from '../components/PlatformBadge';
import { useAuthStore } from '../store/authStore';
import { useLocationWeather } from '../hooks/useLocationWeather';

const SCREEN_W = Dimensions.get('window').width;

const HERO_SLIDES = [
  { id: 'h1', title: 'Best prices,\ndelivered fast', emoji: '🛒', colors: ['#4F7A55', '#7A9E7E'] as [string, string] },
  { id: 'h2', title: 'Save ₹60 on\ndairy today', emoji: '🥛', colors: ['#C4855A', '#E8C4A8'] as [string, string] },
  { id: 'h3', title: 'Compare 5\nplatforms at once', emoji: '⚖️', colors: ['#2C5530', '#4F7A55'] as [string, string] },
];

const PLATFORMS = [
  { id: 'blinkit', name: 'Blinkit', minPrice: 122, color: '#F5C842' },
  { id: 'zepto', name: 'Zepto', minPrice: 128, color: '#8B5CF6' },
  { id: 'instamart', name: 'Instamart', minPrice: 126, color: '#FF6B35' },
  { id: 'bigbasket', name: 'BigBasket', minPrice: 119, color: '#89C73A' },
  { id: 'jiomart', name: 'JioMart', minPrice: 121, color: '#0066CC' },
];

const CATEGORIES = [
  { id: 'fruits', label: 'Fruits & Veg', image: 'https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&q=80', color: 'rgba(122,158,126,0.15)' },
  { id: 'dairy', label: 'Dairy & Eggs', image: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&q=80', color: 'rgba(245,200,66,0.15)' },
  { id: 'snacks', label: 'Snacks', image: 'https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=200&q=80', color: 'rgba(196,133,90,0.15)' },
  { id: 'beverages', label: 'Beverages', image: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&q=80', color: 'rgba(139,92,246,0.15)' },
  { id: 'household', label: 'Household', image: 'https://images.unsplash.com/photo-1563453392212-326f5e854473?w=200&q=80', color: 'rgba(59,139,212,0.15)' },
  { id: 'personal', label: 'Personal Care', image: 'https://images.unsplash.com/photo-1619451334792-150fd785ee74?w=200&q=80', color: 'rgba(255,107,53,0.15)' },
  { id: 'meat', label: 'Meat & Fish', image: 'https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=200&q=80', color: 'rgba(196,80,74,0.15)' },
  { id: 'baby', label: 'Baby & Kids', image: 'https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=200&q=80', color: 'rgba(255,200,87,0.15)' },
];

const BUY_AGAIN = [
  { id: 'b1', name: 'Amul Gold Milk', unit: '1 L', price: 68, platform: 'blinkit', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/378952a.jpg' },
  { id: 'b2', name: 'Farm Eggs', unit: '12 pcs', price: 92, platform: 'zepto', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/494122a.jpg' },
  { id: 'b3', name: 'Aashirvaad Atta', unit: '5 kg', price: 292, platform: 'bigbasket', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/36518a.jpg' },
  { id: 'b4', name: "Lay's Classic", unit: '52 g', price: 20, platform: 'instamart', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/32702a.jpg' },
];

const DEALS = [
  { id: 'd1', name: 'Monster Energy', unit: '250 ml', platform: 'blinkit', old: 135, price: 125, off: '7%', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/430535a.jpg' },
  { id: 'd2', name: 'Amul Gold Milk', unit: '1 L', platform: 'jiomart', old: 70, price: 66, off: '6%', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/378952a.jpg' },
  { id: 'd3', name: 'Farm Fresh Eggs', unit: '12 pcs', platform: 'bigbasket', old: 99, price: 90, off: '9%', image: 'https://cdn.grofers.com/cdn-cgi/image/f=auto,fit=scale-down,q=70,metadata=none,w=270/app/images/products/sliding_image/494122a.jpg' },
];

const SEARCH_HINTS = ['Search milk, eggs, bread...', "Search Amul, Maggi, Lay's...", 'Search atta, rice, dal...'];

const SAVED_ADDRESSES = [
  { id: 'a1', label: 'Home', address: '12B, Prestige Tower, Bangalore' },
  { id: 'a2', label: 'Office', address: '5th Floor, WeWork Galaxy, Ashok Nagar' },
  { id: 'a3', label: 'Parents', address: '45, Green Park Society, Pune' },
];

function formatINR(v: number) { return `₹${v.toLocaleString('en-IN')}`; }

/* ── Animated search placeholder ── */
function AnimatedPlaceholder() {
  const [idx, setIdx] = useState(0);
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const iv = setInterval(() => {
      Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => {
        setIdx((p) => (p + 1) % SEARCH_HINTS.length);
        Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
      });
    }, 2500);
    return () => clearInterval(iv);
  }, [opacity]);
  return <Animated.Text style={[styles.searchPlaceholder, { opacity }]}>{SEARCH_HINTS[idx]}</Animated.Text>;
}

/* ── Product image with fallback ── */
function ProductImg({ uri, size }: { uri: string; size: number }) {
  const [f, setF] = useState(false);
  if (f || !uri) return <View style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#F0F4EF', alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bag-handle-outline" size={size * 0.38} color="#7A8C7B" /></View>;
  return <Image source={{ uri }} style={{ width: size, height: size, borderRadius: 12, backgroundColor: '#f5f7f4' }} resizeMode="contain" onError={() => setF(true)} />;
}

/* ── Section Header ── */
function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.sectionRow}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {actionLabel ? <Pressable onPress={onAction} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}><Text style={styles.seeAll}>{actionLabel}</Text></Pressable> : null}
    </View>
  );
}

/* ── Location Picker Modal ── */
function LocationPickerModal({ visible, onClose, onSelect, currentCity }: { visible: boolean; onClose: () => void; onSelect: (addr: string) => void; currentCity: string }) {
  const [search, setSearch] = useState('');
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Change delivery location</Text>
          <View style={styles.modalSearchBar}>
            <Ionicons name="search-outline" size={18} color="#7A8C7B" />
            <TextInput style={styles.modalSearchInput} placeholder="Search address..." placeholderTextColor="#7A8C7B" value={search} onChangeText={setSearch} />
          </View>
          <Pressable onPress={() => { onSelect(currentCity); onClose(); }} style={({ pressed }) => [styles.gpsRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Ionicons name="navigate-outline" size={20} color="#7A9E7E" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.gpsLabel}>Use current location</Text>
              <Text style={styles.gpsAddr}>{currentCity || 'Detecting...'}</Text>
            </View>
          </Pressable>
          <Text style={styles.savedLabel}>Saved addresses</Text>
          {SAVED_ADDRESSES.map((a) => (
            <Pressable key={a.id} onPress={() => { onSelect(a.address); onClose(); }} style={({ pressed }) => [styles.addrRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
              <Ionicons name={a.label === 'Home' ? 'home-outline' : a.label === 'Office' ? 'business-outline' : 'heart-outline'} size={18} color="#2C3E2D" />
              <View style={{ marginLeft: 12, flex: 1 }}>
                <Text style={styles.addrLabel}>{a.label}</Text>
                <Text style={styles.addrText} numberOfLines={1}>{a.address}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable onPress={onClose} style={({ pressed }) => [styles.modalCloseBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
            <Text style={styles.modalCloseText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════ */

export default function HomeScreen({ navigation }: { navigation: any }) {
  const { user, logout } = useAuthStore();
  const { city } = useLocationWeather();
  const [heroIndex, setHeroIndex] = useState(0);
  const heroRef = useRef<FlatList>(null);
  const slideWidth = SCREEN_W - 32;
  const [locationModal, setLocationModal] = useState(false);
  const [deliveryCity, setDeliveryCity] = useState(city);

  useEffect(() => { setDeliveryCity(city); }, [city]);

  useEffect(() => {
    const timer = setInterval(() => {
      const next = (heroIndex + 1) % HERO_SLIDES.length;
      setHeroIndex(next);
      heroRef.current?.scrollToOffset({ offset: next * slideWidth, animated: true });
    }, 3500);
    return () => clearInterval(timer);
  }, [heroIndex, slideWidth]);

  const greeting = useMemo(() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'; }, []);
  const initials = useMemo(() => { const n = (user?.name || 'Kartify User').trim().split(/\s+/); return `${n[0]?.[0] || 'K'}${n[1]?.[0] || ''}`.toUpperCase(); }, [user?.name]);

  const goToProduct = (item: any) => navigation.getParent()?.navigate('ProductDetail', { productData: item });

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <LocationPickerModal visible={locationModal} onClose={() => setLocationModal(false)} onSelect={setDeliveryCity} currentCity={city} />
      <ScrollView style={styles.scroll} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* ── Top bar ── */}
        <View style={styles.topBar}>
          <View>
            <Text style={styles.greetingText}>{greeting}, {user?.name || 'there'}</Text>
            <Text style={styles.brandText}>Kartify</Text>
          </View>
          <View style={styles.topActions}>
            <Pressable onPress={() => navigation.navigate('HistoryTab')} style={({ pressed }) => [styles.iconWrap, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Ionicons name="notifications-outline" size={22} color="#2C3E2D" />
            </Pressable>
            <Pressable onPress={() => navigation.getParent()?.navigate('Profile')} style={({ pressed }) => [styles.avatar, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </Pressable>
          </View>
        </View>

        {/* ── Location (opens modal, NOT search) ── */}
        <Pressable onPress={() => setLocationModal(true)} style={({ pressed }) => [styles.locationRow, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Ionicons name="location-outline" size={16} color="#C4855A" />
          <Text style={styles.locationLead}>Delivering to </Text>
          <Text style={styles.locationName}>{deliveryCity}</Text>
          <Ionicons name="chevron-down" size={14} color="#7A8C7B" />
        </Pressable>

        {/* ── Search bar → Explore with autoFocus ── */}
        <Pressable onPress={() => navigation.navigate('SearchTab', { autoFocus: true })} style={({ pressed }) => [styles.searchBar, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <Ionicons name="search-outline" size={20} color="#7A8C7B" />
          <AnimatedPlaceholder />
          <Ionicons name="mic-outline" size={20} color="#7A9E7E" />
        </Pressable>

        {/* ── Hero carousel ── */}
        <View style={styles.heroWrap}>
          <FlatList ref={heroRef} data={HERO_SLIDES} keyExtractor={(i) => i.id} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setHeroIndex(Math.round(e.nativeEvent.contentOffset.x / e.nativeEvent.layoutMeasurement.width))}
            renderItem={({ item }) => (
              <View style={{ width: slideWidth }}>
                <LinearGradient colors={item.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroSlide}>
                  <View style={styles.heroCopy}><Text style={styles.heroTitle}>{item.title}</Text></View>
                  <Text style={styles.heroEmoji}>{item.emoji}</Text>
                </LinearGradient>
              </View>
            )}
          />
          <View style={styles.dotsRow}>
            {HERO_SLIDES.map((s, i) => <View key={s.id} style={[styles.dot, i === heroIndex && styles.dotActive]} />)}
          </View>
        </View>

        {/* ── Platforms → Explore with platformFilter ── */}
        <SectionHeader title="Shop by Platform" />
        <FlatList data={PLATFORMS} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 10 }} keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('SearchTab', { platformFilter: item.id })} style={({ pressed }) => [styles.platformChip, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <View style={[styles.dotBadge, { backgroundColor: item.color }]} />
              <View>
                <Text style={styles.platformName}>{item.name}</Text>
                <Text style={styles.platformSub}>from ₹{item.minPrice}</Text>
              </View>
            </Pressable>
          )}
        />

        {/* ── Categories → SearchTab with category ── */}
        <SectionHeader title="Categories" />
        <FlatList data={CATEGORIES} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 10 }} keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => navigation.navigate('SearchTab', { categoryFilter: item.id, categoryName: item.label })}
              style={({ pressed }) => ({ width: 80, height: 88, borderRadius: 20, backgroundColor: item.color, borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', overflow: 'hidden', transform: [{ scale: pressed ? 0.95 : 1 }] })}>
              <Image source={{ uri: item.image }} style={{ width: 80, height: 56 }} resizeMode="cover" />
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 }}>
                <Text style={styles.categoryLabel} numberOfLines={2}>{item.label}</Text>
              </View>
            </Pressable>
          )}
        />

        {/* ── Buy Again → ProductDetail ── */}
        <SectionHeader title="Buy Again" actionLabel="See all" onAction={() => navigation.navigate('HistoryTab')} />
        <FlatList data={BUY_AGAIN} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 24, gap: 12 }} keyExtractor={(i) => i.id}
          renderItem={({ item }) => (
            <Pressable onPress={() => goToProduct(item)} style={({ pressed }) => [styles.buyAgainCard, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
              <View style={styles.buyAgainImgWrap}><ProductImg uri={item.image} size={80} /></View>
              <View style={styles.buyAgainInfo}>
                <Text style={styles.buyAgainName} numberOfLines={2}>{item.name}</Text>
                <Text style={styles.buyAgainUnit}>{item.unit}</Text>
                <View style={styles.buyAgainBottom}>
                  <Text style={styles.buyAgainPrice}>{formatINR(item.price)}</Text>
                  <View style={styles.plusBtn}><Text style={styles.plusText}>+</Text></View>
                </View>
              </View>
            </Pressable>
          )}
        />

        {/* ── Deals → ProductDetail ── */}
        <SectionHeader title="Best Deals Right Now 🔥" />
        {DEALS.map((item) => (
          <Pressable key={item.id} onPress={() => goToProduct(item)} style={({ pressed }) => [styles.dealCard, { transform: [{ scale: pressed ? 0.97 : 1 }] }]}>
            <View style={styles.dealImgWrap}><ProductImg uri={item.image} size={64} /></View>
            <View style={styles.dealCenter}>
              <Text style={styles.dealName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.dealUnit}>{item.unit}</Text>
              <View style={styles.dealMetaRow}><PlatformBadge platform={item.platform} compact /><Text style={styles.oldPrice}>{formatINR(item.old)}</Text></View>
            </View>
            <View style={styles.dealRight}>
              <Text style={styles.dealPrice}>{formatINR(item.price)}</Text>
              <View style={styles.discBadge}><Text style={styles.discText}>{item.off} OFF</Text></View>
            </View>
          </Pressable>
        ))}

        <Pressable onPress={logout} style={({ pressed }) => [styles.signOutBtn, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' }, scroll: { flex: 1 },
  topBar: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  greetingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B' },
  brandText: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#2C3E2D' },
  topActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#7A9E7E' },
  avatarText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },
  locationRow: { height: 40, marginTop: 6, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 4 },
  locationLead: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#7A8C7B' },
  locationName: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#2C3E2D', marginRight: 'auto' },
  searchBar: { height: 50, marginTop: 10, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, gap: 8 },
  searchPlaceholder: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7A8C7B' },
  heroWrap: { marginTop: 14, borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  heroSlide: { height: 140, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22 },
  heroCopy: { flex: 1, marginRight: 16 },
  heroTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#FFFFFF', lineHeight: 28 },
  heroEmoji: { fontSize: 52 },
  dotsRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 8, backgroundColor: 'rgba(0,0,0,0.06)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.45)' },
  dotActive: { backgroundColor: '#FFFFFF', width: 20, borderRadius: 4 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 22, marginBottom: 10 },
  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },
  seeAll: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A9E7E' },
  platformChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, minWidth: 110, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  dotBadge: { width: 8, height: 8, borderRadius: 4 },
  platformName: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#2C3E2D' },
  platformSub: { fontFamily: 'Nunito_600SemiBold', fontSize: 10, color: '#7A8C7B' },
  categoryLabel: { fontSize: 9, fontFamily: 'Nunito_700Bold', color: '#2C3E2D', textAlign: 'center', lineHeight: 12 },
  buyAgainCard: { width: 140, height: 172, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.22)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', overflow: 'hidden' },
  buyAgainImgWrap: { width: 140, height: 100, backgroundColor: 'rgba(240,244,239,0.8)', alignItems: 'center', justifyContent: 'center' },
  buyAgainInfo: { padding: 10, flex: 1, justifyContent: 'space-between' },
  buyAgainName: { fontFamily: 'Nunito_700Bold', fontSize: 12, color: '#2C3E2D' },
  buyAgainUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 10, color: '#7A8C7B', marginTop: 2 },
  buyAgainBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  buyAgainPrice: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#4F7A55' },
  plusBtn: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#7A9E7E', alignItems: 'center', justifyContent: 'center' },
  plusText: { color: '#fff', fontSize: 16, lineHeight: 20, fontWeight: '700' },
  dealCard: { flexDirection: 'row', alignItems: 'center', height: 96, borderRadius: 16, marginBottom: 10, padding: 12, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)' },
  dealImgWrap: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  dealCenter: { flex: 1, marginLeft: 12 },
  dealName: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#2C3E2D' },
  dealUnit: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B', marginTop: 1 },
  dealMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  oldPrice: { fontFamily: 'Nunito_400Regular', fontSize: 12, color: '#7A8C7B', textDecorationLine: 'line-through' },
  dealRight: { alignItems: 'flex-end', marginLeft: 8 },
  dealPrice: { fontFamily: 'Nunito_700Bold', fontSize: 18, color: '#4F7A55' },
  discBadge: { marginTop: 4, borderRadius: 10, backgroundColor: '#C4855A', paddingHorizontal: 7, paddingVertical: 2 },
  discText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 10 },
  signOutBtn: { marginTop: 14, marginBottom: 8, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(196,133,90,0.12)', borderColor: 'rgba(196,133,90,0.4)', borderWidth: 1 },
  signOutText: { color: '#C4855A', fontFamily: 'Nunito_700Bold', fontSize: 15 },
  /* ── Modal ── */
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  modalSheet: { backgroundColor: '#F0F4EF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 40, maxHeight: '55%' },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(122,158,126,0.3)', alignSelf: 'center', marginBottom: 16 },
  modalTitle: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#2C3E2D', marginBottom: 16 },
  modalSearchBar: { height: 46, borderRadius: 23, backgroundColor: 'rgba(255,255,255,0.35)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, gap: 8, marginBottom: 16 },
  modalSearchInput: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#2C3E2D', padding: 0 },
  gpsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(122,158,126,0.1)' },
  gpsLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#7A9E7E' },
  gpsAddr: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 2 },
  savedLabel: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#7A8C7B', marginTop: 16, marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  addrRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: 'rgba(122,158,126,0.08)' },
  addrLabel: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#2C3E2D' },
  addrText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 1 },
  modalCloseBtn: { marginTop: 16, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  modalCloseText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#7A8C7B' },
});
