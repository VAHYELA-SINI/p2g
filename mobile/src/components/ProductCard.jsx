import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { colors, shadows } from '../theme';

export default function ProductCard({ product, onPress }) {
  const { items, addItem, increaseQuantity, decreaseQuantity } = useCartStore();

  const isAvailable = product.isAvailable !== false && (product.stock === undefined || product.stock > 0);
  const cartItem = items.find((i) => (i.product?._id || i.product?.id) === (product._id || product.id));
  const quantityInCart = cartItem?.quantity || 0;

  const handleAdd = (e) => {
    e?.stopPropagation?.();
    if (!isAvailable) return;
    addItem(product, 1);
  };

  const handleIncrease = (e) => {
    e?.stopPropagation?.();
    increaseQuantity(product._id || product.id);
  };

  const handleDecrease = (e) => {
    e?.stopPropagation?.();
    decreaseQuantity(product._id || product.id);
  };

  const categoryName = typeof product.category === 'object' ? product.category?.name : null;

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      {/* Product Image */}
      <View style={styles.imageContainer}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.fallbackEmoji}>🍲</Text>
          </View>
        )}

        {/* Unavailable overlay */}
        {!isAvailable && (
          <View style={styles.unavailableBadge}>
            <Text style={styles.unavailableText}>Out of Stock</Text>
          </View>
        )}
      </View>

      {/* Details */}
      <View style={styles.content}>
        {categoryName ? <Text style={styles.categoryBadge}>{categoryName}</Text> : null}

        <Text style={styles.title} numberOfLines={2}>
          {product.name}
        </Text>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.currencySymbol}>₦</Text>
            <Text style={styles.priceText}>
              {(product.price || 0).toLocaleString()}
            </Text>
          </View>

          {/* Cart action */}
          {isAvailable ? (
            quantityInCart > 0 ? (
              <View style={styles.stepperContainer}>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={handleDecrease}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepText}>-</Text>
                </TouchableOpacity>
                <Text style={styles.stepQty}>{quantityInCart}</Text>
                <TouchableOpacity
                  style={styles.stepBtn}
                  onPress={handleIncrease}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stepText}>+</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={styles.addButton} onPress={handleAdd} activeOpacity={0.85}>
                <Text style={styles.addText}>+ Add</Text>
              </TouchableOpacity>
            )
          ) : (
            <View style={styles.disabledButton}>
              <Text style={styles.disabledText}>Unavailable</Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  imageContainer: {
    width: '100%',
    height: 156,
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
    fontSize: 48,
  },
  unavailableBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.black,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  unavailableText: {
    color: colors.white,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  content: {
    padding: 14,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.grey500,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    lineHeight: 20,
    marginBottom: 10,
    minHeight: 40,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  currencySymbol: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginRight: 2,
  },
  priceText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
  },
  addButton: {
    backgroundColor: colors.black,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 13,
  },
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey100,
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 15,
    lineHeight: 17,
  },
  stepQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    paddingHorizontal: 10,
  },
  disabledButton: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  disabledText: {
    color: colors.grey400,
    fontSize: 12,
    fontWeight: '600',
  },
});
