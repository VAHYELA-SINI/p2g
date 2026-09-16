import { useEffect } from 'react';
import { BackHandler } from 'react-native';

/**
 * Safe back navigation helper.
 * If canGoBack() is false (e.g. entry from deep link or push notification),
 * redirects safely to the fallback route instead of getting stuck or crashing.
 */
export function safeBack(router, fallbackRoute = '/(app)') {
  if (router && typeof router.canGoBack === 'function' && router.canGoBack()) {
    router.back();
  } else if (router && typeof router.replace === 'function') {
    router.replace(fallbackRoute);
  }
}

/**
 * React hook to register custom Android hardware back button handler.
 * Returns cleanup function.
 */
export function useAndroidBackHandler(onBackPress) {
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (typeof onBackPress === 'function') {
        return onBackPress();
      }
      return false;
    });

    return () => subscription.remove();
  }, [onBackPress]);
}
