import React from 'react';
import {
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { GlassCard, GlassTokens, ScalePressable } from '../components/GlassPrimitives';
import { useAuthStore } from '../store/authStore';

interface ProfileScreenProps {
  navigation: any;
}

const GROUPS = [
  {
    title: 'My Account',
    rows: [
      { icon: 'link-outline', label: 'Connected Accounts', nav: 'ConnectedAccounts' },
      { icon: 'location-outline', label: 'Saved Addresses' },
      { icon: 'notifications-outline', label: 'Notification Preferences' },
      { icon: 'pricetag-outline', label: 'Preferred Platform' },
    ],
  },
  {
    title: 'App Settings',
    rows: [
      { icon: 'navigate-outline', label: 'Default Location' },
      { icon: 'contrast-outline', label: 'Theme', value: 'Light' },
      { icon: 'language-outline', label: 'Language', value: 'English' },
    ],
  },
  {
    title: 'Activity',
    rows: [
      { icon: 'time-outline', label: 'Order History' },
      { icon: 'notifications-circle-outline', label: 'Price Alerts' },
    ],
  },
  {
    title: 'Support',
    rows: [
      { icon: 'help-circle-outline', label: 'Help & FAQ' },
      { icon: 'bug-outline', label: 'Report a Bug' },
      { icon: 'star-outline', label: 'Rate Kartify' },
      { icon: 'mail-outline', label: 'Contact Us' },
    ],
  },
  {
    title: 'About',
    rows: [
      { icon: 'information-circle-outline', label: 'App version', value: '1.0.0' },
      { icon: 'shield-checkmark-outline', label: 'Privacy Policy' },
      { icon: 'document-text-outline', label: 'Terms of Service' },
    ],
  },
];

export default function ProfileScreen({ navigation }: ProfileScreenProps) {
  const { user, logout } = useAuthStore();
  const name = user?.name || 'Kartify User';
  const email = user?.email || 'user@example.com';
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initials || 'KU'}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.email}>{email}</Text>
          <ScalePressable style={styles.editLinkWrap} activeStyle={styles.pressActive} onPress={() => navigation.goBack()}>
            <Text style={styles.editLink}>Edit Profile</Text>
          </ScalePressable>
        </View>

        {GROUPS.map((group) => (
          <View key={group.title} style={styles.groupWrap}>
            <Text style={styles.groupTitle}>{group.title}</Text>
            <GlassCard style={styles.groupCard} intensity={40}>
              {group.rows.map((row: any, index) => (
                <ScalePressable
                  key={row.label}
                  style={[styles.groupRow, index < group.rows.length - 1 && styles.rowDivider]}
                  activeStyle={styles.pressActive}
                  onPress={() => {
                    if (row.nav) navigation.getParent()?.navigate(row.nav);
                  }}
                >
                  <View style={styles.rowLeft}>
                    <Ionicons name={row.icon as keyof typeof Ionicons.glyphMap} size={20} color={GlassTokens.colors.primary} />
                    <Text style={styles.rowLabel}>{row.label}</Text>
                  </View>
                  {row.value ? (
                    <Text style={styles.rowValue}>{row.value}</Text>
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={GlassTokens.colors.textMuted} />
                  )}
                </ScalePressable>
              ))}
            </GlassCard>
          </View>
        ))}

        <ScalePressable style={styles.signOutButton} activeStyle={styles.pressActive} onPress={logout}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </ScalePressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: GlassTokens.colors.bg,
  },
  container: {
    flex: 1,
    backgroundColor: GlassTokens.colors.bg,
  },
  content: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },
  topBar: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GlassTokens.colors.white20,
  },
  title: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 22,
    color: GlassTokens.colors.textPrimary,
  },
  avatarSection: {
    marginTop: 20,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: GlassTokens.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 22,
  },
  name: {
    marginTop: 12,
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 20,
    color: GlassTokens.colors.textPrimary,
  },
  email: {
    marginTop: 4,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
    color: GlassTokens.colors.textMuted,
  },
  editLinkWrap: {
    marginTop: 8,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  editLink: {
    color: GlassTokens.colors.primary,
    textDecorationLine: 'underline',
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 13,
  },
  groupWrap: {
    marginTop: 14,
  },
  groupTitle: {
    marginBottom: 6,
    fontFamily: 'Nunito_700Bold',
    fontSize: 13,
    color: GlassTokens.colors.textPrimary,
  },
  groupCard: {
    padding: 0,
  },
  groupRow: {
    height: 52,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(0,0,0,0.06)',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rowLabel: {
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 14,
    color: GlassTokens.colors.textPrimary,
  },
  rowValue: {
    fontFamily: 'Nunito_400Regular',
    fontSize: 13,
    color: GlassTokens.colors.textMuted,
  },
  signOutButton: {
    marginTop: 20,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(196,133,90,0.12)',
    borderColor: 'rgba(196,133,90,0.4)',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signOutText: {
    color: GlassTokens.colors.accent,
    fontFamily: 'Nunito_700Bold',
    fontSize: 15,
  },
  pressActive: {
    shadowColor: '#4F7A55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 20,
    elevation: 10,
  },
});
