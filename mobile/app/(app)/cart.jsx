import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useCartStore } from '../../src/store/cartStore';
import { fetchProducts } from '../../src/api/productsApi';
import CartItem from '../../src/components/CartItem';
import CartSummary from '../../src/components/CartSummary';
import EmptyState from '../../src/components/EmptyState';
import { safeBack } from '../../src/utils/navigation';
import { colors } from '../../src/theme';

export default function CartScreen() {
  const router = useRouter();
  const {
    items,
    clearCart,
    getSubtotal,
    getTotalItems,
    validateCartWithCatalog,
    catalogWarnings,
  } = useCartStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const syncWithCatalog = useCallback(async () => {
    if (items.length === 0) return;
    try {
      setIsRefreshing(true);
      const data = await fetchProducts({ limit: 100 });
      validateCartWithCatalog(data.products || []);
    } catch (err) {
      console.warn('Could not sync cart with live catalog:', err.message);
    } finally {
      setIsRefreshing(false);
    }
  }, [items, validateCartWithCatalog]);

  useEffect(() => {
    syncWithCatalog();
  }, [syncWithCatalog]);

  const handleClearConfirm = () => {
    Alert.alert(
      'Clear Shopping Cart?',
      'Are you sure you want to remove all items from your cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear All', style: 'destructive', onPress: clearCart },
      ]
    );
  };

  const handleCheckout = () => {
    router.push('/(app)/checkout');
  };

  const totalItems = getTotalItems();
  const subtotal = getSubtotal();
  const hasUnavailableItems = catalogWarnings.some(
    (w) => w.type === 'OUT_OF_STOCK' || w.type === 'NOT_FOUND'
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack(router, '/(app)')}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>Your Cart</Text>
          <Text style={styles.headerSubtitle}>{totalItems} item{totalItems === 1 ? '' : 's'}</Text>
        </View>

        {items.length > 0 ? (
          <TouchableOpacity style={styles.clearBtn} onPress={handleClearConfirm} activeOpacity={0.75}>
            <Text style={styles.clearText}>Clear</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.placeholder} />
        )}
      </View>

      {/* Main Content */}
      {items.length === 0 ? (
        <EmptyState
          iconText="🛒"
          title="Your Cart is Empty"
          description="Looks like you haven't added any items to your cart yet."
          actionLabel="Start Shopping"
          onAction={() => router.push('/(app)')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={syncWithCatalog} colors={[colors.black]} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Catalog alerts if any warnings detected */}
            {catalogWarnings.length > 0 && (
              <View style={styles.warningCard}>
                <Text style={styles.warningTitle}>Catalog Notice</Text>
                {catalogWarnings.map((w, index) => (
                  <Text key={index} style={styles.warningItem}>
                    • {w.message}
                  </Text>
                ))}
              </View>
            )}

            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {items.map((item) => {
                const pId = item.product?._id || item.product?.id;
                const warning = catalogWarnings.find((w) => w.productId === pId);
                return <CartItem key={pId} item={item} warning={warning} />;
              })}
            </View>
          </ScrollView>

          {/* Fixed Bottom Summary */}
          <View style={styles.summaryWrapper}>
            <CartSummary
              subtotal={subtotal}
              itemCount={totalItems}
              hasUnavailableItems={hasUnavailableItems}
              onCheckout={handleCheckout}
            />
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backIcon: {
    fontSize: 20,
    color: colors.primaryText,
    fontWeight: '700',
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
    marginTop: 2,
  },
  clearBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 12,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 230,
  },
  warningCard: {
    backgroundColor: colors.grey100,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 6,
  },
  warningItem: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
    marginBottom: 2,
  },
  itemsList: {
    width: '100%',
  },
  summaryWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: 'transparent',
  },
});
