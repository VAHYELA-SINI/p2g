import apiClient from './client';

/**
 * Initializes a Paystack transaction for an existing order
 */
export async function initializePayment(orderId) {
  const response = await apiClient.post(`/payments/initialize/${orderId}`);
  return response.data?.data || null;
}

/**
 * Verifies a Paystack payment reference authoritatively with the backend
 */
export async function verifyPayment(reference) {
  const response = await apiClient.get(`/payments/verify/${reference}`);
  return response.data?.data?.order || null;
}
