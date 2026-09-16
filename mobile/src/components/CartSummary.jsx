import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, shadows } from '../theme';

export default function CartSummary({
  subtotal = 0,
  itemCount = 0,
  hasUnavailableItems = false,
  onCheckout,
}) {
  return (
    <View style={styles.container}>
      {/* Disclaimer */}
      <View style={styles.disclaimerBox}>
        <Text style={styles.disclaimerText}>
          🔒 Subtotal is for estimation only. The store calculates final line items and delivery
          fees authoritatively upon checkout.
        </Text>
      </View>

      {/* Breakdown */}
      <View style={styles.row}>
        <Text style={styles.label}>Selected Items ({itemCount})</Text>
        <Text style={styles.value}>₦{subtotal.toLocaleString()}</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Estimated Subtotal</Text>
        <Text style={styles.totalValue}>₦{subtotal.toLocaleString()}</Text>
      </View>

      {/* Checkout CTA */}
      <TouchableOpacity
        style={[styles.checkoutButton, hasUnavailableItems && styles.disabledButton]}
        onPress={onCheckout}
        disabled={hasUnavailableItems}
        activeOpacity={0.85}
      >
        <Text style={[styles.checkoutText, hasUnavailableItems && styles.disabledText]}>
          {hasUnavailableItems ? 'Remove Unavailable Items First' : 'Proceed to Checkout'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.md,
  },
  disclaimerBox: {
    backgroundColor: colors.grey50,
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.grey500,
    lineHeight: 16,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 14,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  totalValue: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.black,
  },
  checkoutButton: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadows.sm,
  },
  disabledButton: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  checkoutText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  disabledText: {
    color: colors.grey400,
  },
});
