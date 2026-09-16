import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchProductById } from '../../../src/api/productsApi';
import { useCartStore } from '../../../src/store/cartStore';
import CartBadge from '../../../src/components/CartBadge';
import LoadingState from '../../../src/components/LoadingState';
import EmptyState from '../../../src/components/EmptyState';
import ErrorState from '../../../src/components/ErrorState';
import { safeBack } from '../../../src/utils/navigation';
import { colors, shadows } from '../../../src/theme';

export default function ProductDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { addItem, items } = useCartStore();

  const [product, setProduct] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [showAddedBanner, setShowAddedBanner] = useState(false);

  const loadProduct = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMessage(null);
      const data = await fetchProductById(id);
      setProduct(data);
    } catch (err) {
      console.error('Error loading product details:', err);
      setErrorMessage(err.message || 'Product not found or unavailable.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    setIsLoading(true);
    loadProduct();
  }, [loadProduct]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadProduct();
  };

  const handleIncreaseQty = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecreaseQty = () => {
    setQuantity((prev) => Math.max(1, prev - 1));
  };

  const handleAddToCart = () => {
    if (!product) return;
    addItem(product, quantity);
    setShowAddedBanner(true);
    setTimeout(() => {
      setShowAddedBanner(false);
    }, 2500);
  };

  const isAvailable = product?.isAvailable !== false && (product?.stock === undefined || product?.stock > 0);
  const existingCartItem = items.find((i) => (i.product?._id || i.product?.id) === id);
  const quantityAlreadyInCart = existingCartItem?.quantity || 0;
  const categoryName = typeof product?.category === 'object' ? product?.category?.name : null;

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
        <Text style={styles.headerTitle}>Product Details</Text>
        <CartBadge />
      </View>

      {/* Added to cart toast banner */}
      {showAddedBanner && (
        <View style={styles.toastBanner}>
          <Text style={styles.toastText}>
            ✓ Added {quantity} item(s) to your cart!
          </Text>
          <TouchableOpacity onPress={() => router.push('/(app)/cart')}>
            <Text style={styles.toastLink}>View Cart →</Text>
          </TouchableOpacity>
        </View>
      )}

      {isLoading ? (
        <LoadingState message="Loading product details..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadProduct} />
      ) : !product ? (
        <EmptyState
          iconText="🍽️"
          title="Product Not Found"
          description="This item is no longer available in the store catalog."
          actionLabel="Go Back"
          onAction={() => safeBack(router, '/(app)')}
        />
      ) : (
        <>
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.black]} />}
            showsVerticalScrollIndicator={false}
          >
            {/* Main Product Image */}
            <View style={styles.imageContainer}>
              {product.image ? (
                <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
              ) : (
                <View style={styles.imageFallback}>
                  <Text style={styles.fallbackEmoji}>🍲</Text>
                </View>
              )}

              {!isAvailable && (
                <View style={styles.outOfStockBadge}>
                  <Text style={styles.outOfStockText}>Out of Stock</Text>
                </View>
              )}
            </View>

            {/* Product Meta */}
            <View style={styles.metaContainer}>
              {categoryName ? (
                <View style={styles.categoryPill}>
                  <Text style={styles.categoryPillText}>{categoryName}</Text>
                </View>
              ) : null}

              <Text style={styles.productName}>{product.name}</Text>

              {/* Price Row */}
              <View style={styles.priceRow}>
                <View style={styles.priceContainer}>
                  <Text style={styles.currencySymbol}>₦</Text>
                  <Text style={styles.priceValue}>{(product.price || 0).toLocaleString()}</Text>
                </View>

                <View style={[styles.statusBadge, isAvailable ? styles.statusInStock : styles.statusOut]}>
                  <Text style={[styles.statusBadgeText, isAvailable ? styles.statusInStockText : styles.statusOutText]}>
                    {isAvailable ? 'In Stock' : 'Unavailable'}
                  </Text>
                </View>
              </View>

              {quantityAlreadyInCart > 0 && (
                <View style={styles.alreadyInCartBox}>
                  <Text style={styles.alreadyInCartText}>
                    ℹ️ You currently have {quantityAlreadyInCart} in your cart.
                  </Text>
                </View>
              )}

              {/* Description */}
              <View style={styles.sectionDivider} />
              <Text style={styles.sectionHeading}>Description</Text>
              <Text style={styles.descriptionText}>
                {product.description || 'Freshly prepared and packaged with the finest quality ingredients.'}
              </Text>

              {/* Single-vendor store promise */}
              <View style={styles.guaranteeCard}>
                <Text style={styles.guaranteeTitle}>P2G Quality Assurance</Text>
                <Text style={styles.guaranteeBody}>
                  Prepared fresh to order. Sealed and fulfilled directly from our central store.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Sticky Bottom Bar */}
          <View style={styles.bottomBar}>
            <View style={styles.qtyStepper}>
              <TouchableOpacity
                style={[styles.qtyBtn, quantity <= 1 && styles.qtyBtnDisabled]}
                onPress={handleDecreaseQty}
                disabled={quantity <= 1}
                activeOpacity={0.7}
              >
                <Text style={[styles.qtyBtnText, quantity <= 1 && styles.qtyBtnTextDisabled]}>-</Text>
              </TouchableOpacity>
              <Text style={styles.qtyDisplay}>{quantity}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={handleIncreaseQty} activeOpacity={0.7}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.addToCartBtn, !isAvailable && styles.addToCartDisabled]}
              onPress={handleAddToCart}
              disabled={!isAvailable}
              activeOpacity={0.85}
            >
              <Text style={[styles.addToCartText, !isAvailable && styles.addToCartDisabledText]}>
                {isAvailable
                  ? `Add to Cart • ₦${((product.price || 0) * quantity).toLocaleString()}`
                  : 'Currently Unavailable'}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.surface,
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  toastBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.black,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  toastText: {
    color: colors.white,
    fontWeight: '600',
    fontSize: 13,
  },
  toastLink: {
    color: colors.white,
    fontWeight: '800',
    fontSize: 13,
    textDecorationLine: 'underline',
  },
  scrollContent: {
    paddingBottom: 110,
  },
  imageContainer: {
    width: '100%',
    height: 280,
    backgroundColor: colors.grey100,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageFallback: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey100,
  },
  fallbackEmoji: {
    fontSize: 80,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: 16,
    right: 16,
    backgroundColor: colors.black,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  outOfStockText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  metaContainer: {
    padding: 22,
  },
  categoryPill: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryPillText: {
    color: colors.secondaryText,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.primaryText,
    lineHeight: 30,
    marginBottom: 14,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.black,
    marginRight: 2,
  },
  priceValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.black,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  statusInStock: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  statusInStockText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 12,
  },
  statusOut: {
    backgroundColor: colors.grey100,
    borderColor: colors.border,
  },
  statusOutText: {
    color: colors.secondaryText,
    fontWeight: '600',
    fontSize: 12,
  },
  alreadyInCartBox: {
    backgroundColor: colors.grey50,
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  alreadyInCartText: {
    color: colors.secondaryText,
    fontSize: 13,
    fontWeight: '500',
  },
  sectionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 18,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 8,
  },
  descriptionText: {
    fontSize: 15,
    color: colors.secondaryText,
    lineHeight: 22,
    marginBottom: 24,
  },
  guaranteeCard: {
    backgroundColor: colors.grey50,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  guaranteeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  guaranteeBody: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.md,
  },
  qtyStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey100,
    borderRadius: 12,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyBtnDisabled: {
    opacity: 0.4,
  },
  qtyBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  qtyBtnTextDisabled: {
    color: colors.grey400,
  },
  qtyDisplay: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    paddingHorizontal: 14,
  },
  addToCartBtn: {
    flex: 1,
    backgroundColor: colors.black,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  addToCartDisabled: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  addToCartText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: '700',
  },
  addToCartDisabledText: {
    color: colors.grey400,
  },
});
