import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { useCartStore } from '../../src/store/cartStore';
import { createOrder } from '../../src/api/ordersApi';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

export default function CheckoutScreen() {
  const router = useRouter();
  const { user } = useAuthStore();
  const { items, getSubtotal, getTotalItems, clearCart, catalogWarnings } = useCartStore();

  const [fullName, setFullName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [additionalInstructions, setAdditionalInstructions] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const subtotal = getSubtotal();
  const totalItems = getTotalItems();
  const estimatedDeliveryFee = 1000;
  const estimatedTotal = subtotal + estimatedDeliveryFee;

  const hasUnavailableItems = catalogWarnings.some(
    (w) => w.type === 'OUT_OF_STOCK' || w.type === 'NOT_FOUND'
  );

  useEffect(() => {
    if (items.length === 0) {
      Alert.alert('Empty Cart', 'Your shopping cart is empty. Please add items to checkout.', [
        { text: 'Browse Catalog', onPress: () => router.replace('/(app)') },
      ]);
    }
  }, [items, router]);

  const validateForm = () => {
    const errors = {};
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.fullName = 'Please enter a valid recipient full name.';
    }
    if (!phone.trim() || phone.trim().length < 7) {
      errors.phone = 'Please enter a valid delivery contact phone number.';
    }
    if (!address.trim() || address.trim().length < 5) {
      errors.address = 'Please enter your street / building address.';
    }
    if (!city.trim() || city.trim().length < 2) {
      errors.city = 'Please enter your delivery city or area.';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handlePlaceOrder = async () => {
    if (hasUnavailableItems) {
      Alert.alert(
        'Unavailable Items in Cart',
        'Please return to your cart and remove any unavailable items before proceeding.'
      );
      return;
    }

    if (!validateForm()) {
      Alert.alert('Incomplete Delivery Details', 'Please fill in all required delivery fields.');
      return;
    }

    try {
      setIsSubmitting(true);

      const deliveryInformation = {
        fullName,
        phone,
        address,
        city,
        additionalInstructions,
      };

      const order = await createOrder({
        items,
        deliveryInformation,
      });

      clearCart();

      router.replace({
        pathname: '/(app)/order-confirmation',
        params: { orderId: order._id },
      });
    } catch (error) {
      console.error('Order creation error:', error);
      Alert.alert('Order Placement Failed', error.message || 'Could not place order. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack(router, '/(app)/cart')}
          activeOpacity={0.75}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Delivery & Checkout</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Authoritative Server Notice */}
        <View style={styles.noticeBox}>
          <Text style={styles.noticeTitle}>🔒 Secure Checkout</Text>
          <Text style={styles.noticeText}>
            All product prices, delivery fees, and order totals are calculated authoritatively by the store.
            Payment will be verified in the next step.
          </Text>
        </View>

        {/* Delivery Information Section */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Delivery Information</Text>

          {/* Full Name */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Recipient Full Name *</Text>
            <TextInput
              style={[styles.input, validationErrors.fullName && styles.inputError]}
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setValidationErrors((prev) => ({ ...prev, fullName: null }));
              }}
              placeholder="e.g. Adebayo Ogunlesi"
              placeholderTextColor={colors.grey400}
            />
            {validationErrors.fullName && (
              <Text style={styles.errorText}>{validationErrors.fullName}</Text>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Contact Phone Number *</Text>
            <TextInput
              style={[styles.input, validationErrors.phone && styles.inputError]}
              value={phone}
              onChangeText={(text) => {
                setPhone(text);
                setValidationErrors((prev) => ({ ...prev, phone: null }));
              }}
              placeholder="e.g. 08012345678"
              placeholderTextColor={colors.grey400}
              keyboardType="phone-pad"
            />
            {validationErrors.phone && (
              <Text style={styles.errorText}>{validationErrors.phone}</Text>
            )}
          </View>

          {/* Street Address */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Delivery Street Address *</Text>
            <TextInput
              style={[styles.input, validationErrors.address && styles.inputError]}
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setValidationErrors((prev) => ({ ...prev, address: null }));
              }}
              placeholder="e.g. 15 Admiralty Way, Lekki Phase 1"
              placeholderTextColor={colors.grey400}
            />
            {validationErrors.address && (
              <Text style={styles.errorText}>{validationErrors.address}</Text>
            )}
          </View>

          {/* City */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>City / Town *</Text>
            <TextInput
              style={[styles.input, validationErrors.city && styles.inputError]}
              value={city}
              onChangeText={(text) => {
                setCity(text);
                setValidationErrors((prev) => ({ ...prev, city: null }));
              }}
              placeholder="e.g. Lagos"
              placeholderTextColor={colors.grey400}
            />
            {validationErrors.city && (
              <Text style={styles.errorText}>{validationErrors.city}</Text>
            )}
          </View>

          {/* Additional Instructions */}
          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Delivery Instructions (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={additionalInstructions}
              onChangeText={setAdditionalInstructions}
              placeholder="e.g. Ring apartment 4B bell or leave with security"
              placeholderTextColor={colors.grey400}
              multiline
              numberOfLines={3}
            />
          </View>
        </View>

        {/* Order Summary Recap */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Order Items ({totalItems})</Text>

          {items.map((item) => (
            <View key={item.product?._id || item.product?.id} style={styles.itemRow}>
              <View style={styles.itemLeft}>
                <Text style={styles.itemQty}>{item.quantity}x</Text>
                <Text style={styles.itemName} numberOfLines={1}>
                  {item.product?.name}
                </Text>
              </View>
              <Text style={styles.itemPrice}>
                ₦{((item.product?.price || 0) * item.quantity).toLocaleString()}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Estimated Items Subtotal</Text>
            <Text style={styles.breakdownValue}>₦{subtotal.toLocaleString()}</Text>
          </View>

          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Estimated Delivery Fee</Text>
            <Text style={styles.breakdownValue}>₦{estimatedDeliveryFee.toLocaleString()}</Text>
          </View>

          <View style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Estimated Total</Text>
            <Text style={styles.totalValue}>₦{estimatedTotal.toLocaleString()}</Text>
          </View>
        </View>

        {/* Place Order CTA */}
        <TouchableOpacity
          style={[styles.placeOrderBtn, (isSubmitting || hasUnavailableItems) && styles.disabledBtn]}
          onPress={handlePlaceOrder}
          disabled={isSubmitting || hasUnavailableItems}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : (
            <Text style={styles.placeOrderText}>Confirm & Place Order</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  noticeBox: {
    backgroundColor: colors.grey100,
    borderRadius: 14,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  noticeText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 16,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: colors.primaryText,
  },
  inputError: {
    borderColor: colors.black,
    backgroundColor: colors.grey50,
  },
  textArea: {
    minHeight: 70,
    textAlignVertical: 'top',
  },
  errorText: {
    fontSize: 12,
    color: colors.primaryText,
    marginTop: 4,
    fontWeight: '600',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  itemQty: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.black,
    width: 26,
  },
  itemName: {
    fontSize: 14,
    color: colors.primaryText,
    flex: 1,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  breakdownLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.black,
  },
  placeOrderBtn: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    ...shadows.sm,
  },
  disabledBtn: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  placeOrderText: {
    color: colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
