/**
 * Platform Sessions Store
 *
 * Manages the user's connected grocery platform accounts.
 * Stores session cookies captured from WebView logins so we
 * can make authenticated search requests on-device.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

export interface PlatformSession {
  platformId: string;
  cookies: string;          // raw cookie string from WebView
  connectedAt: number;      // timestamp
  displayName?: string;     // user-visible name or email on that platform
}

export interface PlatformConfig {
  id: string;
  name: string;
  color: string;
  textColor: string;
  icon: string;            // emoji fallback
  loginUrl: string;
  searchUrl: (q: string) => string;
  /** URL pattern that indicates a successful login */
  loginSuccessPattern: string;
  /** JS injected into the search results page to extract product data */
  extractScript: string;
  /** Deep link scheme to open the native app */
  appScheme?: string;
}

/** ── Platform Configurations ── */
export const PLATFORM_CONFIGS: PlatformConfig[] = [
  {
    id: 'blinkit',
    name: 'Blinkit',
    color: '#F5C842',
    textColor: '#000',
    icon: '🟡',
    loginUrl: 'https://blinkit.com/login',
    searchUrl: (q) => `https://blinkit.com/s/?q=${encodeURIComponent(q)}`,
    loginSuccessPattern: 'blinkit.com/$|blinkit.com/cn/',
    extractScript: `
      (function() {
        try {
          const products = [];
          // Blinkit uses product cards with specific classes
          const cards = document.querySelectorAll('[data-test-id="plp-product"], .Product__UpdatedPlpProductContainer-sc, div[class*="Product__"]');
          if (cards.length === 0) {
            // Fallback: try to find any product-like containers
            const items = document.querySelectorAll('a[href*="/prn/"]');
            items.forEach((el) => {
              const name = el.querySelector('div[class*="Product__ProductName"]')?.textContent?.trim()
                || el.querySelector('[class*="name"]')?.textContent?.trim()
                || el.textContent?.substring(0, 60)?.trim();
              const priceEl = el.querySelector('div[class*="Product__UpdatedPriceAndAtcRow"] div')
                || el.querySelector('[class*="price"]');
              const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
              const img = el.querySelector('img')?.src || '';
              const qty = el.querySelector('div[class*="Product__UpdatedProductQuantity"]')?.textContent?.trim()
                || el.querySelector('[class*="quantity"]')?.textContent?.trim() || '';
              if (name && name.length > 2) {
                products.push({
                  name: name.substring(0, 100),
                  price: parseFloat(priceText) || 0,
                  image: img,
                  unit: qty,
                  platform: 'blinkit',
                  in_stock: true,
                  deeplink: el.href || '',
                });
              }
            });
          } else {
            cards.forEach((card) => {
              const name = card.querySelector('[class*="ProductName"], [class*="name"]')?.textContent?.trim() || '';
              const priceEl = card.querySelector('[class*="Price"], [class*="price"]');
              const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
              const img = card.querySelector('img')?.src || '';
              const qty = card.querySelector('[class*="Quantity"], [class*="quantity"]')?.textContent?.trim() || '';
              const link = card.querySelector('a')?.href || card.closest('a')?.href || '';
              if (name && name.length > 2) {
                products.push({
                  name: name.substring(0, 100),
                  price: parseFloat(priceText) || 0,
                  image: img,
                  unit: qty,
                  platform: 'blinkit',
                  in_stock: true,
                  deeplink: link,
                });
              }
            });
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_RESULTS', platform: 'blinkit', products }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_ERROR', platform: 'blinkit', error: e.message }));
        }
      })();
    `,
    appScheme: 'blinkit://',
  },
  {
    id: 'zepto',
    name: 'Zepto',
    color: '#8B5CF6',
    textColor: '#fff',
    icon: '🟣',
    loginUrl: 'https://www.zeptonow.com/',
    searchUrl: (q) => `https://www.zeptonow.com/search?query=${encodeURIComponent(q)}`,
    loginSuccessPattern: 'zeptonow.com/$|zeptonow.com/cn/',
    extractScript: `
      (function() {
        try {
          const products = [];
          const cards = document.querySelectorAll('[data-testid*="product"], a[href*="/product/"]');
          cards.forEach((card) => {
            const name = card.querySelector('[class*="ProductName"], h5, [data-testid*="name"]')?.textContent?.trim()
              || card.querySelector('p, span')?.textContent?.trim() || '';
            const priceEl = card.querySelector('[class*="Price"], [data-testid*="price"]');
            const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
            const img = card.querySelector('img')?.src || '';
            const qty = card.querySelector('[class*="Quantity"], [class*="quantity"], [class*="weight"]')?.textContent?.trim() || '';
            const link = card.href || card.querySelector('a')?.href || '';
            if (name && name.length > 2) {
              products.push({
                name: name.substring(0, 100),
                price: parseFloat(priceText) || 0,
                image: img,
                unit: qty,
                platform: 'zepto',
                in_stock: true,
                deeplink: link,
              });
            }
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_RESULTS', platform: 'zepto', products }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_ERROR', platform: 'zepto', error: e.message }));
        }
      })();
    `,
    appScheme: 'zepto://',
  },
  {
    id: 'instamart',
    name: 'Swiggy Instamart',
    color: '#FF6B35',
    textColor: '#fff',
    icon: '🟠',
    loginUrl: 'https://www.swiggy.com/instamart',
    searchUrl: (q) => `https://www.swiggy.com/instamart/search?query=${encodeURIComponent(q)}`,
    loginSuccessPattern: 'swiggy.com/instamart$|swiggy.com/instamart/',
    extractScript: `
      (function() {
        try {
          const products = [];
          const cards = document.querySelectorAll('[data-testid*="product"], [class*="ProductCard"], a[href*="/instamart/item/"]');
          cards.forEach((card) => {
            const name = card.querySelector('[class*="productName"], [class*="ItemName"]')?.textContent?.trim()
              || card.querySelector('h3, h4, p')?.textContent?.trim() || '';
            const priceEl = card.querySelector('[class*="price"], [class*="Price"], [class*="rupee"]');
            const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
            const img = card.querySelector('img')?.src || '';
            const qty = card.querySelector('[class*="weight"], [class*="quantity"]')?.textContent?.trim() || '';
            const link = card.href || card.querySelector('a')?.href || '';
            if (name && name.length > 2) {
              products.push({
                name: name.substring(0, 100),
                price: parseFloat(priceText) || 0,
                image: img,
                unit: qty,
                platform: 'instamart',
                in_stock: true,
                deeplink: link,
              });
            }
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_RESULTS', platform: 'instamart', products }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_ERROR', platform: 'instamart', error: e.message }));
        }
      })();
    `,
    appScheme: 'swiggy://',
  },
  {
    id: 'bigbasket',
    name: 'BigBasket',
    color: '#89C73A',
    textColor: '#fff',
    icon: '🟢',
    loginUrl: 'https://www.bigbasket.com/auth/login/',
    searchUrl: (q) => `https://www.bigbasket.com/ps/?q=${encodeURIComponent(q)}`,
    loginSuccessPattern: 'bigbasket.com/$|bigbasket.com/cl/',
    extractScript: `
      (function() {
        try {
          const products = [];
          const cards = document.querySelectorAll('[qa="product"], li[class*="PaginateItems"], div[class*="SKUDeck"]');
          if (cards.length === 0) {
            // Fallback
            const items = document.querySelectorAll('a[href*="/pd/"]');
            items.forEach((el) => {
              const name = el.textContent?.substring(0, 80)?.trim() || '';
              if (name && name.length > 3) {
                products.push({
                  name,
                  price: 0,
                  image: el.querySelector('img')?.src || '',
                  unit: '',
                  platform: 'bigbasket',
                  in_stock: true,
                  deeplink: el.href || '',
                });
              }
            });
          } else {
            cards.forEach((card) => {
              const name = card.querySelector('[class*="ProdName"], [class*="prod-name"], a')?.textContent?.trim() || '';
              const priceEl = card.querySelector('[class*="discnt-price"], [class*="Price"], span.label-info');
              const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
              const img = card.querySelector('img')?.src || '';
              const qty = card.querySelector('[class*="qty"], [class*="weight"]')?.textContent?.trim() || '';
              const link = card.querySelector('a')?.href || '';
              if (name && name.length > 2) {
                products.push({
                  name: name.substring(0, 100),
                  price: parseFloat(priceText) || 0,
                  image: img,
                  unit: qty,
                  platform: 'bigbasket',
                  in_stock: true,
                  deeplink: link,
                });
              }
            });
          }
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_RESULTS', platform: 'bigbasket', products }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_ERROR', platform: 'bigbasket', error: e.message }));
        }
      })();
    `,
    appScheme: 'bigbasket://',
  },
  {
    id: 'jiomart',
    name: 'JioMart',
    color: '#0066CC',
    textColor: '#fff',
    icon: '🔵',
    loginUrl: 'https://www.jiomart.com/',
    searchUrl: (q) => `https://www.jiomart.com/search/${encodeURIComponent(q)}`,
    loginSuccessPattern: 'jiomart.com/$',
    extractScript: `
      (function() {
        try {
          const products = [];
          const cards = document.querySelectorAll('[class*="product-card"], [class*="plp-card"], li[class*="item"]');
          cards.forEach((card) => {
            const name = card.querySelector('[class*="plp-card-details-name"], [class*="product-name"], h3, a')?.textContent?.trim() || '';
            const priceEl = card.querySelector('[class*="plp-card-details-price"], [class*="final-price"], [class*="offer-price"]');
            const priceText = priceEl?.textContent?.replace(/[^0-9.]/g, '') || '0';
            const img = card.querySelector('img')?.src || '';
            const qty = card.querySelector('[class*="weight"], [class*="quantity"]')?.textContent?.trim() || '';
            const link = card.querySelector('a')?.href || '';
            if (name && name.length > 2) {
              products.push({
                name: name.substring(0, 100),
                price: parseFloat(priceText) || 0,
                image: img,
                unit: qty,
                platform: 'jiomart',
                in_stock: true,
                deeplink: link,
              });
            }
          });
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_RESULTS', platform: 'jiomart', products }));
        } catch(e) {
          window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SEARCH_ERROR', platform: 'jiomart', error: e.message }));
        }
      })();
    `,
    appScheme: 'jiomart://',
  },
];

