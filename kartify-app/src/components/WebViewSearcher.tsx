/**
 * WebViewSearcher
 *
 * A hidden WebView component that performs a search on a single
 * grocery platform and extracts product data from the results page.
 * This is the core engine of Kartify's on-device price comparison.
 *
 * Usage:
 *   <WebViewSearcher
 *     platformId="blinkit"
 *     query="milk"
 *     onResults={(products) => ...}
 *     onError={(err) => ...}
 *   />
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { PLATFORM_CONFIGS, usePlatformStore } from '../store/platformStore';

export interface ScrapedProduct {
  name: string;
  price: number;
  image: string;
  unit: string;
  platform: string;
  in_stock: boolean;
  deeplink: string;
}

interface Props {
  platformId: string;
  query: string;
  onResults: (products: ScrapedProduct[]) => void;
  onError: (error: string) => void;
  onLoadingChange?: (loading: boolean) => void;
}

export default function WebViewSearcher({ platformId, query, onResults, onError, onLoadingChange }: Props) {
  const webViewRef = useRef<WebView>(null);
  const config = PLATFORM_CONFIGS.find(p => p.id === platformId);
  const session = usePlatformStore(s => s.sessions[platformId]);
  const [injected, setInjected] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Timeout: if we don't get results within 12s, report error
    timeoutRef.current = setTimeout(() => {
      onError(`${config?.name || platformId}: search timed out`);
    }, 12000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [query, platformId]);

  const handleMessage = useCallback((event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'SEARCH_RESULTS') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        const products: ScrapedProduct[] = (data.products || []).filter(
          (p: ScrapedProduct) => p.name && p.name.length > 2 && p.price > 0
        );
        onResults(products);
      } else if (data.type === 'SEARCH_ERROR') {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onError(`${config?.name || platformId}: ${data.error}`);
      }
    } catch (e) {
      // ignore parse errors
    }
  }, [onResults, onError, config, platformId]);

  const handleLoadEnd = useCallback(() => {
    onLoadingChange?.(false);
    if (!injected && webViewRef.current && config) {
      setInjected(true);
      // Wait for the page to fully render (SPA hydration)
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(config.extractScript + '\ntrue;');
      }, 3000);

      // Retry extraction after a longer delay in case the first one was too early
      setTimeout(() => {
        webViewRef.current?.injectJavaScript(config.extractScript + '\ntrue;');
      }, 6000);
    }
  }, [injected, config]);

  if (!config) return null;

  const searchUrl = config.searchUrl(query);

  // Build cookie header if we have session data
  const cookieHeader = session?.cookies?.split('|||LS:')[0] || '';

  return (
    <View style={styles.hidden}>
      <WebView
        ref={webViewRef}
        source={{
          uri: searchUrl,
          headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
        }}
        style={{ width: 1, height: 1 }}
        onMessage={handleMessage}
        onLoadStart={() => {
          onLoadingChange?.(true);
          setInjected(false);
        }}
        onLoadEnd={handleLoadEnd}
        onError={() => {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          onError(`${config.name}: failed to load`);
        }}
        javaScriptEnabled
        domStorageEnabled
        sharedCookiesEnabled
        thirdPartyCookiesEnabled
        userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
        // Keep the WebView offscreen but still rendering
        pointerEvents="none"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  hidden: {
    width: 0,
    height: 0,
    overflow: 'hidden',
    position: 'absolute',
    top: -1000,
    left: -1000,
  },
});
