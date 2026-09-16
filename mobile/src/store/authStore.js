import { create } from 'zustand';
import apiClient, { setUnauthorizedHandler } from '../api/client';
import { storage } from '../utils/storage';
import { useCartStore } from './cartStore';

export const useAuthStore = create((set, get) => {
  // Bind global 401 unauthorized handler to clear Zustand auth state
  setUnauthorizedHandler(() => {
    set({ user: null, token: null, isSubmitting: false });
  });

  return {
    user: null,
    token: null,
    isLoading: true, // True while verifying stored session on app startup
    isSubmitting: false,
    error: null,

    /**
     * Restores existing session from SecureStore on app launch
     */
    restoreSession: async () => {
      set({ isLoading: true, error: null });

      try {
        const storedToken = await storage.getToken();

        if (!storedToken) {
          set({ user: null, token: null, isLoading: false });
          return;
        }

        // Verify token with backend GET /api/auth/me
        const response = await apiClient.get('/auth/me');

        if (response.data?.success && response.data?.data?.user) {
          set({
            user: response.data.data.user,
            token: storedToken,
            isLoading: false,
            error: null,
          });
        } else {
          await storage.removeToken();
          set({ user: null, token: null, isLoading: false });
        }
      } catch (error) {
        console.warn('Session restoration failed:', error.message);
        await storage.removeToken();
        set({ user: null, token: null, isLoading: false });
      }
    },

    /**
     * Refreshes user profile from backend
     */
    refreshUser: async () => {
      try {
        const response = await apiClient.get('/auth/me');
        if (response.data?.success && response.data?.data?.user) {
          set({ user: response.data.data.user });
          return { success: true, user: response.data.data.user };
        }
        return { success: false };
      } catch (error) {
        console.warn('User refresh failed:', error.message);
        return { success: false, error: error.message };
      }
    },

    /**
     * Authenticates with email and password
     */
    login: async (email, password) => {
      set({ isSubmitting: true, error: null });

      try {
        const response = await apiClient.post('/auth/login', {
          email: email.trim().toLowerCase(),
          password,
        });

        const { user, token } = response.data.data;

        // Persist token in SecureStore
        await storage.setToken(token);

        set({
          user,
          token,
          isSubmitting: false,
          error: null,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error.message || 'Login failed. Please check your credentials.';
        set({ isSubmitting: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    /**
     * Registers a new customer account
     */
    register: async ({ name, email, phone, password }) => {
      set({ isSubmitting: true, error: null });

      try {
        const response = await apiClient.post('/auth/register', {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone ? phone.trim() : '',
          password,
          role: 'CUSTOMER',
        });

        const { user, token } = response.data.data;

        // Persist token in SecureStore
        await storage.setToken(token);

        set({
          user,
          token,
          isSubmitting: false,
          error: null,
        });

        return { success: true };
      } catch (error) {
        const errorMessage = error.message || 'Registration failed. Please try again.';
        set({ isSubmitting: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    /**
     * Updates customer profile (name, phone) and refreshes user state
     */
    updateProfile: async ({ name, phone }) => {
      set({ isSubmitting: true, error: null });

      try {
        const response = await apiClient.put('/auth/profile', {
          name: name.trim(),
          phone: phone ? phone.trim() : '',
        });

        const updatedUser = response.data?.data?.user;
        if (updatedUser) {
          set({
            user: updatedUser,
            isSubmitting: false,
            error: null,
          });
          return { success: true, user: updatedUser };
        }

        set({ isSubmitting: false });
        return { success: true };
      } catch (error) {
        const errorMessage = error.message || 'Failed to update profile. Please try again.';
        set({ isSubmitting: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    /**
     * Changes customer password after verifying current password
     */
    changePassword: async ({ currentPassword, newPassword }) => {
      set({ isSubmitting: true, error: null });

      try {
        const response = await apiClient.put('/auth/change-password', {
          currentPassword,
          newPassword,
        });

        set({ isSubmitting: false, error: null });
        return {
          success: true,
          message: response.data?.message || 'Password changed successfully.',
        };
      } catch (error) {
        const errorMessage = error.message || 'Failed to change password. Please check your inputs.';
        set({ isSubmitting: false, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    },

    /**
     * Clears session, removes token from SecureStore, and clears cached cart
     */
    logout: async () => {
      try {
        await storage.removeToken();
        useCartStore.getState().clearCart();
      } catch (err) {
        console.warn('Error during logout cleanup:', err.message);
      } finally {
        set({
          user: null,
          token: null,
          error: null,
        });
      }
    },

    /**
     * Clears error message
     */
    clearError: () => set({ error: null }),
  };
});