const STORAGE_KEY = 'kartify_platform_sessions';

interface PlatformStore {
  sessions: Record<string, PlatformSession>;
  /** True while loading from disk */
  hydrated: boolean;

  hydrate: () => Promise<void>;
  connectPlatform: (platformId: string, cookies: string, displayName?: string) => Promise<void>;
  disconnectPlatform: (platformId: string) => Promise<void>;
  isConnected: (platformId: string) => boolean;
  getSession: (platformId: string) => PlatformSession | null;
  getConnectedPlatforms: () => string[];
}

export const usePlatformStore = create<PlatformStore>((set, get) => ({
  sessions: {},
  hydrated: false,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        set({ sessions: parsed, hydrated: true });
      } else {
        set({ hydrated: true });
      }
    } catch {
      set({ hydrated: true });
    }
  },

  connectPlatform: async (platformId, cookies, displayName) => {
    const session: PlatformSession = {
      platformId,
      cookies,
      connectedAt: Date.now(),
      displayName,
    };
    const next = { ...get().sessions, [platformId]: session };
    set({ sessions: next });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },

  disconnectPlatform: async (platformId) => {
    const next = { ...get().sessions };
    delete next[platformId];
    set({ sessions: next });
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  },

  isConnected: (platformId) => !!get().sessions[platformId],
  getSession: (platformId) => get().sessions[platformId] || null,
  getConnectedPlatforms: () => Object.keys(get().sessions),
}));
