import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useCartStore } from '../store/cartStore';
import { colors, shadows } from '../theme';

export default function CartItem({ item, warning }) {
  const { increaseQuantity, decreaseQuantity, removeItem } = useCartStore();

  const product = item.product || {};
  const productId = product._id || product.id;
  const unitPrice = product.price || 0;
  const lineSubtotal = unitPrice * item.quantity;

  const isUnavailable = warning?.type === 'OUT_OF_STOCK' || warning?.type === 'NOT_FOUND';
  const isPriceChanged = warning?.type === 'PRICE_CHANGED';

  return (
    <View style={[styles.card, isUnavailable && styles.unavailableCard]}>
      {/* Product Image */}
      <View style={styles.imageWrapper}>
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.fallbackImage}>
            <Text style={styles.fallbackEmoji}>🍲</Text>
          </View>
        )}
      </View>

      {/* Item Info */}
      <View style={styles.details}>
        <View style={styles.headerRow}>
          <Text style={styles.title} numberOfLines={1}>
            {product.name}
          </Text>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => removeItem(productId)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            activeOpacity={0.7}
          >
            <Text style={styles.deleteIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Warnings */}
        {isUnavailable && (
          <View style={styles.warningBanner}>
            <Text style={styles.warningText}>⚠️ Currently unavailable</Text>
          </View>
        )}

        {isPriceChanged && (
          <View style={styles.priceWarningBanner}>
            <Text style={styles.priceWarningText}>
              ℹ️ Price updated: ₦{warning.newPrice?.toLocaleString()}
            </Text>
          </View>
        )}

        <Text style={styles.unitPrice}>₦{unitPrice.toLocaleString()} each</Text>

        {/* Controls and line subtotal */}
        <View style={styles.bottomRow}>
          <View style={styles.stepper}>
            <TouchableOpacity
              style={[styles.stepBtn, item.quantity <= 1 && styles.stepBtnDisabled]}
              onPress={() => decreaseQuantity(productId)}
              disabled={item.quantity <= 1}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Text style={[styles.stepText, item.quantity <= 1 && styles.stepTextDisabled]}>-</Text>
            </TouchableOpacity>

            <Text style={styles.quantityText}>{item.quantity}</Text>

            <TouchableOpacity
              style={styles.stepBtn}
              onPress={() => increaseQuantity(productId)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              activeOpacity={0.7}
            >
              <Text style={styles.stepText}>+</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.lineSubtotal}>
            <Text style={styles.subtotalLabel}>Total: </Text>
            <Text style={styles.subtotalValue}>₦{lineSubtotal.toLocaleString()}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  unavailableCard: {
    borderColor: colors.grey400,
    backgroundColor: colors.grey100,
  },
  imageWrapper: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: colors.grey100,
    marginRight: 14,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  fallbackImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.grey100,
  },
  fallbackEmoji: {
    fontSize: 32,
  },
  details: {
    flex: 1,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    flex: 1,
    marginRight: 8,
  },
  deleteButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.grey100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteIcon: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grey600,
  },
  warningBanner: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.grey300,
  },
  warningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.black,
  },
  priceWarningBanner: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginVertical: 4,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: colors.grey300,
  },
  priceWarningText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.primaryText,
  },
  unitPrice: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
    marginBottom: 8,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.grey100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 3,
    paddingVertical: 2,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 6,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepBtnDisabled: {
    backgroundColor: colors.grey200,
    opacity: 0.6,
  },
  stepText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  stepTextDisabled: {
    color: colors.grey400,
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    paddingHorizontal: 10,
  },
  lineSubtotal: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  subtotalLabel: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  subtotalValue: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.primaryText,
  },
});
