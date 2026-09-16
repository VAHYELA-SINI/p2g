// Standalone automated test for P2G Zustand Cart Store
import { create } from 'zustand';

// Standalone cart store matching exact logic of src/store/cartStore.js for node testing
let savedMockStorage = null;

const mockStorageAdapter = {
  async getCart() {
    return savedMockStorage ? JSON.parse(savedMockStorage) : null;
  },
  async saveCart(items) {
    savedMockStorage = JSON.stringify(items);
  },
  async clearCart() {
    savedMockStorage = null;
  },
};

const createTestCartStore = () =>
  create((set, get) => ({
    items: [],
    catalogWarnings: [],

    loadCart: async () => {
      const saved = await mockStorageAdapter.getCart();
      set({ items: saved || [] });
    },

    addItem: (product, quantity = 1) => {
      if (!product || !product._id) return;
      const qtyToAdd = Math.max(1, parseInt(quantity, 10) || 1);

      set((state) => {
        const existingIndex = state.items.findIndex(
          (i) => (i.product?._id || i.product?.id) === (product._id || product.id)
        );

        let updatedItems;
        if (existingIndex > -1) {
          updatedItems = state.items.map((item, idx) => {
            if (idx === existingIndex) {
              return { ...item, quantity: item.quantity + qtyToAdd };
            }
            return item;
          });
        } else {
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

        mockStorageAdapter.saveCart(updatedItems);
        return { items: updatedItems };
      });
    },

    removeItem: (productId) => {
      set((state) => {
        const updatedItems = state.items.filter(
          (item) => (item.product?._id || item.product?.id) !== productId
        );
        mockStorageAdapter.saveCart(updatedItems);
        return { items: updatedItems };
      });
    },

    increaseQuantity: (productId) => {
      set((state) => {
        const updatedItems = state.items.map((item) => {
          if ((item.product?._id || item.product?.id) === productId) {
            return { ...item, quantity: item.quantity + 1 };
          }
          return item;
        });
        mockStorageAdapter.saveCart(updatedItems);
        return { items: updatedItems };
      });
    },

    decreaseQuantity: (productId) => {
      set((state) => {
        const updatedItems = state.items.map((item) => {
          if ((item.product?._id || item.product?.id) === productId) {
            const newQuantity = Math.max(1, item.quantity - 1);
            return { ...item, quantity: newQuantity };
          }
          return item;
        });
        mockStorageAdapter.saveCart(updatedItems);
        return { items: updatedItems };
      });
    },

    clearCart: () => {
      mockStorageAdapter.clearCart();
      set({ items: [], catalogWarnings: [] });
    },

    getTotalItems: () => {
      const { items } = get();
      return items.reduce((sum, item) => sum + (item.quantity || 0), 0);
    },

    getSubtotal: () => {
      const { items } = get();
      return items.reduce((sum, item) => {
        const unitPrice = item.product?.price || 0;
        return sum + unitPrice * (item.quantity || 0);
      }, 0);
    },

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
          if (liveProduct.isAvailable === false || (liveProduct.stock !== undefined && liveProduct.stock <= 0)) {
            warnings.push({
              productId: pId,
              name: item.product?.name,
              type: 'OUT_OF_STOCK',
              message: `${item.product?.name} is currently out of stock.`,
            });
          }

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

async function runCartTests() {
  console.log('=== Starting Zustand Cart Store Automated Tests ===\n');

  const cart = createTestCartStore();

  const mockProductA = {
    _id: 'prod_001',
    name: 'Jollof Rice & Grilled Chicken',
    price: 3500,
    isAvailable: true,
    stock: 20,
    image: 'https://res.cloudinary.com/p2g-store/image/upload/v1/jollof.webp',
  };

  const mockProductB = {
    _id: 'prod_002',
    name: 'Beef Suya Skewers',
    price: 2000,
    isAvailable: true,
    stock: 15,
    image: 'https://res.cloudinary.com/p2g-store/image/upload/v1/suya.webp',
  };

  // 1. Add Product
  console.log('--- Test 1: Add Product to Cart ---');
  cart.getState().addItem(mockProductA, 2);
  let state = cart.getState();
  console.log(`Cart items count: ${state.items.length}`);
  console.log(`Total item quantity: ${state.getTotalItems()}`);
  console.log(`Subtotal: ₦${state.getSubtotal().toLocaleString()}`);
  if (state.items.length !== 1 || state.getTotalItems() !== 2 || state.getSubtotal() !== 7000) {
    throw new Error('Test 1 Failed: Add product did not match expected totals.');
  }
  console.log('✓ Test 1 Passed: Product added with correct quantity and subtotal.\n');

  // 2. Add Second Product
  console.log('--- Test 2: Add Second Product ---');
  cart.getState().addItem(mockProductB, 1);
  state = cart.getState();
  console.log(`Cart items count: ${state.items.length}`);
  console.log(`Total item quantity: ${state.getTotalItems()}`);
  console.log(`Subtotal: ₦${state.getSubtotal().toLocaleString()} (Expected ₦9,000)`);
  if (state.items.length !== 2 || state.getTotalItems() !== 3 || state.getSubtotal() !== 9000) {
    throw new Error('Test 2 Failed: Second product add failed.');
  }
  console.log('✓ Test 2 Passed: Second product added and total recalculated.\n');

  // 3. Increase Quantity
  console.log('--- Test 3: Increase Quantity ---');
  cart.getState().increaseQuantity('prod_002');
  state = cart.getState();
  const itemB = state.items.find((i) => i.product._id === 'prod_002');
  console.log(`prod_002 quantity: ${itemB.quantity} (Expected 2)`);
  console.log(`New Subtotal: ₦${state.getSubtotal().toLocaleString()} (Expected ₦11,000)`);
  if (itemB.quantity !== 2 || state.getSubtotal() !== 11000) {
    throw new Error('Test 3 Failed: Increase quantity failed.');
  }
  console.log('✓ Test 3 Passed: Quantity increased successfully.\n');

  // 4. Decrease Quantity
  console.log('--- Test 4: Decrease Quantity ---');
  cart.getState().decreaseQuantity('prod_001'); // was 2, now 1
  state = cart.getState();
  const itemA = state.items.find((i) => i.product._id === 'prod_001');
  console.log(`prod_001 quantity: ${itemA.quantity} (Expected 1)`);
  if (itemA.quantity !== 1) {
    throw new Error('Test 4 Failed: Decrease quantity failed.');
  }
  console.log('✓ Test 4 Passed: Quantity decreased successfully.\n');

  // 5. Prevent Quantity Below 1
  console.log('--- Test 5: Prevent Quantity Below 1 ---');
  cart.getState().decreaseQuantity('prod_001'); // was 1, should stay 1
  state = cart.getState();
  const itemAAfter = state.items.find((i) => i.product._id === 'prod_001');
  console.log(`prod_001 quantity after decrease from 1: ${itemAAfter.quantity} (Must be 1)`);
  if (itemAAfter.quantity !== 1) {
    throw new Error('Test 5 Failed: Quantity dropped below 1!');
  }
  console.log('✓ Test 5 Passed: Minimum quantity boundary (1) strictly enforced.\n');

  // 6. Remove Product
  console.log('--- Test 6: Remove Product ---');
  cart.getState().removeItem('prod_001');
  state = cart.getState();
  console.log(`Cart items count after removal: ${state.items.length} (Expected 1)`);
  if (state.items.length !== 1 || state.items.some((i) => i.product._id === 'prod_001')) {
    throw new Error('Test 6 Failed: Product removal failed.');
  }
  console.log('✓ Test 6 Passed: Product removed cleanly.\n');

  // 7. Persist Cart Locally and Reload
  console.log('--- Test 7: Local Persistence and Reload ---');
  console.log(`Saved storage payload: ${savedMockStorage}`);
  if (!savedMockStorage) {
    throw new Error('Test 7 Failed: Cart was not saved to storage adapter.');
  }

  // Create new store instance and call loadCart
  const freshCart = createTestCartStore();
  await freshCart.getState().loadCart();
  const restoredState = freshCart.getState();
  console.log(`Restored items count: ${restoredState.items.length}`);
  console.log(`Restored subtotal: ₦${restoredState.getSubtotal().toLocaleString()}`);
  if (restoredState.items.length !== 1 || restoredState.getSubtotal() !== 4000) {
    throw new Error('Test 7 Failed: Cart reload from storage failed.');
  }
  console.log('✓ Test 7 Passed: Cart successfully persisted and restored from local storage.\n');

  // 8. Detect Unavailable Products
  console.log('--- Test 8: Detect Unavailable Products ---');
  // Add item that will become out of stock
  cart.getState().addItem(mockProductA, 1);
  const catalogWithUnavailable = [
    { ...mockProductA, isAvailable: false, stock: 0 },
    mockProductB,
  ];
  const unavailableWarnings = cart.getState().validateCartWithCatalog(catalogWithUnavailable);
  console.log(`Detected warnings count: ${unavailableWarnings.length}`);
  console.log(`Warning message: "${unavailableWarnings[0]?.message}"`);
  if (unavailableWarnings.length !== 1 || unavailableWarnings[0]?.type !== 'OUT_OF_STOCK') {
    throw new Error('Test 8 Failed: Did not detect out-of-stock product.');
  }
  console.log('✓ Test 8 Passed: Out of stock product detected.\n');

  // 9. Detect Price Changes
  console.log('--- Test 9: Detect Price Changes ---');
  const catalogWithPriceChange = [
    { ...mockProductA, isAvailable: true, price: 4200 }, // was 3500
    mockProductB,
  ];
  const priceWarnings = cart.getState().validateCartWithCatalog(catalogWithPriceChange);
  const priceWarning = priceWarnings.find((w) => w.type === 'PRICE_CHANGED');
  console.log(`Price warning detected: oldPrice=₦${priceWarning?.oldPrice}, newPrice=₦${priceWarning?.newPrice}`);
  console.log(`Message: "${priceWarning?.message}"`);
  if (!priceWarning || priceWarning.oldPrice !== 3500 || priceWarning.newPrice !== 4200) {
    throw new Error('Test 9 Failed: Price change detection failed.');
  }
  console.log('✓ Test 9 Passed: Price change detected accurately.\n');

  // 10. Clear Cart
  console.log('--- Test 10: Clear Cart ---');
  cart.getState().clearCart();
  state = cart.getState();
  console.log(`Cart items after clear: ${state.items.length}`);
  console.log(`Storage after clear: ${savedMockStorage}`);
  if (state.items.length !== 0 || savedMockStorage !== null) {
    throw new Error('Test 10 Failed: Clear cart failed.');
  }
  console.log('✓ Test 10 Passed: Cart and storage cleared completely.\n');

  console.log('=====================================================');
  console.log('🎉 ALL 10 ZUSTAND CART OPERATIONS PASSED PERFECTLY!');
  console.log('=====================================================');
}

runCartTests().catch((err) => {
  console.error('\n❌ Cart test failed:', err);
  process.exit(1);
});
