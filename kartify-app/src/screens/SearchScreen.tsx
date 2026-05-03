import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Linking, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { PLATFORM_STYLES } from '../components/PlatformBadge';
import { usePlatformStore, PLATFORM_CONFIGS } from '../store/platformStore';
import { useOnDeviceSearch, type GroupedProduct } from '../hooks/useOnDeviceSearch';
import WebViewSearcher, { type ScrapedProduct } from '../components/WebViewSearcher';

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const TRENDING = [
  'Milk 1 litre', 'Eggs 12 pcs', 'Bread', 'Monster Energy',
  'Aata 5kg', 'Curd', 'Banana', 'Cold drink',
];
const SORTS = ['Best Match', 'Cheapest', 'Most Platforms'];
const FILTERS = ['All', 'In Stock'];

/* ═══════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════ */

function formatINR(v: number) {
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

/* ═══════════════════════════════════════════════════════
   PLATFORM STATUS DOTS (shows which platforms are searching)
   ═══════════════════════════════════════════════════════ */

function PlatformStatusRow({ platformStatus }: { platformStatus: Record<string, string> }) {
  if (Object.keys(platformStatus).length === 0) return null;

  return (
    <View style={styles.statusRow}>
      {Object.entries(platformStatus).map(([platId, status]) => {
        const config = PLATFORM_CONFIGS.find(p => p.id === platId);
        if (!config) return null;
        const ps = PLATFORM_STYLES[platId] || { bg: '#888' };
        return (
          <View key={platId} style={styles.statusChip}>
            <View style={[styles.statusDot, {
              backgroundColor: status === 'done' ? '#4F7A55'
                : status === 'error' ? '#C4855A'
                : ps.bg || config.color,
            }]} />
            <Text style={styles.statusName}>{config.name.split(' ')[0]}</Text>
            {status === 'loading' || status === 'pending' ? (
              <ActivityIndicator size={10} color={config.color} style={{ marginLeft: 2 }} />
            ) : status === 'done' ? (
              <Ionicons name="checkmark" size={12} color="#4F7A55" />
            ) : (
              <Ionicons name="close" size={12} color="#C4855A" />
            )}
          </View>
        );
      })}
    </View>
  );
}

/* ═══════════════════════════════════════════════════════
   RESULT CARD
   ═══════════════════════════════════════════════════════ */

function ResultCard({ item, onPress }: { item: GroupedProduct; onPress: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const cheapest = item.platforms[0];
  const imageUri = item.image_url || item.image || '';

  useEffect(() => { setImgErr(false); }, [imageUri]);

  return (
    <Pressable onPress={onPress}
      style={({ pressed }) => [styles.resultCard, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
      {/* Image */}
      <View style={styles.resultImgWrap}>
        {!imgErr && imageUri ? (
          <Image source={{ uri: imageUri }} style={{ width: 52, height: 52 }}
            resizeMode="contain" onError={() => setImgErr(true)} />
        ) : (
          <Ionicons name="bag-handle-outline" size={24} color="#7A8C7B" />
        )}
      </View>

      {/* Center: name, unit, pills */}
      <View style={styles.resultCenter}>
        <Text numberOfLines={2} style={styles.resultName}>
          {item.name}
        </Text>
        {item.unit ? <Text style={styles.resultUnit}>{item.unit}</Text> : null}

        {/* Platform price pills */}
        <View style={styles.pillRow}>
          {item.platforms.slice(0, 4).map((p, idx) => {
            const ps = PLATFORM_STYLES[p.platform?.toLowerCase()] || { bg: '#888' };
            return (
              <View key={idx} style={[styles.pricePill, idx === 0 && styles.pricePillFirst]}>
                <View style={[styles.pillDot, { backgroundColor: ps.bg }]} />
                <Text style={[styles.pillPrice, idx === 0 && styles.pillPriceFirst]}>
                  ₹{Math.round(p.price)}
                </Text>
              </View>
            );
          })}
          {item.platforms.length > 4 && (
            <Text style={styles.pillMore}>+{item.platforms.length - 4}</Text>
          )}
        </View>
      </View>

      {/* Right: cheapest price */}
      <View style={styles.resultRight}>
        <Text style={styles.resultPrice}>{formatINR(cheapest?.price || 0)}</Text>
        <Text style={styles.resultPlatCount}>
          {item.platforms.length > 1 ? `${item.platforms.length} platforms` : cheapest?.platform || ''}
        </Text>
        {item.platforms.length > 1 && (() => {
          const saving = item.platforms[item.platforms.length - 1].price - item.platforms[0].price;
          if (saving <= 0) return null;
          return <Text style={styles.savingBadge}>Save ₹{Math.round(saving)}</Text>;
        })()}
        <Text style={styles.chevron}>›</Text>
      </View>
    </Pressable>
  );
}

/* ═══════════════════════════════════════════════════════
   MAIN SCREEN
   ═══════════════════════════════════════════════════════ */

export default function SearchScreen({ navigation, route }: { navigation: any; route: any }) {
  const searchInputRef = useRef<TextInput>(null);
  const [queryInput, setQueryInput] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSort, setActiveSort] = useState('Best Match');

  // Platform store
  const connectedPlatforms = usePlatformStore(s => Object.keys(s.sessions));
  const hasConnected = connectedPlatforms.length > 0;

  // On-device search
  const {
    results, isLoading, error, query, count, source,
    platformStatus, activePlatforms,
    startSearch, onPlatformResults, onPlatformError, clearResults,
  } = useOnDeviceSearch();

  // Active search query for WebView searchers
  const [searchQuery, setSearchQuery] = useState('');

  // Handle route params
  useEffect(() => {
    if (route.params?.autoFocus) searchInputRef.current?.focus();
    if (route.params?.categoryName) {
      setQueryInput(route.params.categoryName);
      runSearch(route.params.categoryName);
    }
  }, [route.params?.autoFocus, route.params?.categoryName]);

  const runSearch = (raw: string) => {
    const t = raw.trim();
    if (!t) return;
    if (!hasConnected) return; // Can't search without connected accounts
    setQueryInput(t);
    setSearchQuery(t);
    startSearch(t, connectedPlatforms);
  };

  // Apply sort & filter
  const displayResults = useMemo(() => {
    let items = results ?? [];

    if (activeFilter === 'In Stock') {
      items = items.map(g => ({
        ...g,
        platforms: g.platforms.filter(p => p.in_stock !== false),
      })).filter(g => g.platforms.length > 0);
    }

    if (activeSort === 'Cheapest') {
      items = [...items].sort((a, b) => (a.platforms[0]?.price || 999) - (b.platforms[0]?.price || 999));
    } else if (activeSort === 'Most Platforms') {
      items = [...items].sort((a, b) => b.platforms.length - a.platforms.length);
    }

    return items;
  }, [results, activeFilter, activeSort]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Explore</Text>
          {/* Connect accounts button */}
          <Pressable onPress={() => navigation.getParent()?.navigate('ConnectedAccounts')}
            style={({ pressed }) => [styles.connectAccountsBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Ionicons name="link-outline" size={16} color={hasConnected ? '#4F7A55' : '#C4855A'} />
            <Text style={[styles.connectAccountsText, { color: hasConnected ? '#4F7A55' : '#C4855A' }]}>
              {hasConnected ? `${connectedPlatforms.length} linked` : 'Link accounts'}
            </Text>
          </Pressable>
        </View>

        {/* No connected accounts banner */}
        {!hasConnected && (
          <Pressable onPress={() => navigation.getParent()?.navigate('ConnectedAccounts')}
            style={({ pressed }) => [styles.connectBanner, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
            <Ionicons name="key-outline" size={22} color="#C4855A" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.connectBannerTitle}>Connect your grocery accounts</Text>
              <Text style={styles.connectBannerDesc}>
                Log in to Blinkit, Zepto, BigBasket etc. to compare live prices from your own accounts
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#C4855A" />
          </Pressable>
        )}

        {/* Search input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#7A8C7B" />
          <TextInput ref={searchInputRef} style={styles.searchInput}
            placeholder={hasConnected ? 'Search milk, eggs, bread...' : 'Connect accounts first to search'}
            placeholderTextColor="#7A8C7B"
            value={queryInput} onChangeText={setQueryInput}
            onSubmitEditing={() => runSearch(queryInput)}
            returnKeyType="search"
            editable={hasConnected} />
          {queryInput.length > 0 ? (
            <Pressable onPress={() => { setQueryInput(''); clearResults(); setSearchQuery(''); }}>
              <Ionicons name="close-circle" size={20} color="#7A8C7B" />
            </Pressable>
          ) : (
            <Ionicons name="mic-outline" size={18} color="#7A9E7E" />
          )}
        </View>

        {/* Sort & Filter chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}>
          {SORTS.map(s => (
            <Pressable key={s} onPress={() => setActiveSort(s)}
              style={({ pressed }) => [
                styles.chip, activeSort === s && styles.chipActive,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Text style={[styles.chipText, activeSort === s && styles.chipTextActive]}>{s}</Text>
            </Pressable>
          ))}
          <View style={styles.chipDivider} />
          {FILTERS.map(f => (
            <Pressable key={f} onPress={() => setActiveFilter(f)}
              style={({ pressed }) => [
                styles.chip, activeFilter === f && styles.chipActive,
                { transform: [{ scale: pressed ? 0.96 : 1 }] },
              ]}>
              <Text style={[styles.chipText, activeFilter === f && styles.chipTextActive]}>{f}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Trending suggestions */}
        {!searchQuery && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.sugRow}>
            {TRENDING.map(s => (
              <Pressable key={s} onPress={() => runSearch(s)}
                style={({ pressed }) => [styles.sugChip, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                <Text style={styles.sugText}>{s}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* Platform search status */}
        <PlatformStatusRow platformStatus={platformStatus} />

        {/* Count */}
        <Text style={styles.countText}>
          {displayResults.length} results{query ? ` for "${query}"` : ''}
          {source === 'on-device' && searchQuery ? ' · live from your accounts' : ''}
        </Text>

        {/* Results list */}
        <FlatList
          data={displayResults}
          keyExtractor={i => i.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <ResultCard
              item={item}
              onPress={() =>
                navigation.getParent()?.navigate('ProductDetail', {
                  productData: {
                    id: item.id,
                    name: item.name,
                    unit: item.unit,
                    image: item.image_url || item.image,
                    platforms: item.platforms,
                  },
                })
              }
            />
          )}
          ListEmptyComponent={
            isLoading ? (
              <View style={styles.loading}>
                <ActivityIndicator size="large" color="#4F7A55" />
                <Text style={styles.loadingText}>Searching your connected platforms...</Text>
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={{ fontSize: 56 }}>🛍️</Text>
                <Text style={styles.emptyH}>
                  {hasConnected ? 'Search for any product' : 'Connect your accounts first'}
                </Text>
                <Text style={styles.emptyB}>
                  {hasConnected
                    ? 'We\'ll check live prices across all your connected grocery platforms.'
                    : 'Link your Blinkit, Zepto, BigBasket accounts to start comparing prices.'
                  }
                </Text>
                {hasConnected ? (
                  <Pressable onPress={() => runSearch('milk')}
                    style={({ pressed }) => [styles.emptyCta, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                    <Text style={styles.emptyCtaT}>Try "milk"</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={() => navigation.getParent()?.navigate('ConnectedAccounts')}
                    style={({ pressed }) => [styles.emptyCta, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                    <Text style={styles.emptyCtaT}>Connect Accounts</Text>
                  </Pressable>
                )}
              </View>
            )
          }
        />

        {/* Hidden WebView searchers — one per connected platform */}
        {searchQuery && activePlatforms.map(platId => (
          <WebViewSearcher
            key={`${platId}_${searchQuery}`}
            platformId={platId}
            query={searchQuery}
            onResults={(products) => onPlatformResults(platId, products)}
            onError={(err) => onPlatformError(platId, err)}
          />
        ))}
      </View>
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════ */

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },
  container: { flex: 1, paddingHorizontal: 16 },

  topBar: { height: 50, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#2C3E2D' },
  connectAccountsBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  connectAccountsText: { fontFamily: 'Nunito_700Bold', fontSize: 12 },

  connectBanner: { marginBottom: 10, borderRadius: 16, padding: 14, backgroundColor: 'rgba(196,133,90,0.08)', borderWidth: 1, borderColor: 'rgba(196,133,90,0.2)', flexDirection: 'row', alignItems: 'center' },
  connectBannerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#C4855A' },
  connectBannerDesc: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 2 },

  searchBar: {
    height: 50, borderRadius: 25,
    backgroundColor: 'rgba(255,255,255,0.35)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.55)',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, gap: 8,
  },
  searchInput: {
    flex: 1, fontFamily: 'Nunito_600SemiBold',
    fontSize: 14, color: '#2C3E2D', padding: 0,
  },

  chipRow: { paddingTop: 10, gap: 8, alignItems: 'center' },
  chip: {
    height: 34, borderRadius: 17, paddingHorizontal: 14,
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.4)',
  },
  chipActive: {
    backgroundColor: 'rgba(122,158,126,0.85)',
    borderColor: 'rgba(255,255,255,0.5)',
  },
  chipText: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#2C3E2D' },
  chipTextActive: { color: '#fff' },
  chipDivider: { width: 1, height: 20, backgroundColor: 'rgba(122,158,126,0.2)' },

  sugRow: { paddingTop: 10, gap: 8 },
  sugChip: {
    height: 30, borderRadius: 15, paddingHorizontal: 12,
    justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  sugText: { fontFamily: 'Nunito_600SemiBold', fontSize: 11, color: '#7A8C7B' },

  statusRow: { flexDirection: 'row', flexWrap: 'wrap', paddingTop: 8, gap: 6 },
  statusChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusName: { fontFamily: 'Nunito_600SemiBold', fontSize: 10, color: '#7A8C7B' },

  countText: {
    marginTop: 8, marginBottom: 8,
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B',
  },

  /* ── Result Card ── */
  resultCard: {
    marginBottom: 10, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)',
    padding: 14, minHeight: 100,
  },
  resultImgWrap: {
    width: 64, height: 64, borderRadius: 12,
    backgroundColor: 'rgba(240,244,239,0.9)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, position: 'absolute', top: 14, left: 14,
  },
  resultCenter: { marginLeft: 80, paddingRight: 80 },
  resultName: {
    fontSize: 14, fontFamily: 'Nunito_700Bold',
    color: '#2C3E2D', lineHeight: 20, minHeight: 40,
  },
  resultUnit: {
    fontSize: 11, color: '#7A8C7B',
    fontFamily: 'Nunito_600SemiBold', marginTop: 2,
  },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  pricePill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(0,0,0,0.04)',
    borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3,
  },
  pricePillFirst: {
    backgroundColor: 'rgba(79,122,85,0.1)',
    borderWidth: 1, borderColor: 'rgba(79,122,85,0.3)',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3 },
  pillPrice: { fontSize: 11, fontFamily: 'Nunito_600SemiBold', color: '#7A8C7B' },
  pillPriceFirst: { fontFamily: 'Nunito_700Bold', color: '#4F7A55' },
  pillMore: { fontSize: 11, color: '#7A8C7B', alignSelf: 'center' },

  resultRight: { position: 'absolute', top: 14, right: 14, alignItems: 'flex-end' },
  resultPrice: { fontSize: 18, fontFamily: 'Nunito_700Bold', color: '#4F7A55' },
  resultPlatCount: { fontSize: 10, color: '#7A8C7B', marginTop: 2, fontFamily: 'Nunito_600SemiBold' },
  savingBadge: { fontSize: 10, color: '#C4855A', fontFamily: 'Nunito_700Bold', marginTop: 3, backgroundColor: 'rgba(196,133,90,0.1)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  chevron: { fontSize: 16, color: '#7A8C7B', marginTop: 4 },

  /* ── Empty & Loading ── */
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyH: { marginTop: 10, fontFamily: 'PlayfairDisplay_700Bold', fontSize: 18, color: '#2C3E2D' },
  emptyB: { marginTop: 6, fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7A8C7B', textAlign: 'center', maxWidth: 280 },
  emptyCta: { marginTop: 16, height: 44, borderRadius: 22, paddingHorizontal: 24, justifyContent: 'center', backgroundColor: '#7A9E7E' },
  emptyCtaT: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  loading: { paddingTop: 50, alignItems: 'center' },
  loadingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B', marginTop: 12 },
});
