/**
 * Cart Store — Zustand store for cart state management.
 * Syncs with backend on every mutation with optimistic updates.
 */

import { create } from 'zustand';
import client from '../api/client';

interface CartItem {
  id: string;
  cart_id: string;
  product_name: string;
  platform: string;
  price: number;
  quantity: number;
  product_id: string;
  added_at?: string;
}

interface Cart {
  id: string;
  user_id: string;
  name: string;
  is_active: boolean;
  created_at?: string;
  items: CartItem[];
  total: number;
}

interface CartState {
  carts: Cart[];
  activeCartId: string | null;
  isLoading: boolean;
  error: string | null;

  fetchCarts: () => Promise<void>;
  createCart: (name?: string) => Promise<Cart>;
  deleteCart: (cartId: string) => Promise<void>;
  addItem: (cartId: string, item: Omit<CartItem, 'id' | 'cart_id' | 'added_at'>) => Promise<void>;
  removeItem: (cartId: string, itemId: string) => Promise<void>;
  setActiveCart: (cartId: string) => void;
  getActiveCart: () => Cart | null;
  clearError: () => void;
}

export const useCartStore = create<CartState>((set, get) => ({
  carts: [],
  activeCartId: null,
  isLoading: false,
  error: null,

  fetchCarts: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.get('/cart');
      const carts = response.data;
      const activeCart = carts.find((c: Cart) => c.is_active) || carts[0];
      set({
        carts,
        activeCartId: activeCart?.id || null,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to fetch carts',
      });
    }
  },

  createCart: async (name = 'My Cart') => {
    set({ isLoading: true, error: null });
    try {
      const response = await client.post('/cart', { name });
      const newCart = response.data;
      set((state) => ({
        carts: [newCart, ...state.carts],
        activeCartId: newCart.id,
        isLoading: false,
      }));
      return newCart;
    } catch (error: any) {
      set({
        isLoading: false,
        error: error.response?.data?.detail || 'Failed to create cart',
      });
      throw error;
    }
  },

  deleteCart: async (cartId: string) => {
    // Optimistic removal
    const prevCarts = get().carts;
    set((state) => ({
      carts: state.carts.filter((c) => c.id !== cartId),
      activeCartId: state.activeCartId === cartId ? null : state.activeCartId,
    }));

    try {
      await client.delete(`/cart/${cartId}`);
    } catch (error) {
      // Rollback
      set({ carts: prevCarts });
    }
  },

  addItem: async (cartId, item) => {
    try {
      const response = await client.post(`/cart/${cartId}/items`, item);
      set((state) => ({
        carts: state.carts.map((c) => {
          if (c.id === cartId) {
            const newItems = [...c.items, response.data];
            return {
              ...c,
              items: newItems,
              total: newItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
            };
          }
          return c;
        }),
      }));
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to add item' });
      throw error;
    }
  },

  removeItem: async (cartId, itemId) => {
    // Optimistic removal
    const prevCarts = get().carts;
    set((state) => ({
      carts: state.carts.map((c) => {
        if (c.id === cartId) {
          const newItems = c.items.filter((i) => i.id !== itemId);
          return {
            ...c,
            items: newItems,
            total: newItems.reduce((sum, i) => sum + i.price * i.quantity, 0),
          };
        }
        return c;
      }),
    }));

    try {
      await client.delete(`/cart/${cartId}/items/${itemId}`);
    } catch (error) {
      set({ carts: prevCarts });
    }
  },

  setActiveCart: (cartId) => set({ activeCartId: cartId }),

  getActiveCart: () => {
    const { carts, activeCartId } = get();
    return carts.find((c) => c.id === activeCartId) || null;
  },

  clearError: () => set({ error: null }),
}));
