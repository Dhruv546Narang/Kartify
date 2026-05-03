/**
 * useOnDeviceSearch — Hook that manages on-device search across
 * connected grocery platforms using hidden WebViews.
 *
 * This replaces the backend-dependent useSearch hook.
 * Results arrive asynchronously as each platform finishes loading.
 */

import { useState, useCallback, useRef } from 'react';
import type { ScrapedProduct } from '../components/WebViewSearcher';

export interface GroupedProduct {
  id: string;
  name: string;
  brand: string;
  unit: string;
  image: string;
  image_url: string;
  catalog_id: string | null;
  platforms: PlatformPrice[];
}

export interface PlatformPrice {
  platform: string;
  price: number;
  original_price: number;
  eta: string;
  delivery_fee: number;
  surge_charge: number;
  in_stock: boolean;
  platform_product_id: string;
  deeplink: string;
  store_name: string;
}

interface SearchState {
  results: GroupedProduct[];
  isLoading: boolean;
  error: string | null;
  query: string;
  count: number;
  sort: string;
  cached: boolean;
  source: string;
  /** Per-platform status */
  platformStatus: Record<string, 'pending' | 'loading' | 'done' | 'error'>;
  /** Platforms currently being searched */
  activePlatforms: string[];
}

export function useOnDeviceSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    query: '',
    count: 0,
    sort: 'best_match',
    cached: false,
    source: 'on-device',
    platformStatus: {},
    activePlatforms: [],
  });

  const allProductsRef = useRef<Record<string, ScrapedProduct[]>>({});

  /** Group raw scraped products across platforms into GroupedProducts */
  const groupProducts = useCallback((allProducts: Record<string, ScrapedProduct[]>): GroupedProduct[] => {
    const flat: ScrapedProduct[] = [];
    Object.values(allProducts).forEach(arr => flat.push(...arr));

    if (flat.length === 0) return [];

    // Simple grouping: normalize name + unit as key
    const groups: Record<string, GroupedProduct> = {};
    let idx = 0;

    for (const p of flat) {
      // Normalize the name for grouping
      const normName = p.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const normUnit = (p.unit || '').toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
      const key = `${normName}__${normUnit}`;

      // Try to find an existing group with similar name
      let matched = groups[key];
      if (!matched) {
        // Fuzzy match: check if any existing group name contains this name or vice versa
        for (const [existingKey, existingGroup] of Object.entries(groups)) {
          const existingNorm = existingGroup.name.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim();
          if (existingNorm.includes(normName) || normName.includes(existingNorm)) {
            if (existingKey.endsWith(`__${normUnit}`) || !normUnit) {
              matched = existingGroup;
              break;
            }
          }
        }
      }

      if (matched) {
        // Add this platform's price to the existing group
        // Only add if this platform isn't already in the group
        if (!matched.platforms.some(pl => pl.platform === p.platform)) {
          matched.platforms.push({
            platform: p.platform,
            price: p.price,
            original_price: p.price,
            eta: '',
            delivery_fee: 0,
            surge_charge: 0,
            in_stock: p.in_stock,
            platform_product_id: '',
            deeplink: p.deeplink,
            store_name: '',
          });
        }
        // Update image if the group doesn't have one
        if (!matched.image && p.image) {
          matched.image = p.image;
          matched.image_url = p.image;
        }
      } else {
        // Create a new group
        const gId = `od_${idx++}`;
        groups[key] = {
          id: gId,
          name: p.name,
          brand: '',
          unit: p.unit,
          image: p.image,
          image_url: p.image,
          catalog_id: null,
          platforms: [{
            platform: p.platform,
            price: p.price,
            original_price: p.price,
            eta: '',
            delivery_fee: 0,
            surge_charge: 0,
            in_stock: p.in_stock,
            platform_product_id: '',
            deeplink: p.deeplink,
            store_name: '',
          }],
        };
      }
    }

    // Sort each group's platforms by price (cheapest first)
    const result = Object.values(groups).map(g => {
      g.platforms.sort((a, b) => a.price - b.price);
      return g;
    });

    // Sort groups: those with more platforms first, then by cheapest price
    result.sort((a, b) => {
      if (b.platforms.length !== a.platforms.length) return b.platforms.length - a.platforms.length;
      return (a.platforms[0]?.price || 999) - (b.platforms[0]?.price || 999);
    });

    return result;
  }, []);

  /** Start a new search */
  const startSearch = useCallback((query: string, connectedPlatforms: string[]) => {
    if (!query.trim()) return;

    allProductsRef.current = {};

    const initialStatus: Record<string, 'pending'> = {};
    connectedPlatforms.forEach(p => { initialStatus[p] = 'pending'; });

    setState({
      results: [],
      isLoading: true,
      error: null,
      query: query.trim(),
      count: 0,
      sort: 'best_match',
      cached: false,
      source: 'on-device',
      platformStatus: initialStatus,
      activePlatforms: connectedPlatforms,
    });
  }, []);

  /** Called when a platform finishes returning results */
  const onPlatformResults = useCallback((platformId: string, products: ScrapedProduct[]) => {
    allProductsRef.current[platformId] = products;

    setState(prev => {
      const newStatus = { ...prev.platformStatus, [platformId]: 'done' as const };
      const allDone = Object.values(newStatus).every(s => s === 'done' || s === 'error');
      const grouped = groupProducts(allProductsRef.current);

      return {
        ...prev,
        results: grouped,
        count: grouped.length,
        isLoading: !allDone,
        platformStatus: newStatus,
      };
    });
  }, [groupProducts]);

  /** Called when a platform encounters an error */
  const onPlatformError = useCallback((platformId: string, error: string) => {
    setState(prev => {
      const newStatus = { ...prev.platformStatus, [platformId]: 'error' as const };
      const allDone = Object.values(newStatus).every(s => s === 'done' || s === 'error');

      return {
        ...prev,
        isLoading: !allDone,
        platformStatus: newStatus,
        error: prev.error ? `${prev.error}; ${error}` : error,
      };
    });
  }, []);

  /** Clear all results */
  const clearResults = useCallback(() => {
    allProductsRef.current = {};
    setState({
      results: [],
      isLoading: false,
      error: null,
      query: '',
      count: 0,
      sort: 'best_match',
      cached: false,
      source: 'on-device',
      platformStatus: {},
      activePlatforms: [],
    });
  }, []);

  return {
    ...state,
    startSearch,
    onPlatformResults,
    onPlatformError,
    clearResults,
  };
}
