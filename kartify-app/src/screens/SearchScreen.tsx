import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Pressable, ScrollView,
  StatusBar, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSearch, GroupedProduct } from '../hooks/useSearch';
import { useLocationWeather } from '../hooks/useLocationWeather';
import client from '../api/client';
import { PLATFORM_STYLES } from '../components/PlatformBadge';

/* ═══════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════ */

interface SuggestionsResponse {
  query: string;
  suggestions: string[];
}

/* ═══════════════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════════════ */

const TRENDING = [
  'Monster Energy Drink', 'Milk 1 litre', 'Eggs 12 pcs', 'Bread',
  'Aata 5kg', 'Curd', 'Banana', 'Cold drink',
];
const SORTS = ['Best Match', 'Cheapest', 'Fastest'];
const FILTERS = ['All', 'In Stock'];

/* ═══════════════════════════════════════════════════════
   UTILS
   ═══════════════════════════════════════════════════════ */

const topFallback = (q: string) => {
  const n = q.toLowerCase().trim();
  if (!n) return TRENDING.slice(0, 7);
  const f = TRENDING.filter(i => i.toLowerCase().includes(n));
  return (f.length ? f : TRENDING).slice(0, 7);
};

function formatINR(v: number) {
  return `₹${Math.round(v).toLocaleString('en-IN')}`;
}

/* ═══════════════════════════════════════════════════════
   RESULT CARD — Full name, 2-line, platform price pills
   ═══════════════════════════════════════════════════════ */

