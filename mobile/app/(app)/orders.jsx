import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { fetchOrders, cancelOrder } from '../../src/api/ordersApi';
import {
  formatCurrency,
  formatDateTime,
  getOrderStatusConfig,
  getPaymentStatusConfig,
} from '../../src/utils/formatters';
import LoadingState from '../../src/components/LoadingState';
import EmptyState from '../../src/components/EmptyState';
import ErrorState from '../../src/components/ErrorState';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

const FILTER_TABS = [
  { key: 'ALL', label: 'All Orders' },
  { key: 'ACTIVE', label: 'In Progress' },
  { key: 'DELIVERED', label: 'Completed' },
  { key: 'CANCELLED', label: 'Cancelled' },
];

export default function OrdersScreen() {
  const router = useRouter();

  const [orders, setOrders] = useState([]);
  const [activeFilter, setActiveFilter] = useState('ALL');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cancellingOrderId, setCancellingOrderId] = useState(null);

  const loadOrders = useCallback(async () => {
    try {
      setErrorMessage(null);
      const data = await fetchOrders({ limit: 50 });
      setOrders(data.orders || []);
    } catch (err) {
      console.error('Error fetching orders history:', err);
      setErrorMessage(err.message || 'Unable to retrieve your order history.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const onRefresh = () => {
    setIsRefreshing(true);
    loadOrders();
  };

  const filteredOrders = useMemo(() => {
    if (activeFilter === 'ACTIVE') {
      return orders.filter((o) =>
        ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'].includes(o.orderStatus)
      );
    }
    if (activeFilter === 'DELIVERED') {
      return orders.filter((o) => o.orderStatus === 'DELIVERED');
    }
    if (activeFilter === 'CANCELLED') {
      return orders.filter((o) => o.orderStatus === 'CANCELLED');
    }
    return orders;
  }, [orders, activeFilter]);

  const handleCancelOrder = (order) => {
    Alert.alert(
      'Cancel Order?',
      `Are you sure you want to cancel Order #${order._id.slice(-8).toUpperCase()}?`,
      [
        { text: 'Keep Order', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              setCancellingOrderId(order._id);
              await cancelOrder(order._id, 'Cancelled by customer from orders list');
              await loadOrders();
              Alert.alert('Order Cancelled', 'Your order has been cancelled successfully.');
            } catch (err) {
              Alert.alert('Cancellation Failed', err.message || 'Could not cancel order.');
            } finally {
              setCancellingOrderId(null);
            }
          },
        },
      ]
    );
  };

  const renderOrderItem = ({ item }) => {
    const statusCfg = getOrderStatusConfig(item.orderStatus);
    const paymentCfg = getPaymentStatusConfig(item.paymentStatus);
    const canCancel = item.orderStatus === 'PENDING';
    const isCancelling = cancellingOrderId === item._id;

    const itemsPreview = (item.items || [])
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(', ');

    return (
      <TouchableOpacity
        style={styles.orderCard}
        activeOpacity={0.85}
        onPress={() => router.push(`/(app)/order/${item._id}`)}
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.refBox}>
            <Text style={styles.orderRefText}>
              #{item._id.slice(-8).toUpperCase()}
            </Text>
            {item.paymentReference ? (
              <Text style={styles.paymentRefText} numberOfLines={1}>
                {item.paymentReference}
              </Text>
            ) : null}
          </View>
          <Text style={styles.dateText}>{formatDateTime(item.createdAt)}</Text>
        </View>

        {/* Status Badges Row */}
        <View style={styles.badgesRow}>
          <View
            style={[
              styles.badge,
              { backgroundColor: statusCfg.bgColor, borderColor: statusCfg.borderColor },
            ]}
          >
            <Text style={[styles.badgeText, { color: statusCfg.color }]}>
              {statusCfg.icon} {statusCfg.label}
            </Text>
          </View>

          <View
            style={[
              styles.badge,
              { backgroundColor: paymentCfg.bgColor, borderColor: paymentCfg.borderColor },
            ]}
          >
            <Text style={[styles.badgeText, { color: paymentCfg.color }]}>
              {paymentCfg.icon} Payment: {paymentCfg.label}
            </Text>
          </View>
        </View>

        {/* Failed Payment Notice */}
        {item.paymentStatus === 'FAILED' && item.orderStatus !== 'CANCELLED' && (
          <View style={styles.paymentFailedNotice}>
            <Text style={styles.paymentFailedText}>
              ⚠️ Payment pending verification. Tap to complete payment.
            </Text>
          </View>
        )}

        {/* Items Summary */}
        <View style={styles.itemsSummaryBox}>
          <Text style={styles.itemsSummaryLabel}>Items:</Text>
          <Text style={styles.itemsSummaryContent} numberOfLines={2}>
            {itemsPreview || 'No items listed'}
          </Text>
        </View>

        {/* Delivery info preview */}
        {item.deliveryInformation?.address ? (
          <View style={styles.deliveryPreviewRow}>
            <Text style={styles.deliveryPreviewIcon}>📍</Text>
            <Text style={styles.deliveryPreviewText} numberOfLines={1}>
              {item.deliveryInformation.address}, {item.deliveryInformation.city}
            </Text>
          </View>
        ) : null}

        <View style={styles.cardDivider} />

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalAmountText}>{formatCurrency(item.totalAmount)}</Text>
          </View>

          <View style={styles.actionsRow}>
            {canCancel && (
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => handleCancelOrder(item)}
                disabled={isCancelling}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelBtnText}>
                  {isCancelling ? 'Cancelling...' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.trackBtn}
              onPress={() => router.push(`/(app)/order/${item._id}`)}
              activeOpacity={0.85}
            >
              <Text style={styles.trackBtnText}>Track Order →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => safeBack(router, '/(app)')}
          activeOpacity={0.75}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>

        <View style={styles.headerTitleBox}>
          <Text style={styles.headerTitle}>My Orders</Text>
          <Text style={styles.headerSubtitle}>
            {orders.length} {orders.length === 1 ? 'order' : 'orders'} placed
          </Text>
        </View>

        <TouchableOpacity style={styles.refreshBtn} onPress={onRefresh} activeOpacity={0.75}>
          <Text style={styles.refreshBtnText}>🔄</Text>
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsContainer}>
        <FlatList
          horizontal
          data={FILTER_TABS}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsScroll}
          renderItem={({ item }) => {
            const isSelected = activeFilter === item.key;
            return (
              <TouchableOpacity
                style={[styles.tabPill, isSelected && styles.tabPillActive]}
                onPress={() => setActiveFilter(item.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.tabPillText, isSelected && styles.tabPillTextActive]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Main Content */}
      {isLoading ? (
        <LoadingState message="Loading your orders..." />
      ) : errorMessage ? (
        <ErrorState message={errorMessage} onRetry={loadOrders} />
      ) : filteredOrders.length === 0 ? (
        <EmptyState
          title={
            activeFilter === 'ALL'
              ? 'No orders yet'
              : `No ${activeFilter.toLowerCase()} orders`
          }
          description={
            activeFilter === 'ALL'
              ? 'Your orders will appear here once you place an order from the store.'
              : 'Try changing your filter or browse our catalog to order.'
          }
          actionLabel="Start Shopping"
          onAction={() => router.push('/(app)')}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={(item) => item._id}
          renderItem={renderOrderItem}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              colors={[colors.black]}
            />
          }
        />
      )}
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
  filterTabsContainer: {
    backgroundColor: colors.surface,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: 6,
  },
  tabPillActive: {
    backgroundColor: colors.black,
    borderColor: colors.black,
  },
  tabPillText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  tabPillTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  ordersList: {
    padding: 16,
    paddingBottom: 40,
  },
  orderCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  refBox: {
    flex: 1,
    marginRight: 8,
  },
  orderRefText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  paymentRefText: {
    fontSize: 11,
    color: colors.secondaryText,
    marginTop: 2,
    fontFamily: 'monospace',
  },
  dateText: {
    fontSize: 11,
    color: colors.grey400,
    fontWeight: '500',
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  paymentFailedNotice: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  paymentFailedText: {
    fontSize: 12,
    color: colors.primaryText,
    fontWeight: '600',
  },
  itemsSummaryBox: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  itemsSummaryLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryText,
    marginRight: 6,
  },
  itemsSummaryContent: {
    flex: 1,
    fontSize: 13,
    color: colors.primaryText,
  },
  deliveryPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryPreviewIcon: {
    fontSize: 12,
    marginRight: 4,
  },
  deliveryPreviewText: {
    fontSize: 12,
    color: colors.secondaryText,
    flex: 1,
  },
  cardDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 10,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 11,
    color: colors.secondaryText,
    textTransform: 'uppercase',
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.black,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryText,
  },
  trackBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: colors.black,
  },
  trackBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.white,
  },
});
