import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest } from '../services/http.js';
import { useAuth } from './useAuth.js';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const refreshCart = useCallback(async () => {
    if (user?.role !== 'customer') {
      setItems([]);
      setIsLoading(false);
      return [];
    }
    setIsLoading(true);
    try {
      const { cart } = await apiRequest('/api/cart');
      const nextItems = (cart.items || []).filter((item) => item.product);
      setItems(nextItems);
      return nextItems;
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    refreshCart().catch(() => setItems([]));
  }, [refreshCart]);

  const addItem = useCallback(async (productId, quantity = 1) => {
    await apiRequest('/api/cart/items', { method: 'POST', body: { productId, quantity } });
    await refreshCart();
  }, [refreshCart]);

  const updateItem = useCallback(async (productId, quantity) => {
    await apiRequest(`/api/cart/items/${productId}`, { method: 'PATCH', body: { quantity } });
    await refreshCart();
  }, [refreshCart]);

  const removeItem = useCallback(async (productId) => {
    await apiRequest(`/api/cart/items/${productId}`, { method: 'DELETE' });
    await refreshCart();
  }, [refreshCart]);

  const itemCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const value = useMemo(() => ({ items, itemCount, isLoading, refreshCart, addItem, updateItem, removeItem }), [items, itemCount, isLoading, refreshCart, addItem, updateItem, removeItem]);
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside a CartProvider.');
  return context;
}
