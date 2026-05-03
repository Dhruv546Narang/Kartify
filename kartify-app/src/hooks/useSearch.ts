/**
 * useSearch — Custom hook for product search functionality.
 *
 * Updated to consume the new grouped response format from the
 * backend enrichment pipeline. Products arrive pre-grouped with
 * per-platform pricing, so no client-side grouping is needed.
 */

import { useState, useCallback } from 'react';
import client from '../api/client';

interface PlatformPrice {
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

interface GroupedProduct {
  id: string;
  name: string;
  brand: string;
  unit: string;
  image: string;
  image_url: string;
  catalog_id: string | null;
  platforms: PlatformPrice[];
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
}

interface SearchOptions {
  lat?: number;
  lon?: number;
  pincode?: string;
  sort?: string;
  platform?: string;
}

export type { PlatformPrice, GroupedProduct };

export function useSearch() {
  const [state, setState] = useState<SearchState>({
    results: [],
    isLoading: false,
    error: null,
    query: '',
    count: 0,
    sort: 'best_match',
    cached: false,
    source: 'live',
  });

  const search = useCallback(async (query: string, options?: SearchOptions) => {
    if (!query.trim()) return;

    setState((prev) => ({ ...prev, isLoading: true, error: null, query }));

    try {
      const response = await client.get('/search', {
        params: {
          q: query.trim(),
          lat: options?.lat,
          lon: options?.lon,
          pincode: options?.pincode,
          sort: options?.sort,
          platform: options?.platform,
        },
      });

      setState({
        results: response.data.results || [],
        isLoading: false,
        error: null,
        query: response.data.query,
        count: response.data.count || 0,
        sort: response.data.sort || 'best_match',
        cached: response.data.cached,
        source: response.data.source || 'live',
      });
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        typeof (error as { response?: { data?: { detail?: string } } }).response?.data?.detail ===
          'string'
          ? (error as { response?: { data?: { detail?: string } } }).response?.data?.detail
          : 'Search failed';
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: message || 'Search failed',
      }));
    }
  }, []);

  const clearResults = useCallback(() => {
    setState({
      results: [],
      isLoading: false,
      error: null,
      query: '',
      count: 0,
      sort: 'best_match',
      cached: false,
      source: 'live',
    });
  }, []);

  return {
    ...state,
    search,
    clearResults,
  };
}
