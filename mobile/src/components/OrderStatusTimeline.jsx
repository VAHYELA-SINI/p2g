import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { formatDateTime, getOrderStatusConfig } from '../utils/formatters';
import { colors, shadows } from '../theme';

const TIMELINE_STEPS = [
  {
    key: 'PENDING',
    title: 'Order Placed',
    subtitle: 'Order submitted to kitchen',
    icon: '📝',
  },
  {
    key: 'CONFIRMED',
    title: 'Order Confirmed',
    subtitle: 'Payment confirmed & order accepted',
    icon: '✓',
  },
  {
    key: 'PREPARING',
    title: 'In Preparation',
    subtitle: 'Chef is preparing your fresh meal',
    icon: '🍳',
  },
  {
    key: 'READY',
    title: 'Ready for Dispatch',
    subtitle: 'Packed and waiting for delivery courier',
    icon: '📦',
  },
  {
    key: 'OUT_FOR_DELIVERY',
    title: 'Out for Delivery',
    subtitle: 'Courier is on the way to your address',
    icon: '🛵',
  },
  {
    key: 'DELIVERED',
    title: 'Delivered',
    subtitle: 'Order completed. Enjoy your meal!',
    icon: '✓',
  },
];

export default function OrderStatusTimeline({ currentStatus, statusHistory = [], createdAt }) {
  const isCancelled = currentStatus === 'CANCELLED';

  const getHistoryItem = (statusKey) => {
    if (!Array.isArray(statusHistory)) return null;
    return statusHistory.find((h) => h.status === statusKey);
  };

  const currentConfig = getOrderStatusConfig(currentStatus);
  const activeIndex = isCancelled ? -1 : currentConfig.stepIndex;
  const cancelledRecord = isCancelled ? getHistoryItem('CANCELLED') : null;

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.timelineHeading}>Order Timeline</Text>
        <View
          style={[
            styles.currentStatusBadge,
            { backgroundColor: currentConfig.bgColor, borderColor: currentConfig.borderColor },
          ]}
        >
          <Text style={[styles.currentStatusBadgeText, { color: currentConfig.color }]}>
            {currentConfig.icon} {currentConfig.label}
          </Text>
        </View>
      </View>

      {/* Cancellation Notice Banner */}
      {isCancelled && (
        <View style={styles.cancellationBanner}>
          <View style={styles.cancellationIconBox}>
            <Text style={styles.cancellationIconText}>✕</Text>
          </View>
          <View style={styles.cancellationTextBox}>
            <Text style={styles.cancellationTitle}>Order Was Cancelled</Text>
            <Text style={styles.cancellationTime}>
              {cancelledRecord ? formatDateTime(cancelledRecord.changedAt) : formatDateTime(createdAt)}
            </Text>
            {cancelledRecord?.note ? (
              <Text style={styles.cancellationReason}>Reason: {cancelledRecord.note}</Text>
            ) : null}
          </View>
        </View>
      )}

      {/* Vertical Steps */}
      <View style={styles.stepsList}>
        {TIMELINE_STEPS.map((step, index) => {
          const historyEntry = getHistoryItem(step.key);
          const isCompleted = !isCancelled && index < activeIndex;
          const isCurrent = !isCancelled && index === activeIndex;
          const isUpcoming = isCancelled || index > activeIndex;
          const isLast = index === TIMELINE_STEPS.length - 1;

          const stepTime = historyEntry
            ? formatDateTime(historyEntry.changedAt)
            : index === 0 && createdAt
            ? formatDateTime(createdAt)
            : null;

          return (
            <View key={step.key} style={styles.stepRow}>
              {/* Left Column: Node & Connecting Line */}
              <View style={styles.nodeColumn}>
                <View
                  style={[
                    styles.nodeCircle,
                    isCompleted && styles.nodeCompleted,
                    isCurrent && styles.nodeCurrent,
                    isUpcoming && styles.nodeUpcoming,
                  ]}
                >
                  {isCompleted ? (
                    <Text style={styles.nodeCheckText}>✓</Text>
                  ) : isCurrent ? (
                    <View style={styles.nodePulseInner} />
                  ) : (
                    <View style={styles.nodeUpcomingInner} />
                  )}
                </View>

                {!isLast && (
                  <View
                    style={[
                      styles.connectorLine,
                      isCompleted ? styles.connectorCompleted : styles.connectorUpcoming,
                    ]}
                  />
                )}
              </View>

              {/* Right Column: Step Info */}
              <View style={[styles.infoColumn, isLast && styles.infoColumnLast]}>
                <View style={styles.titleRow}>
                  <Text
                    style={[
                      styles.stepTitle,
                      isCurrent && styles.stepTitleCurrent,
                      isCompleted && styles.stepTitleCompleted,
                      isUpcoming && styles.stepTitleUpcoming,
                    ]}
                  >
                    {step.title}
                  </Text>
                  {stepTime && (
                    <Text style={[styles.stepTime, isCurrent && styles.stepTimeCurrent]}>
                      {stepTime}
                    </Text>
                  )}
                </View>

                <Text
                  style={[
                    styles.stepSubtitle,
                    isCurrent && styles.stepSubtitleCurrent,
                    isUpcoming && styles.stepSubtitleUpcoming,
                  ]}
                >
                  {step.subtitle}
                </Text>

                {historyEntry?.note ? (
                  <View style={styles.noteBox}>
                    <Text style={styles.noteText}>{historyEntry.note}</Text>
                  </View>
                ) : null}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    marginVertical: 12,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  timelineHeading: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.primaryText,
  },
  currentStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  currentStatusBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  cancellationBanner: {
    flexDirection: 'row',
    backgroundColor: colors.grey100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 14,
    marginBottom: 16,
    alignItems: 'flex-start',
  },
  cancellationIconBox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  cancellationIconText: {
    fontSize: 14,
    color: colors.white,
    fontWeight: '800',
  },
  cancellationTextBox: {
    flex: 1,
  },
  cancellationTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  cancellationTime: {
    fontSize: 12,
    color: colors.secondaryText,
    marginBottom: 4,
  },
  cancellationReason: {
    fontSize: 12,
    color: colors.secondaryText,
    fontStyle: 'italic',
  },
  stepsList: {
    paddingLeft: 4,
  },
  stepRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 28,
  },
  nodeCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  nodeCompleted: {
    backgroundColor: colors.black,
  },
  nodeCurrent: {
    backgroundColor: colors.black,
    borderWidth: 3,
    borderColor: colors.grey300,
  },
  nodeUpcoming: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nodeCheckText: {
    color: colors.white,
    fontSize: 12,
    fontWeight: '800',
  },
  nodePulseInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.white,
  },
  nodeUpcomingInner: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.grey400,
  },
  connectorLine: {
    width: 2,
    flex: 1,
    minHeight: 38,
    marginVertical: 2,
  },
  connectorCompleted: {
    backgroundColor: colors.black,
  },
  connectorUpcoming: {
    backgroundColor: colors.border,
  },
  infoColumn: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 20,
  },
  infoColumnLast: {
    paddingBottom: 4,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  stepTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primaryText,
  },
  stepTitleCompleted: {
    color: colors.primaryText,
    fontWeight: '700',
  },
  stepTitleCurrent: {
    color: colors.black,
    fontWeight: '800',
  },
  stepTitleUpcoming: {
    color: colors.grey400,
  },
  stepTime: {
    fontSize: 11,
    color: colors.grey400,
    fontWeight: '500',
  },
  stepTimeCurrent: {
    color: colors.black,
    fontWeight: '700',
  },
  stepSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  stepSubtitleCurrent: {
    color: colors.primaryText,
    fontWeight: '500',
  },
  stepSubtitleUpcoming: {
    color: colors.grey400,
  },
  noteBox: {
    marginTop: 6,
    backgroundColor: colors.grey50,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderLeftWidth: 3,
    borderLeftColor: colors.black,
  },
  noteText: {
    fontSize: 11,
    color: colors.secondaryText,
  },
});
