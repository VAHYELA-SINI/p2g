import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Image,
  Alert,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { fetchOrderById, cancelOrder } from '../../../src/api/ordersApi';
import { initializePayment, verifyPayment } from '../../../src/api/paymentsApi';
import OrderStatusTimeline from '../../../src/components/OrderStatusTimeline';
import LoadingState from '../../../src/components/LoadingState';
import ErrorState from '../../../src/components/ErrorState';
import {
  formatCurrency,
  formatDateTime,
  getOrderStatusConfig,
  getPaymentStatusConfig,
} from '../../../src/utils/formatters';
import { safeBack } from '../../../src/utils/navigation';
import { colors, shadows } from '../../../src/theme';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [order, setOrder] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const loadOrderDetails = useCallback(async () => {
    if (!id) return;
    try {
      setErrorMessage(null);
      const data = await fetchOrderById(id);
      setOrder(data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setErrorMessage(err.message || 'Unable to load order details.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetails();
  }, [loadOrderDetails]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrderDetails();
  };

  const handleCancelOrder = () => {
    if (!order || order.orderStatus !== 'PENDING') return;

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
              const updated = await cancelOrder(order._id, 'Customer cancelled from order details');
              setOrder(updated);
              Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            } catch (err) {
              Alert.alert('Cancellation Error', err.message || 'Could not cancel order.');
            } finally {
              setIsCancelling(false);
            }
          },
        },
      ]
    );
  };

  const handlePayNow = async () => {
    if (!order) return;
    try {
      setIsProcessingPayment(true);
      const transaction = await initializePayment(order._id);
      if (!transaction?.authorization_url) {
        throw new Error('No authorization URL received from payment provider.');
      }

      const canOpen = await Linking.canOpenURL(transaction.authorization_url);
      if (canOpen) {
        await Linking.openURL(transaction.authorization_url);
      }

      Alert.alert(
        'Complete Payment',
        'Once you have completed your payment on the Paystack checkout page, tap "Verify Payment" to confirm your order.',
        [
          { text: 'Later', style: 'cancel' },
          {
            text: 'Verify Payment',
            onPress: async () => {
              try {
                setIsLoading(true);
                const verified = await verifyPayment(transaction.reference);
                if (verified) {
                  setOrder(verified);
                  Alert.alert('Payment Successful', 'Your payment was verified and your order is confirmed!');
                }
              } catch (verifyErr) {
                Alert.alert(
                  'Verification Pending',
                  verifyErr.message || 'Payment is still processing. Please pull down to refresh in a moment.'
                );
              } finally {
                setIsLoading(false);
              }
            },
          },
        ]
      );
    } catch (err) {
      Alert.alert('Payment Initialization Failed', err.message || 'Could not start payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeBack(router, '/(app)/orders')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
        <LoadingState message="Loading order details..." />
      </SafeAreaView>
    );
  }

  if (errorMessage) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeBack(router, '/(app)/orders')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
        <ErrorState message={errorMessage} onRetry={loadOrderDetails} />
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backButton} onPress={() => safeBack(router, '/(app)/orders')}>
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Details</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyTitle}>Order Not Found</Text>
          <Text style={styles.emptyText}>The requested order could not be located.</Text>
          <TouchableOpacity style={styles.returnBtn} onPress={() => router.push('/(app)/orders')}>
            <Text style={styles.returnBtnText}>View My Orders</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const orderCfg = getOrderStatusConfig(order.orderStatus);
  const paymentCfg = getPaymentStatusConfig(order.paymentStatus);
  const canCancel = order.orderStatus === 'PENDING';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeBack(router, '/(app)/orders')}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>Order Details</Text>
          <Text style={styles.headerSubtitle}>#{order._id.slice(-8).toUpperCase()}</Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.75}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[colors.black]} />
        }
      >
        {/* Hero Card: Primary Status */}
        <View
          style={[
            styles.heroCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.heroIconBox, { backgroundColor: orderCfg.bgColor }]}>
              <Text style={[styles.heroIcon, { color: orderCfg.color }]}>{orderCfg.icon}</Text>
            </View>
            <View style={styles.heroStatusTextCol}>
              <Text style={styles.heroStatusTitle}>
                {orderCfg.label}
              </Text>
              <Text style={styles.heroStatusDesc}>{orderCfg.description}</Text>
            </View>
          </View>

          <View style={styles.heroMetaRow}>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Order Reference</Text>
              <Text style={styles.metaValue}>#{order._id.slice(-8).toUpperCase()}</Text>
            </View>
            <View style={styles.metaItem}>
              <Text style={styles.metaLabel}>Order Date</Text>
              <Text style={styles.metaValue}>{formatDateTime(order.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* Failed Payment Alert */}
        {order.paymentStatus === 'FAILED' && order.orderStatus !== 'CANCELLED' && (
          <View style={styles.failedPaymentCard}>
            <View style={styles.failedIconBox}>
              <Text style={styles.failedIcon}>⚠️</Text>
            </View>
            <View style={styles.failedContentBox}>
              <Text style={styles.failedTitle}>Payment Failed</Text>
              <Text style={styles.failedMessage}>
                The transaction could not be processed. Please retry payment to confirm your order.
              </Text>
              <TouchableOpacity
                style={styles.retryPayBtn}
                onPress={handlePayNow}
                disabled={isProcessingPayment}
                activeOpacity={0.85}
              >
                {isProcessingPayment ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.retryPayBtnText}>Retry Payment ({formatCurrency(order.totalAmount)})</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Pending Payment Action Banner */}
        {order.paymentStatus === 'PENDING' && order.orderStatus !== 'CANCELLED' && (
          <View style={styles.pendingPayCard}>
            <View style={styles.pendingPayContent}>
              <Text style={styles.pendingPayTitle}>💳 Awaiting Payment</Text>
              <Text style={styles.pendingPayText}>
                Complete payment via Paystack to dispatch your fresh order immediately.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.payNowBtn}
              onPress={handlePayNow}
              disabled={isProcessingPayment}
              activeOpacity={0.85}
            >
              {isProcessingPayment ? (
                <ActivityIndicator size="small" color={colors.white} />
              ) : (
                <Text style={styles.payNowBtnText}>Pay Now</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Status Timeline */}
        <OrderStatusTimeline
          currentStatus={order.orderStatus}
          statusHistory={order.statusHistory || []}
          createdAt={order.createdAt}
        />

        {/* Payment Details Card */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionCardTitle}>Payment Information</Text>
            <View
              style={[
                styles.statusPill,
                { backgroundColor: paymentCfg.bgColor, borderColor: paymentCfg.borderColor },
              ]}
            >
              <Text style={[styles.statusPillText, { color: paymentCfg.color }]}>
                {paymentCfg.icon} {paymentCfg.label}
              </Text>
            </View>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Payment Method</Text>
            <Text style={styles.detailValue}>
              {order.paymentDetails?.channel ? `Paystack (${order.paymentDetails.channel.toUpperCase()})` : 'Paystack Online'}
            </Text>
          </View>

          {order.paymentReference ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Transaction Reference</Text>
              <Text style={[styles.detailValue, styles.monoFont]} numberOfLines={1}>
                {order.paymentReference}
              </Text>
            </View>
          ) : null}

          {order.paymentDetails?.paidAt ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Paid At</Text>
              <Text style={styles.detailValue}>
                {formatDateTime(order.paymentDetails.paidAt)}
              </Text>
            </View>
          ) : null}

          {order.paymentDetails?.gatewayResponse ? (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Gateway Response</Text>
              <Text style={styles.detailValue}>
                {order.paymentDetails.gatewayResponse}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Order Items Breakdown */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Order Items ({order.items?.length || 0})</Text>

          {order.items?.map((item, index) => {
            const itemTotal = Number(item.price) * Number(item.quantity);
            return (
              <View key={item._id || index} style={styles.itemRow}>
                {item.image ? (
                  <Image source={{ uri: item.image }} style={styles.itemThumbnail} resizeMode="cover" />
                ) : (
                  <View style={styles.itemImageFallback}>
                    <Text style={styles.itemFallbackText}>🍲</Text>
                  </View>
                )}

                <View style={styles.itemInfoCol}>
                  <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.itemQtyPrice}>
                    {formatCurrency(item.price)} × {item.quantity}
                  </Text>
                </View>

                <Text style={styles.itemTotalPrice}>{formatCurrency(itemTotal)}</Text>
              </View>
            );
          })}
        </View>

        {/* Delivery Information Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Delivery Information</Text>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Recipient</Text>
            <Text style={styles.detailValue}>
              {order.deliveryInformation?.fullName || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Contact Phone</Text>
            <Text style={styles.detailValue}>
              {order.deliveryInformation?.phone || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Delivery Address</Text>
            <Text style={styles.detailValue}>
              {order.deliveryInformation?.address || 'N/A'}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>City / Area</Text>
            <Text style={styles.detailValue}>
              {order.deliveryInformation?.city || 'N/A'}
            </Text>
          </View>

          {order.deliveryInformation?.additionalInstructions ? (
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsLabel}>Delivery Instructions:</Text>
              <Text style={styles.instructionsText}>
                {order.deliveryInformation.additionalInstructions}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Financial Summary Card */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionCardTitle}>Payment Summary</Text>

          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Subtotal</Text>
            <Text style={styles.financialValue}>{formatCurrency(order.subtotal)}</Text>
          </View>

          <View style={styles.financialRow}>
            <Text style={styles.financialLabel}>Delivery Fee</Text>
            <Text style={styles.financialValue}>{formatCurrency(order.deliveryFee)}</Text>
          </View>

          <View style={styles.financialDivider} />

          <View style={styles.financialRowTotal}>
            <Text style={styles.financialTotalLabel}>Total Amount</Text>
            <Text style={styles.financialTotalValue}>{formatCurrency(order.totalAmount)}</Text>
          </View>
        </View>

        {/* Cancel Action Button */}
        {canCancel && (
          <TouchableOpacity
            style={styles.cancelOrderButton}
            onPress={handleCancelOrder}
            disabled={isCancelling}
            activeOpacity={0.8}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color={colors.primaryText} />
            ) : (
              <Text style={styles.cancelOrderButtonText}>Cancel This Order</Text>
            )}
          </TouchableOpacity>
        )}

        {/* Return Button */}
        <TouchableOpacity
          style={styles.backToOrdersBtn}
          onPress={() => safeBack(router, '/(app)/orders')}
          activeOpacity={0.75}
        >
          <Text style={styles.backToOrdersText}>← View All My Orders</Text>
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
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 20,
    color: colors.primaryText,
    fontWeight: '700',
  },
  headerTitleBox: {
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
    fontFamily: 'monospace',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshBtnText: {
    fontSize: 16,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 48,
  },
  heroCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1,
    ...shadows.sm,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  heroIcon: {
    fontSize: 20,
    fontWeight: '800',
  },
  heroStatusTextCol: {
    flex: 1,
  },
  heroStatusTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 2,
  },
  heroStatusDesc: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  heroMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metaItem: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 11,
    color: colors.grey400,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  metaValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primaryText,
    marginTop: 2,
  },
  failedPaymentCard: {
    flexDirection: 'row',
    backgroundColor: colors.grey100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  failedIconBox: {
    marginRight: 12,
    marginTop: 2,
  },
  failedIcon: {
    fontSize: 22,
  },
  failedContentBox: {
    flex: 1,
  },
  failedTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  failedMessage: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 17,
    marginBottom: 12,
  },
  retryPayBtn: {
    backgroundColor: colors.black,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  retryPayBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  pendingPayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.grey100,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 14,
  },
  pendingPayContent: {
    flex: 1,
    marginRight: 12,
  },
  pendingPayTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  pendingPayText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
  payNowBtn: {
    backgroundColor: colors.black,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 8,
  },
  payNowBtnText: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '700',
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey50,
  },
  detailLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    textAlign: 'right',
    maxWidth: '60%',
  },
  monoFont: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.grey50,
  },
  itemThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.grey100,
    marginRight: 12,
  },
  itemImageFallback: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemFallbackText: {
    fontSize: 20,
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 2,
  },
  itemQtyPrice: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  itemTotalPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  instructionsBox: {
    marginTop: 10,
    backgroundColor: colors.grey50,
    borderRadius: 8,
    padding: 10,
    borderLeftWidth: 3,
    borderLeftColor: colors.black,
  },
  instructionsLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  instructionsText: {
    fontSize: 12,
    color: colors.secondaryText,
    lineHeight: 16,
  },
  financialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  financialLabel: {
    fontSize: 13,
    color: colors.secondaryText,
  },
  financialValue: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
  },
  financialDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 8,
  },
  financialRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    paddingTop: 4,
  },
  financialTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  financialTotalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.black,
  },
  cancelOrderButton: {
    backgroundColor: colors.grey100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
  },
  cancelOrderButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  backToOrdersBtn: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  backToOrdersText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: colors.secondaryText,
    textAlign: 'center',
    marginBottom: 20,
  },
  returnBtn: {
    backgroundColor: colors.black,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  returnBtnText: {
    color: colors.white,
    fontWeight: '700',
  },
});
