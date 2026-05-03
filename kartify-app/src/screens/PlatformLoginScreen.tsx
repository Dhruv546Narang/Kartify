/**
 * PlatformLoginScreen
 *
 * Full-screen WebView that loads the platform's login page.
 * After login, we extract session cookies and store them
 * in the platform store for on-device search.
 */

import React, { useRef, useState, useCallback } from 'react';
import {
  ActivityIndicator, Pressable, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { usePlatformStore, PLATFORM_CONFIGS } from '../store/platformStore';

export default function PlatformLoginScreen({ route, navigation }: { route: any; navigation: any }) {
  const platformId = route.params?.platformId;
  const config = PLATFORM_CONFIGS.find(p => p.id === platformId);
  const { connectPlatform } = usePlatformStore();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(true);
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!config) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Text style={s.errorText}>Platform not found</Text>
          <Pressable onPress={() => navigation.goBack()} style={s.backLink}>
            <Text style={s.backLinkText}>Go Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const handleNavigationChange = useCallback((navState: WebViewNavigation) => {
    setCurrentUrl(navState.url);

    // Check if we've reached a URL that indicates successful login
    const pattern = new RegExp(config.loginSuccessPattern, 'i');
    if (pattern.test(navState.url) && !navState.url.includes('login') && !navState.url.includes('auth')) {
      // User appears to be logged in — extract cookies
      extractCookies();
    }
  }, [config]);

  const extractCookies = () => {
    if (!webViewRef.current) return;

    // Inject JS to capture cookies and any auth tokens
    webViewRef.current.injectJavaScript(`
      (function() {
        const cookies = document.cookie || '';
        const localStorage_data = {};
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes('token') || key.includes('auth') || key.includes('session') || key.includes('user'))) {
              localStorage_data[key] = localStorage.getItem(key);
            }
          }
        } catch(e) {}

        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'COOKIES',
          cookies: cookies,
          localStorage: localStorage_data,
          url: window.location.href,
        }));
      })();
      true;
    `);
  };

  const handleMessage = useCallback(async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'COOKIES' && data.cookies) {
        // Combine cookies with any localStorage tokens
        let sessionData = data.cookies;
        if (data.localStorage && Object.keys(data.localStorage).length > 0) {
          sessionData += '|||LS:' + JSON.stringify(data.localStorage);
        }

        await connectPlatform(platformId, sessionData, '');
        setIsLoggedIn(true);
      }
    } catch {}
  }, [platformId, connectPlatform]);

  const handleDone = () => {
    // One final cookie extraction before leaving
    extractCookies();
    setTimeout(() => {
      navigation.goBack();
    }, 500);
  };

  return (
    <View style={s.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={{ flex: 1 }} edges={['top']}>
        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()}
            style={({ pressed }) => [s.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="close" size={22} color="#2C3E2D" />
          </Pressable>
          <View style={s.headerCenter}>
            <View style={[s.headerDot, { backgroundColor: config.color }]} />
            <Text style={s.headerTitle}>{config.name}</Text>
          </View>
          <Pressable onPress={handleDone}
            style={({ pressed }) => [s.doneBtn, isLoggedIn && s.doneBtnActive, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
            <Text style={[s.doneBtnText, isLoggedIn && s.doneBtnTextActive]}>Done</Text>
          </Pressable>
        </View>

        {/* Status bar */}
        {isLoggedIn && (
          <View style={s.successBar}>
            <Ionicons name="checkmark-circle" size={18} color="#4F7A55" />
            <Text style={s.successText}>Session captured! Tap Done to save.</Text>
          </View>
        )}

        {/* WebView */}
        <View style={{ flex: 1 }}>
          <WebView
            ref={webViewRef}
            source={{ uri: config.loginUrl }}
            style={{ flex: 1 }}
            onNavigationStateChange={handleNavigationChange}
            onMessage={handleMessage}
            onLoadStart={() => setLoading(true)}
            onLoadEnd={() => {
              setLoading(false);
              // Auto-extract cookies whenever a page finishes loading
              setTimeout(extractCookies, 1500);
            }}
            javaScriptEnabled
            domStorageEnabled
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            userAgent="Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
            startInLoadingState
            renderLoading={() => (
              <View style={s.loadingOverlay}>
                <ActivityIndicator size="large" color={config.color} />
                <Text style={s.loadingText}>Loading {config.name}...</Text>
              </View>
            )}
          />
          {loading && (
            <View style={s.loadingBar}>
              <View style={[s.loadingBarFill, { backgroundColor: config.color }]} />
            </View>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },
  backLink: { marginTop: 16, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, backgroundColor: '#7A9E7E' },
  backLinkText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 14 },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(122,158,126,0.12)' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  headerDot: { width: 10, height: 10, borderRadius: 5 },
  headerTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D' },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.3)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)' },
  doneBtnActive: { backgroundColor: '#7A9E7E', borderColor: '#7A9E7E' },
  doneBtnText: { fontFamily: 'Nunito_700Bold', fontSize: 13, color: '#7A8C7B' },
  doneBtnTextActive: { color: '#fff' },

  successBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, backgroundColor: 'rgba(79,122,85,0.08)', gap: 8 },
  successText: { fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#4F7A55' },

  loadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F0F4EF' },
  loadingText: { fontFamily: 'Nunito_600SemiBold', fontSize: 14, color: '#7A8C7B', marginTop: 12 },
  loadingBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3 },
  loadingBarFill: { height: '100%', width: '30%', borderRadius: 2 },
});
