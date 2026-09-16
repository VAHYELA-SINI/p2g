import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { safeBack } from '../../src/utils/navigation';
import { colors, shadows } from '../../src/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile, isSubmitting } = useAuthStore();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errorMsg, setErrorMsg] = useState(null);

  const handleSave = async () => {
    setErrorMsg(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMsg('Full name is required.');
      return;
    }

    if (trimmedName.length < 2) {
      setErrorMsg('Name must be at least 2 characters long.');
      return;
    }

    if (trimmedName.length > 100) {
      setErrorMsg('Name cannot exceed 100 characters.');
      return;
    }

    const result = await updateProfile({
      name: trimmedName,
      phone: phone.trim(),
    });

    if (result.success) {
      Alert.alert(
        'Profile Updated',
        'Your profile details have been successfully updated.',
        [
          {
            text: 'OK',
            onPress: () => safeBack(router, '/(app)/profile'),
          },
        ]
      );
    } else {
      setErrorMsg(result.error || 'Failed to update profile. Please try again.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* Header Bar */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => safeBack(router, '/(app)/profile')}
            activeOpacity={0.75}
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Card */}
          <View style={styles.infoBanner}>
            <Text style={styles.infoBannerTitle}>Personal Information</Text>
            <Text style={styles.infoBannerSubtitle}>
              Keep your contact details up to date to ensure seamless deliveries and order notifications.
            </Text>
          </View>

          {/* Error Banner */}
          {errorMsg ? (
            <View style={styles.errorCard}>
              <Text style={styles.errorText}>⚠️ {errorMsg}</Text>
            </View>
          ) : null}

          {/* Form Card */}
          <View style={styles.card}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={(text) => {
                  setName(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Enter your full name"
                placeholderTextColor={colors.grey400}
                autoCapitalize="words"
              />
            </View>

            {/* Email (Read-Only) */}
            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <Text style={styles.label}>Email Address</Text>
                <Text style={styles.readOnlyBadge}>Permanent</Text>
              </View>
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                value={user?.email || ''}
                editable={false}
                placeholderTextColor={colors.grey400}
              />
              <Text style={styles.fieldHint}>
                Email address is permanently associated with your authentication account.
              </Text>
            </View>

            {/* Phone Number */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={(text) => {
                  setPhone(text);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="e.g. +234 800 123 4567"
                placeholderTextColor={colors.grey400}
                keyboardType="phone-pad"
              />
              <Text style={styles.fieldHint}>
                Used for delivery driver updates and SMS receipts.
              </Text>
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveBtn, isSubmitting && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={isSubmitting}
            activeOpacity={0.85}
          >
            {isSubmitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.saveBtnText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.canvas,
  },
  keyboardContainer: {
    flex: 1,
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
  infoBanner: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primaryText,
    marginBottom: 4,
  },
  infoBannerSubtitle: {
    fontSize: 13,
    color: colors.secondaryText,
    lineHeight: 18,
  },
  errorCard: {
    backgroundColor: colors.grey100,
    borderWidth: 1,
    borderColor: colors.grey400,
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: colors.primaryText,
    fontWeight: '600',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primaryText,
    marginBottom: 6,
  },
  readOnlyBadge: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryText,
    backgroundColor: colors.grey100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
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
  inputDisabled: {
    backgroundColor: colors.grey50,
    color: colors.secondaryText,
  },
  fieldHint: {
    fontSize: 11,
    color: colors.grey400,
    marginTop: 4,
  },
  saveBtn: {
    backgroundColor: colors.black,
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    ...shadows.sm,
  },
  saveBtnDisabled: {
    opacity: 0.7,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.white,
  },
});
