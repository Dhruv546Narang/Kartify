/**
 * Auth Store — Zustand store for authentication state.
 * Persists JWT token to SecureStore.
 */

import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import client from '../api/client';

interface User {
  id: string;
  email: string;
  name: string | null;
  created_at?: string;
  preferred_platform?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;

  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  loadFromStorage: () => Promise<void>;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: null,
  isLoggedIn: false,
  isLoading: false,
  error: null,

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.post('/auth/login', { email, password });
      const { user, access_token } = response.data;

      await SecureStore.setItemAsync('auth_token', access_token);

      set({
        user,
        token: access_token,
        isLoggedIn: true,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      const message = error.response?.data?.detail
        || (error.code === 'ECONNABORTED'
          ? 'Login request timed out. Check backend connectivity and retry.'
          : error.message === 'Network Error'
          ? `Network error. Could not reach API at ${client.defaults.baseURL}.`
          : 'Login failed. Please try again.');
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  signup: async (email: string, password: string, name: string) => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.post('/auth/signup', {
        email,
        password,
        name,
      });
      const { user, access_token } = response.data;

      if (access_token) {
        await SecureStore.setItemAsync('auth_token', access_token);
        set({
          user,
          token: access_token,
          isLoggedIn: true,
          isLoading: false,
          error: null,
        });
      } else {
        // Email confirmation required
        set({ isLoading: false, error: null });
      }
    } catch (error: any) {
      const message =
        error.response?.data?.detail || 'Signup failed. Please try again.';
      set({ isLoading: false, error: message });
      throw new Error(message);
    }
  },

  logout: async () => {
    try {
      await SecureStore.deleteItemAsync('auth_token');
    } catch (e) {
      // ignore
    }
    set({
      user: null,
      token: null,
      isLoggedIn: false,
      error: null,
    });
  },

  loadFromStorage: async () => {
    set({ isLoading: true });
    try {
      const token = await SecureStore.getItemAsync('auth_token');
      if (token) {
        // Verify token is still valid by calling /auth/me
        const response = await client.get('/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        set({
          user: response.data,
          token,
          isLoggedIn: true,
          isLoading: false,
        });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      // Token expired or invalid
      await SecureStore.deleteItemAsync('auth_token').catch(() => {});
      set({
        user: null,
        token: null,
        isLoggedIn: false,
        isLoading: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
