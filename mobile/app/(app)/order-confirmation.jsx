import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchOrderById, cancelOrder } from '../../src/api/ordersApi';
import LoadingState from '../../src/components/LoadingState';
import ErrorState from '../../src/components/ErrorState';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

export default function OrderConfirmationScreen() {
  const router = useRouter();
  const { orderId } = useLocalSearchParams();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const loadOrder = useCallback(async () => {
    if (!orderId) return;
    try {
      setErrorMessage(null);
      const data = await fetchOrderById(orderId);
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setErrorMessage(err.message || 'Could not retrieve order details.');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  const handleCancelOrder = () => {
    Alert.alert(
      'Cancel Order?',
      'Are you sure you want to cancel this order? Any reserved inventory will be returned to the store.',
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Cancel Order',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsCancelling(true);
              const updated = await cancelOrder(orderId, 'Customer cancelled from confirmation screen');
              setOrder(updated);
              Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            } catch (err) {
              Alert.alert('Cancellation Failed', err.message || 'Could not cancel order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.homeBtn}
          onPress={() => router.replace('/(app)')}
          activeOpacity={0.75}
        >
          <Text style={styles.homeBtnText}>🏠 Home</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Order Confirmation</Text>
        <View style={styles.placeholder} />
      </View>

      {isLoading ? (
        <LoadingState message="Loading order details..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadOrder} />
      ) : !order ? (
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Order Not Found</Text>
          <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.replace('/(app)')}>
            <Text style={styles.backHomeText}>Return to Store</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Status Hero Card */}
          <View style={[styles.heroCard, order.orderStatus === 'CANCELLED' && styles.heroCardCancelled]}>
            <Text style={styles.heroEmoji}>
              {order.orderStatus === 'CANCELLED' ? '✕' : '✓'}
            </Text>
            <Text style={styles.heroTitle}>
              {order.orderStatus === 'CANCELLED' ? 'Order Cancelled' : 'Order Placed Successfully!'}
            </Text>
            <Text style={styles.heroSubtitle}>
              Order ID: #{order._id?.slice(-8).toUpperCase()}
            </Text>

            <View style={styles.badgesRow}>
              <View style={[styles.pillBadge, styles.statusPill]}>
                <Text style={styles.statusPillText}>Status: {order.orderStatus}</Text>
              </View>
              <View style={[styles.pillBadge, styles.paymentPill]}>
                <Text style={styles.paymentPillText}>Payment: {order.paymentStatus}</Text>
              </View>
            </View>
          </View>

          {/* Payment Notice */}
          <View style={styles.infoNotice}>
            <Text style={styles.infoNoticeTitle}>💳 Payment Status Notice</Text>
            <Text style={styles.infoNoticeText}>
              Your order is recorded as {order.paymentStatus}. You can track status or complete checkout verification below.
            </Text>
          </View>

          {/* Delivery Information Recap */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Delivery Information</Text>

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Recipient</Text>
              <Text style={styles.infoValue}>{order.deliveryInformation?.fullName}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone</Text>
              <Text style={styles.infoValue}>{order.deliveryInformation?.phone}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Address</Text>
              <Text style={styles.infoValue}>{order.deliveryInformation?.address}</Text>
            </View>
            <View style={styles.divider} />

            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>City</Text>
              <Text style={styles.infoValue}>{order.deliveryInformation?.city}</Text>
            </View>

            {order.deliveryInformation?.additionalInstructions ? (
              <>
                <View style={styles.divider} />
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Instructions</Text>
                  <Text style={styles.infoValue}>
                    {order.deliveryInformation.additionalInstructions}
                  </Text>
                </View>
              </>
            ) : null}
          </View>

          {/* Order Items & Totals */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Order Summary</Text>

            {order.items?.map((item, idx) => (
              <View key={idx} style={styles.itemRow}>
                <View style={styles.itemMeta}>
                  <Text style={styles.itemQty}>{item.quantity}x</Text>
                  <Text style={styles.itemName}>{item.name}</Text>
                </View>
                <Text style={styles.itemTotal}>₦{(item.subtotal || 0).toLocaleString()}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items Subtotal</Text>
              <Text style={styles.summaryValue}>₦{(order.subtotal || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₦{(order.deliveryFee || 0).toLocaleString()}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalValue}>₦{(order.totalAmount || 0).toLocaleString()}</Text>
            </View>
          </View>

          {/* Cancellation Option if still PENDING */}
          {order.orderStatus === 'PENDING' && (
            <TouchableOpacity
              style={[styles.cancelBtn, isCancelling && styles.disabledBtn]}
              onPress={handleCancelOrder}
              disabled={isCancelling}
              activeOpacity={0.75}
            >
              {isCancelling ? (
                <ActivityIndicator size="small" color={colors.primaryText} />
              ) : (
                <Text style={styles.cancelBtnText}>Cancel Order</Text>
              )}
            </TouchableOpacity>
          )}

          {/* Track Order Details */}
          <TouchableOpacity
            style={styles.trackDetailsBtn}
            onPress={() => router.push(`/(app)/order/${order._id}`)}
            activeOpacity={0.85}
          >
            <Text style={styles.trackDetailsText}>📦 Track Order Details & Status</Text>
          </TouchableOpacity>

          {/* Return Home */}
          <TouchableOpacity
            style={styles.returnHomeBtn}
            onPress={() => router.replace('/(app)')}
            activeOpacity={0.85}
          >
            <Text style={styles.returnHomeText}>Continue Shopping</Text>
          </TouchableOpacity>
        </ScrollView>
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
  homeBtn: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  homeBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  placeholder: {
    width: 60,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.black,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 16,
    ...shadows.md,
  },
  heroCardCancelled: {
    backgroundColor: colors.charcoal,
  },
  heroEmoji: {
    fontSize: 36,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.white,
    marginBottom: 4,
  },
  heroSubtitle: {
    fontSize: 14,
    color: colors.grey300,
    fontWeight: '600',
    marginBottom: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  statusPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statusPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  paymentPill: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  paymentPillText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '700',
  },
  infoNotice: {
    backgroundColor: colors.grey100,
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoNoticeTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  infoNoticeText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  infoLabel: {
    fontSize: 13,
    color: colors.secondaryText,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: colors.primaryText,
    fontWeight: '600',
    maxWidth: '65%',
    textAlign: 'right',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemMeta: {
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
  itemTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  summaryLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginTop: 4,
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
  cancelBtn: {
    backgroundColor: colors.grey100,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 15,
  },
  trackDetailsBtn: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    ...shadows.sm,
  },
  trackDetailsText: {
    color: colors.white,
    fontWeight: '700',
    fontSize: 16,
  },
  returnHomeBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
  },
  returnHomeText: {
    color: colors.primaryText,
    fontWeight: '700',
    fontSize: 16,
  },
  disabledBtn: {
    opacity: 0.6,
  },
  notFoundContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 16,
  },
  backHomeBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backHomeText: {
    color: colors.white,
    fontWeight: '600',
  },
});
