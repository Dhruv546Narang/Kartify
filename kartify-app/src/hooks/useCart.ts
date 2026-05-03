/**
 * useCart — Custom hook wrapping cartStore for convenience
 */

import { useCallback } from 'react';
import { useCartStore } from '../store/cartStore';

export function useCart() {
  const store = useCartStore();

  const getActiveCart = useCallback(() => {
    return store.getActiveCart();
  }, [store.carts, store.activeCartId]);

  const activeCartItemCount = useCallback(() => {
    const cart = store.getActiveCart();
    return cart?.items.reduce((sum, item) => sum + item.quantity, 0) || 0;
  }, [store.carts, store.activeCartId]);

  return {
    ...store,
    getActiveCart,
    activeCartItemCount,
  };
}
