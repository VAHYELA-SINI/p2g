import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, refreshUser, logout } = useAuthStore();
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshUser();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Confirm Logout',
      'Are you sure you want to log out of your P2G account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const memberSince = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString('en-US', {
        month: 'short',
        year: 'numeric',
      })
    : 'Recent';

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => safeBack(router, '/(app)')}
          activeOpacity={0.75}
        >
          <Text style={styles.backBtnText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Profile</Text>
        <View style={styles.headerRightSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.black]} />
        }
      >
        {/* Avatar & Hero Section */}
        <View style={styles.heroCard}>
          <View style={styles.avatarContainer}>
            <Text style={styles.avatarText}>{getInitials(user?.name)}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'Customer'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'No email provided'}</Text>

          <View style={styles.badgeRow}>
            <View style={styles.roleBadge}>
              <Text style={styles.roleBadgeText}>
                {user?.role === 'ADMIN' ? '🛡️ Administrator' : '🛍️ Verified Customer'}
              </Text>
            </View>
            <View style={styles.memberBadge}>
              <Text style={styles.memberBadgeText}>Member since {memberSince}</Text>
            </View>
          </View>
        </View>

        {/* Account Details Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
          <View style={styles.card}>
            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>👤</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Full Name</Text>
                <Text style={styles.detailValue}>{user?.name || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>✉️</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Email Address</Text>
                <Text style={styles.detailValue}>{user?.email || 'Not set'}</Text>
              </View>
            </View>

            <View style={styles.divider} />

            <View style={styles.detailRow}>
              <View style={styles.detailIconBox}>
                <Text style={styles.detailIcon}>📞</Text>
              </View>
              <View style={styles.detailContent}>
                <Text style={styles.detailLabel}>Phone Number</Text>
                <Text style={styles.detailValue}>
                  {user?.phone && user.phone.trim() !== '' ? user.phone : 'Not provided'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions & Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT SETTINGS</Text>
          <View style={styles.card}>
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/edit-profile')}
              activeOpacity={0.75}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIcon}>✏️</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>Edit Profile</Text>
                  <Text style={styles.actionSubtitle}>Update your full name and phone number</Text>
                </View>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/change-password')}
              activeOpacity={0.75}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIcon}>🔒</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>Change Password</Text>
                  <Text style={styles.actionSubtitle}>Keep your account secure with a new password</Text>
                </View>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => router.push('/(app)/orders')}
              activeOpacity={0.75}
            >
              <View style={styles.actionLeft}>
                <View style={styles.actionIconBox}>
                  <Text style={styles.actionIcon}>📦</Text>
                </View>
                <View>
                  <Text style={styles.actionTitle}>My Orders</Text>
                  <Text style={styles.actionSubtitle}>Track delivery progress and order history</Text>
                </View>
              </View>
              <Text style={styles.actionChevron}>›</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Session Management */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.logoutBtn}
            onPress={handleLogout}
            activeOpacity={0.85}
          >
            <Text style={styles.logoutIcon}>🚪</Text>
            <Text style={styles.logoutBtnText}>Log Out of P2G</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.versionFooter}>P2G Grocery App v1.0.0 • Customer Portal</Text>
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
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
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
  backBtnText: {
    fontSize: 20,
    color: colors.primaryText,
    fontWeight: '700',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryText,
  },
  headerRightSpacer: {
    width: 40,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.black,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
    ...shadows.sm,
  },
  avatarText: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.white,
    letterSpacing: 1,
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primaryText,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.secondaryText,
    marginBottom: 12,
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
  },
  roleBadge: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primaryText,
  },
  memberBadge: {
    backgroundColor: colors.grey100,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  memberBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryText,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.grey500,
    letterSpacing: 0.8,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  detailIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.grey100,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  detailIcon: {
    fontSize: 18,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: colors.secondaryText,
    fontWeight: '500',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    color: colors.primaryText,
    fontWeight: '600',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  actionIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionIcon: {
    fontSize: 18,
  },
  actionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 2,
  },
  actionSubtitle: {
    fontSize: 12,
    color: colors.secondaryText,
  },
  actionChevron: {
    fontSize: 22,
    color: colors.grey400,
    fontWeight: '600',
    marginLeft: 8,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.grey100,
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
  },
  versionFooter: {
    textAlign: 'center',
    fontSize: 12,
    color: colors.grey400,
    marginTop: 8,
  },
});