function ResultCard({ item, onPress }: { item: GroupedProduct; onPress: () => void }) {
  const [imgErr, setImgErr] = useState(false);
  const cheapest = item.platforms[0];
  const imageUri = item.image_url || item.image || '';

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
          {item.platforms.slice(0, 3).map((p, idx) => {
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
          {item.platforms.length > 3 && (
            <Text style={styles.pillMore}>+{item.platforms.length - 3} more</Text>
          )}
        </View>
      </View>

      {/* Right: cheapest price, count */}
      <View style={styles.resultRight}>
        <Text style={styles.resultPrice}>{formatINR(cheapest?.price || 0)}</Text>
        <Text style={styles.resultPlatCount}>
          {item.platforms.length > 1 ? `${item.platforms.length} platforms` : cheapest?.platform || ''}
        </Text>
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
  const [suggestions, setSuggestions] = useState<string[]>(TRENDING.slice(0, 7));
  const [loadingSug, setLoadingSug] = useState(false);
  const [activeFilter, setActiveFilter] = useState('All');
  const [activeSort, setActiveSort] = useState('Best Match');
  const { lat, lon, pincode } = useLocationWeather();
  const { results, isLoading, error, query, count, cached, source, search } = useSearch();

  // Handle autoFocus & filters from route params
  useEffect(() => {
    if (route.params?.autoFocus) searchInputRef.current?.focus();
    if (route.params?.platformFilter) {
      const pf = route.params.platformFilter;
      setQueryInput(pf);
      runSearch(pf);
    }
    if (route.params?.categoryName) {
      setQueryInput(route.params.categoryName);
      runSearch(route.params.categoryName);
    }
  }, [route.params?.autoFocus, route.params?.platformFilter, route.params?.categoryName]);

  // Suggestions
  useEffect(() => {
    let alive = true;
    const timer = setTimeout(async () => {
      setLoadingSug(true);
      try {
        const res = await client.get<SuggestionsResponse>(
          '/search/suggestions', { params: { q: queryInput.trim() } }
        );
        if (!alive) return;
        const s = res.data?.suggestions || [];
        setSuggestions(s.length ? s.slice(0, 7) : topFallback(queryInput));
      } catch {
        if (alive) setSuggestions(topFallback(queryInput));
      } finally {
        if (alive) setLoadingSug(false);
      }
    }, 220);
    return () => { alive = false; clearTimeout(timer); };
  }, [queryInput]);

  // Map sort chip label to API param
  const SORT_MAP: Record<string, string> = {
    'Best Match': 'best_match',
    'Cheapest': 'cheapest',
    'Fastest': 'fastest',
  };

  // Apply client-side stock filter only (sorting is done by the API)
  const displayResults = useMemo(() => {
    let items = results ?? [];

    // Stock filter (client-side — not a backend param)
    if (activeFilter === 'In Stock') {
      items = items.map(g => ({
        ...g,
        platforms: g.platforms.filter(p => p.in_stock !== false),
      })).filter(g => g.platforms.length > 0);
    }

    return items;
  }, [results, activeFilter]);

  const runSearch = async (raw: string, sort?: string) => {
    const t = raw.trim();
    if (!t) return;
    setQueryInput(t);
    const sortParam = sort || SORT_MAP[activeSort] || 'best_match';
    await search(t, { lat: lat ?? undefined, lon: lon ?? undefined, pincode: pincode ?? undefined, sort: sortParam });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Explore</Text>
        </View>

        {/* Search input */}
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={18} color="#7A8C7B" />
          <TextInput ref={searchInputRef} style={styles.searchInput}
            placeholder="Search milk, eggs, bread..."
            placeholderTextColor="#7A8C7B"
            value={queryInput} onChangeText={setQueryInput}
            onSubmitEditing={() => runSearch(queryInput)}
            returnKeyType="search" />
          {queryInput.length > 0 ? (
            <Pressable onPress={() => setQueryInput('')}>
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
            <Pressable key={s} onPress={() => {
              setActiveSort(s);
              if (queryInput.trim()) runSearch(queryInput, SORT_MAP[s]);
            }}
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

        {/* Suggestions */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sugRow}>
          {suggestions.map(s => (
            <Pressable key={s} onPress={() => runSearch(s)}
              style={({ pressed }) => [styles.sugChip, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
              <Text style={styles.sugText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Count */}
        <Text style={styles.countText}>
          {displayResults.length} results for "{query || queryInput || '...'}"
          {cached ? ' • cached' : ''}{source === 'mock' ? ' • demo' : ''}
        </Text>

        {/* Error */}
        {error && (
          <View style={styles.errCard}>
            <Text style={styles.errText}>{error}</Text>
          </View>
        )}

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
                    image: item.image_url,
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
              </View>
            ) : (
              <View style={styles.empty}>
                <Text style={{ fontSize: 56 }}>🛍️</Text>
                <Text style={styles.emptyH}>No products yet</Text>
                <Text style={styles.emptyB}>
                  Search for any grocery product to compare live prices.
                </Text>
                <Pressable onPress={() => runSearch('milk')}
                  style={({ pressed }) => [styles.emptyCta, { transform: [{ scale: pressed ? 0.96 : 1 }] }]}>
                  <Text style={styles.emptyCtaT}>Try "milk"</Text>
                </Pressable>
              </View>
            )
          }
        />
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

  topBar: { height: 50, justifyContent: 'center' },
  title: { fontFamily: 'PlayfairDisplay_700Bold', fontSize: 22, color: '#2C3E2D' },

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

  countText: {
    marginTop: 8, marginBottom: 8,
    fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B',
  },
  errCard: {
    marginBottom: 10, padding: 14, borderRadius: 16,
    backgroundColor: 'rgba(192,97,74,0.1)',
  },
  errText: { fontFamily: 'Nunito_600SemiBold', color: '#C0614A', fontSize: 13 },

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
    fontSize: 14,
    fontFamily: 'Nunito_700Bold',
    color: '#2C3E2D',
    lineHeight: 20,
    minHeight: 40,
  },
  resultUnit: {
    fontSize: 11, color: '#7A8C7B',
    fontFamily: 'Nunito_600SemiBold', marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row', flexWrap: 'wrap',
    gap: 6, marginTop: 8,
  },
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
  resultPlatCount: {
    fontSize: 10, color: '#7A8C7B', marginTop: 2,
    fontFamily: 'Nunito_600SemiBold',
  },
  chevron: { fontSize: 16, color: '#7A8C7B', marginTop: 4 },

  /* ── Empty & Loading ── */
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyH: {
    marginTop: 10, fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 18, color: '#2C3E2D',
  },
  emptyB: {
    marginTop: 6, fontFamily: 'Nunito_600SemiBold',
    fontSize: 14, color: '#7A8C7B', textAlign: 'center', maxWidth: 260,
  },
  emptyCta: {
    marginTop: 16, height: 44, borderRadius: 22,
    paddingHorizontal: 24, justifyContent: 'center',
    backgroundColor: '#7A9E7E',
  },
  emptyCtaT: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },
  loading: { paddingTop: 50, alignItems: 'center' },
});
