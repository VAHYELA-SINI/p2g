import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const CART_STORAGE_KEY = 'p2g_customer_cart_v1';

// Cross-platform cart persistence adapter
const persistAdapter = {
  async getCart() {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          const raw = window.localStorage.getItem(CART_STORAGE_KEY);
          return raw ? JSON.parse(raw) : null;
        }
        return null;
      }
      const raw = await SecureStore.getItemAsync(CART_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.warn('Could not read cart from local storage:', error.message);
      return null;
    }
  },

  async saveCart(items) {
    try {
      const payload = JSON.stringify(items);
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(CART_STORAGE_KEY, payload);
        }
        return;
      }
      await SecureStore.setItemAsync(CART_STORAGE_KEY, payload);
    } catch (error) {
      console.warn('Could not save cart to local storage:', error.message);
    }
  },

  async clearCart() {
    try {
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.removeItem(CART_STORAGE_KEY);
        }
        return;
      }
      await SecureStore.deleteItemAsync(CART_STORAGE_KEY);
    } catch (error) {
      console.warn('Could not clear cart in local storage:', error.message);
    }
  },
};

export const useCartStore = create((set, get) => ({
  items: [],
  isLoaded: false,
  catalogWarnings: [], // Stores detected unavailable items or price updates

  /**
   * Initializes and restores cart from local storage
   */
  loadCart: async () => {
    const saved = await persistAdapter.getCart();
    if (saved && Array.isArray(saved)) {
      set({ items: saved, isLoaded: true });
    } else {
      set({ items: [], isLoaded: true });
    }
  },

  /**
   * Adds product to cart with specified quantity (default 1)
   */
  addItem: (product, quantity = 1) => {
    if (!product || !product._id) return;
    const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

    set((state) => {
      const existingIndex = state.items.findIndex(
        (i) => (i.product?._id || i.product?.id) === (product._id || product.id)
      );

      let updatedItems;
      if (existingIndex > -1) {
        // Increment quantity of existing item
        updatedItems = state.items.map((item, idx) => {
          if (idx === existingIndex) {
            return {
              ...item,
              quantity: item.quantity + qtyToAdd,
            };
          }
          return item;
        });
      } else {
        // Add new line item
        const newItem = {
          product: {
            _id: product._id || product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            category: product.category,
            isAvailable: product.isAvailable !== false,
            stock: product.stock,
            slug: product.slug,
          },
          quantity: qtyToAdd,
          addedPrice: product.price,
          addedAt: new Date().toISOString(),
        };
        updatedItems = [...state.items, newItem];
      }

      persistAdapter.saveCart(updatedItems);
      return { items: updatedItems };
    });
  },

  /**
   * Removes a product completely from the cart
   */
  removeItem: (productId) => {
    set((state) => {
      const updatedItems = state.items.filter(
        (item) => (item.product?._id || item.product?.id) !== productId
      );
      persistAdapter.saveCart(updatedItems);
      return { items: updatedItems };
    });
  },

  /**
   * Increases item quantity by 1
   */
  increaseQuantity: (productId) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if ((item.product?._id || item.product?.id) === productId) {
          return { ...item, quantity: item.quantity + 1 };
        }
        return item;
      });
      persistAdapter.saveCart(updatedItems);
      return { items: updatedItems };
    });
  },

  /**
   * Decreases item quantity by 1 (Strictly prevents quantity below 1)
   */
  decreaseQuantity: (productId) => {
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if ((item.product?._id || item.product?.id) === productId) {
          // Strictly prevent dropping below 1
          const newQuantity = Math.max(1, item.quantity - 1);
          return { ...item, quantity: newQuantity };
        }
        return item;
      });
      persistAdapter.saveCart(updatedItems);
      return { items: updatedItems };
    });
  },

  /**
   * Explicitly updates item quantity (enforces minimum 1)
   */
  updateQuantity: (productId, quantity) => {
    const safeQuantity = Math.max(1, parseInt(quantity, 10) || 1);
    set((state) => {
      const updatedItems = state.items.map((item) => {
        if ((item.product?._id || item.product?.id) === productId) {
          return { ...item, quantity: safeQuantity };
        }
        return item;
      });
      persistAdapter.saveCart(updatedItems);
      return { items: updatedItems };
    });
  },

  /**
   * Clears all items from the cart and local persistence
   */
  clearCart: () => {
    persistAdapter.clearCart();
    set({ items: [], catalogWarnings: [] });
  },

  /**
   * Computes total number of items in cart (sum of quantities)
   */
  getTotalItems: () => {
    const { items } = get();
    return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
  },

  /**
   * Computes client-side subtotal (DISPLAY ONLY - Server calculates authoritatively)
   */
  getSubtotal: () => {
    const { items } = get();
    return items.reduce((sum, item) => {
      const unitPrice = item.product?.price || 0;
      return sum + unitPrice * (item.quantity || 0);
    }, 0);
  },

  /**
   * Cross-references cart items against live catalog products:
   * 1. Detects unavailable products (out of stock or isAvailable=false).
   * 2. Detects price changes compared to when added.
   */
  validateCartWithCatalog: (latestProducts = []) => {
    const { items } = get();
    const warnings = [];

    if (!Array.isArray(latestProducts) || latestProducts.length === 0) {
      return warnings;
    }

    const catalogMap = new Map(
      latestProducts.map((p) => [String(p._id || p.id), p])
    );

    items.forEach((item) => {
      const pId = String(item.product?._id || item.product?.id);
      const liveProduct = catalogMap.get(pId);

      if (!liveProduct) {
        warnings.push({
          productId: pId,
          name: item.product?.name || 'Product',
          type: 'NOT_FOUND',
          message: `${item.product?.name || 'Item'} is no longer available in the store.`,
        });
      } else {
        // Check availability & stock
        if (liveProduct.isAvailable === false || (liveProduct.stock !== undefined && liveProduct.stock <= 0)) {
          warnings.push({
            productId: pId,
            name: item.product?.name,
            type: 'OUT_OF_STOCK',
            message: `${item.product?.name} is currently out of stock.`,
          });
        }

        // Check price change
        if (liveProduct.price !== item.addedPrice) {
          warnings.push({
            productId: pId,
            name: item.product?.name,
            type: 'PRICE_CHANGED',
            oldPrice: item.addedPrice,
            newPrice: liveProduct.price,
            message: `Price for ${item.product?.name} changed from ₦${(item.addedPrice || 0).toLocaleString()} to ₦${(liveProduct.price || 0).toLocaleString()}.`,
          });
        }
      }
    });

    set({ catalogWarnings: warnings });
    return warnings;
  },
}));
