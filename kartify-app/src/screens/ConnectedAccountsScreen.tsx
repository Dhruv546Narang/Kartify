/**
 * ConnectedAccountsScreen
 *
 * Shows all supported grocery platforms and their connection status.
 * Users tap a platform to log in via WebView, which captures session
 * cookies for on-device price searching.
 */

import React, { useEffect } from 'react';
import {
  Pressable, ScrollView, StatusBar, StyleSheet, Text, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlatformStore, PLATFORM_CONFIGS } from '../store/platformStore';

export default function ConnectedAccountsScreen({ navigation }: { navigation: any }) {
  const { sessions, hydrated, hydrate, disconnectPlatform } = usePlatformStore();

  useEffect(() => {
    if (!hydrated) hydrate();
  }, [hydrated, hydrate]);

  const connectedCount = Object.keys(sessions).length;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 120 }} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Pressable onPress={() => navigation.goBack()}
            style={({ pressed }) => [s.backBtn, { transform: [{ scale: pressed ? 0.92 : 1 }] }]}>
            <Ionicons name="chevron-back" size={22} color="#2C3E2D" />
          </Pressable>
          <Text style={s.headerTitle}>Connected Accounts</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Stats banner */}
        <LinearGradient colors={['#4F7A55', '#7A9E7E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.statsBanner}>
          <View style={s.statItem}>
            <Text style={s.statNum}>{connectedCount}</Text>
            <Text style={s.statLabel}>Connected</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>{PLATFORM_CONFIGS.length}</Text>
            <Text style={s.statLabel}>Available</Text>
          </View>
          <View style={s.statDivider} />
          <View style={s.statItem}>
            <Text style={s.statNum}>🔒</Text>
            <Text style={s.statLabel}>On-Device</Text>
          </View>
        </LinearGradient>

        {/* Info */}
        <View style={s.infoCard}>
          <Ionicons name="shield-checkmark" size={20} color="#7A9E7E" />
          <Text style={s.infoText}>
            Your login sessions stay on your device. Kartify never stores your passwords or sends your account data to any server.
          </Text>
        </View>

        {/* Platform list */}
        <Text style={s.sectionTitle}>Grocery Platforms</Text>
        {PLATFORM_CONFIGS.map((config) => {
          const connected = !!sessions[config.id];
          const session = sessions[config.id];
          return (
            <View key={config.id} style={[s.platformCard, connected && s.platformCardConnected]}>
              <View style={s.platformRow}>
                {/* Platform icon + info */}
                <View style={[s.platformIcon, { backgroundColor: config.color }]}>
                  <Text style={{ fontSize: 20 }}>{config.icon}</Text>
                </View>
                <View style={s.platformInfo}>
                  <Text style={s.platformName}>{config.name}</Text>
                  {connected ? (
                    <Text style={s.platformStatus}>
                      ✓ Connected{session?.displayName ? ` · ${session.displayName}` : ''}
                    </Text>
                  ) : (
                    <Text style={s.platformStatusOff}>Not connected</Text>
                  )}
                </View>

                {/* Action button */}
                {connected ? (
                  <View style={s.actionRow}>
                    <Pressable onPress={() => navigation.navigate('PlatformLogin', { platformId: config.id })}
                      style={({ pressed }) => [s.reconnectBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                      <Ionicons name="refresh-outline" size={16} color="#7A9E7E" />
                    </Pressable>
                    <Pressable onPress={() => disconnectPlatform(config.id)}
                      style={({ pressed }) => [s.disconnectBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                      <Ionicons name="close" size={16} color="#C4855A" />
                    </Pressable>
                  </View>
                ) : (
                  <Pressable onPress={() => navigation.navigate('PlatformLogin', { platformId: config.id })}
                    style={({ pressed }) => [s.connectBtn, { transform: [{ scale: pressed ? 0.95 : 1 }] }]}>
                    <Text style={s.connectBtnText}>Connect</Text>
                  </Pressable>
                )}
              </View>
            </View>
          );
        })}

        {/* How it works */}
        <Text style={[s.sectionTitle, { marginTop: 28 }]}>How it works</Text>
        <View style={s.stepCard}>
          {[
            { num: '1', title: 'Connect', desc: 'Log in to your grocery accounts above' },
            { num: '2', title: 'Search', desc: 'Search any product — we check all platforms at once' },
            { num: '3', title: 'Compare', desc: 'See live prices from your own accounts' },
            { num: '4', title: 'Buy', desc: 'Tap to open the cheapest platform and order' },
          ].map((step, idx) => (
            <View key={step.num} style={[s.stepRow, idx < 3 && s.stepDivider]}>
              <View style={s.stepNum}>
                <Text style={s.stepNumText}>{step.num}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.stepTitle}>{step.title}</Text>
                <Text style={s.stepDesc}>{step.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F0F4EF' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.5)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.5)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontFamily: 'PlayfairDisplay_700Bold', fontSize: 20, color: '#2C3E2D' },

  statsBanner: { marginHorizontal: 16, marginTop: 8, borderRadius: 20, paddingVertical: 20, paddingHorizontal: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  statItem: { alignItems: 'center' },
  statNum: { fontFamily: 'Nunito_700Bold', fontSize: 24, color: '#fff' },
  statLabel: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  statDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.2)' },

  infoCard: { marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 14, backgroundColor: 'rgba(122,158,126,0.08)', borderWidth: 1, borderColor: 'rgba(122,158,126,0.2)', flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  infoText: { flex: 1, fontFamily: 'Nunito_600SemiBold', fontSize: 13, color: '#7A8C7B', lineHeight: 18 },

  sectionTitle: { fontFamily: 'Nunito_700Bold', fontSize: 16, color: '#2C3E2D', paddingHorizontal: 16, marginTop: 22, marginBottom: 12 },

  platformCard: { marginHorizontal: 16, marginBottom: 10, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', padding: 14 },
  platformCardConnected: { borderColor: 'rgba(79,122,85,0.35)', backgroundColor: 'rgba(79,122,85,0.06)' },
  platformRow: { flexDirection: 'row', alignItems: 'center' },
  platformIcon: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  platformInfo: { flex: 1, marginLeft: 12 },
  platformName: { fontFamily: 'Nunito_700Bold', fontSize: 15, color: '#2C3E2D' },
  platformStatus: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#4F7A55', marginTop: 2 },
  platformStatusOff: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 8 },
  reconnectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(122,158,126,0.12)', borderWidth: 1, borderColor: 'rgba(122,158,126,0.25)', alignItems: 'center', justifyContent: 'center' },
  disconnectBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(196,133,90,0.08)', borderWidth: 1, borderColor: 'rgba(196,133,90,0.2)', alignItems: 'center', justifyContent: 'center' },
  connectBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, backgroundColor: '#7A9E7E' },
  connectBtnText: { color: '#fff', fontFamily: 'Nunito_700Bold', fontSize: 13 },

  stepCard: { marginHorizontal: 16, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.25)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.45)', padding: 16 },
  stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 12 },
  stepDivider: { borderBottomWidth: 1, borderBottomColor: 'rgba(122,158,126,0.08)' },
  stepNum: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(79,122,85,0.1)', alignItems: 'center', justifyContent: 'center' },
  stepNumText: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#4F7A55' },
  stepTitle: { fontFamily: 'Nunito_700Bold', fontSize: 14, color: '#2C3E2D' },
  stepDesc: { fontFamily: 'Nunito_600SemiBold', fontSize: 12, color: '#7A8C7B', marginTop: 2 },
});
