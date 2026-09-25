import { Linking, Platform } from 'react-native';

/**
 * Robustly opens the Paystack authorization checkout URL across Web, Android, and iOS.
 * 
 * Note: Avoids Linking.canOpenURL() because on Android 11+ (API level 30+) and Expo Web,
 * canOpenURL returns false for HTTPS URLs unless specific package query filters are declared,
 * which previously caused the Paystack browser page to never open silently.
 *
 * @param {string} authorizationUrl - The Paystack checkout URL from initialization
 * @returns {Promise<boolean>}
 */
export async function openPaystackCheckout(authorizationUrl) {
  if (!authorizationUrl || typeof authorizationUrl !== 'string') {
    throw new Error('Invalid or missing payment authorization URL.');
  }

  // Web platform fallback (handles popup blocker gracefully)
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') {
      const popup = window.open(authorizationUrl, '_blank');
      if (!popup || popup.closed || typeof popup.closed === 'undefined') {
        window.location.href = authorizationUrl;
      }
      return true;
    }
  }

  // Native Android and iOS
  try {
    await Linking.openURL(authorizationUrl);
    return true;
  } catch (error) {
    console.error('[Payment Link Error]:', error);
    throw new Error(
      'Could not open payment checkout. Please make sure a web browser is installed on your device.'
    );
  }
}
