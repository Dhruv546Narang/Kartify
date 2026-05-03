import React, { useEffect } from 'react';
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  useFonts as useNunitoFonts,
} from '@expo-google-fonts/nunito';
import { PlayfairDisplay_700Bold, useFonts as usePlayfairFonts } from '@expo-google-fonts/playfair-display';
import {
  NavigationContainer,
  DefaultTheme,
  type Theme,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from './src/store/authStore';
import { useCartStore } from './src/store/cartStore';
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import HomeScreen from './src/screens/HomeScreen';
import SearchScreen from './src/screens/SearchScreen';
import CartScreen from './src/screens/CartScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import AlertsScreen from './src/screens/AlertsScreen';
import SavingsScreen from './src/screens/SavingsScreen';
import ProductDetailScreen from './src/screens/ProductDetailScreen';
import CheckoutScreen from './src/screens/CheckoutScreen';
import { ScalePressable } from './src/components/GlassPrimitives';

const AuthStack = createNativeStackNavigator();
const AppStack = createNativeStackNavigator();
const AppTab = createBottomTabNavigator();

const COLORS = {
  bg: '#F0F4EF',
  primary: '#7A9E7E',
  primaryDark: '#4F7A55',
  textPrimary: '#2C3E2D',
  textMuted: '#7A8C7B',
  accent: '#C4855A',
  borderGlass: 'rgba(255,255,255,0.40)',
} as const;

const TAB_META: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  HomeTab: { label: 'Home', icon: 'home-outline' },
  SearchTab: { label: 'Search', icon: 'search-outline' },
  AlertsTab: { label: 'Alerts', icon: 'notifications-outline' },
  SavingsTab: { label: 'Savings', icon: 'wallet-outline' },
  ProfileTab: { label: 'Profile', icon: 'person-outline' },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="Signup" component={SignupScreen} />
    </AuthStack.Navigator>
  );
}

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const carts = useCartStore((s) => s.carts);
  const activeCartId = useCartStore((s) => s.activeCartId);
  const activeCart =
    carts.find((cart) => cart.id === activeCartId) || carts[0];
  const cartCount =
    activeCart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <View style={[styles.tabShell, { paddingBottom: insets.bottom + 6 }]}>
      <BlurView intensity={50} tint="light" style={StyleSheet.absoluteFillObject} />
      <View style={styles.tabOverlay} />

      <View style={styles.tabRow}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const meta = TAB_META[route.name] || TAB_META.HomeTab;
          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          return (
            <ScalePressable
              key={route.key}
              onPress={onPress}
              style={styles.tabButton}
              activeStyle={styles.tabButtonActive}
            >
              <Ionicons
                name={isFocused ? (meta.icon.replace('-outline', '') as keyof typeof Ionicons.glyphMap) : meta.icon}
                size={20}
                color={isFocused ? COLORS.primary : COLORS.textMuted}
              />
              <Text
                style={[
                  styles.tabLabel,
                  isFocused && styles.tabLabelActive,
                ]}
              >
                {meta.label}
              </Text>
            </ScalePressable>
          );
        })}
      </View>

      {/* Floating cart FAB */}
      <ScalePressable
        onPress={() => navigation.getParent()?.navigate('Cart')}
        style={[
          styles.floatingCart,
          { bottom: insets.bottom + 74 },
        ]}
        activeStyle={styles.floatingCartActive}
      >
        <Ionicons name="cart-outline" size={24} color="#FFFFFF" />
        {cartCount > 0 ? (
          <View style={styles.cartBadge}>
            <Text style={styles.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
          </View>
        ) : null}
      </ScalePressable>
    </View>
  );
}

function TabsNavigator() {
  return (
    <AppTab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppTab.Screen name="HomeTab" component={HomeScreen} />
      <AppTab.Screen name="SearchTab" component={SearchScreen} />
      <AppTab.Screen name="AlertsTab" component={AlertsScreen} />
      <AppTab.Screen name="SavingsTab" component={SavingsScreen} />
      <AppTab.Screen name="ProfileTab" component={ProfileScreen} />
    </AppTab.Navigator>
  );
}

function AppNavigator() {
  return (
    <AppStack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <AppStack.Screen name="MainTabs" component={TabsNavigator} />
      <AppStack.Screen
        name="ProductDetail"
        component={ProductDetailScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AppStack.Screen
        name="Cart"
        component={CartScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
      <AppStack.Screen
        name="Checkout"
        component={CheckoutScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AppStack.Screen
        name="History"
        component={HistoryScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </AppStack.Navigator>
  );
}

function SplashScreen() {
  return (
    <View style={styles.splashContainer}>
      <StatusBar
        translucent
        barStyle="dark-content"
        backgroundColor="transparent"
      />
      <Text style={styles.splashTitle}>Kartify</Text>
      <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 12 }} />
    </View>
  );
}

export default function App() {
  const { isLoggedIn, isLoading, loadFromStorage } = useAuthStore();
  const [nunitoLoaded] = useNunitoFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const [playfairLoaded] = usePlayfairFonts({
    PlayfairDisplay_700Bold,
  });

  const appTheme: Theme = {
    ...DefaultTheme,
    dark: false,
    colors: {
      ...DefaultTheme.colors,
      primary: COLORS.primary,
      background: COLORS.bg,
      card: COLORS.bg,
      text: COLORS.textPrimary,
      border: COLORS.borderGlass,
      notification: COLORS.accent,
    },
  };

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading || !nunitoLoaded || !playfairLoaded) {
    return <SplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={appTheme}>
        {isLoggedIn ? <AppNavigator /> : <AuthNavigator />}
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.bg,
  },
  splashTitle: {
    fontFamily: 'PlayfairDisplay_700Bold',
    fontSize: 36,
    color: COLORS.textPrimary,
  },
  tabShell: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.4)',
    height: 64,
    backgroundColor: 'rgba(240,244,239,0.85)',
  },
  tabOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(240,244,239,0.85)',
  },
  tabRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    height: 64,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
    borderRadius: 16,
    paddingVertical: 4,
  },
  tabButtonActive: {
    shadowColor: '#4F7A55',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 20,
    elevation: 10,
  },
  tabLabel: {
    marginTop: 2,
    fontFamily: 'Nunito_600SemiBold',
    fontSize: 11,
    color: COLORS.textMuted,
  },
  tabLabelActive: {
    color: COLORS.primary,
  },
  floatingCart: {
    position: 'absolute',
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F7A55',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  floatingCartActive: {
    shadowOpacity: 0.42,
  },
  cartBadge: {
    position: 'absolute',
    top: 6,
    right: 4,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontFamily: 'Nunito_700Bold',
    fontSize: 10,
    lineHeight: 12,
  },
});
