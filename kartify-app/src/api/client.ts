/**
 * Axios API client with automatic JWT injection.
 */

import axios from 'axios';
import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

function extractRuntimeHost(): string | null {
  const hostUri =
    Constants.expoConfig?.hostUri ||
    (Constants as unknown as { manifest2?: { extra?: { expoClient?: { hostUri?: string } } } })
      .manifest2?.extra?.expoClient?.hostUri ||
    null;
  if (!hostUri) return null;
  const host = hostUri.split(':')[0]?.trim();
  return host || null;
}

function getApiUrl(): string {
  const envUrl = (process.env.EXPO_PUBLIC_API_URL || '').trim();
  const runtimeHost = extractRuntimeHost();
  const isAndroidEmulator = Platform.OS === 'android' && Constants.isDevice === false;

  if (Platform.OS === 'android') {
    // Emulator must always use 10.0.2.2 for host machine localhost.
    if (isAndroidEmulator) {
      return 'http://10.0.2.2:8000';
    }
    // Physical Android device should use explicit env URL if provided.
    if (envUrl) {
      return envUrl;
    }
    // Last-resort fallback for Android when env is missing.
    return 'http://10.0.2.2:8000';
  }

  if (envUrl) {
    return envUrl;
  }

  const fallbackHost =
    runtimeHost && runtimeHost !== 'localhost' && runtimeHost !== '127.0.0.1'
      ? runtimeHost
      : '127.0.0.1';

  const fallbackUrl = `http://${fallbackHost}:8000`;
  return fallbackUrl;
}

const API_URL = getApiUrl();

const client = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — attach JWT token
client.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (error) {
      // SecureStore might not be available in all environments
      console.warn('Could not read auth token:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401s
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear stored token
      try {
        await SecureStore.deleteItemAsync('auth_token');
      } catch (e) {
        // ignore
      }
    }
    return Promise.reject(error);
  }
);

export default client;
