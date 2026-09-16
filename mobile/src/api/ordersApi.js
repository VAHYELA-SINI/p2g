import apiClient from './client';

/**
 * Creates a new order on the backend
 * Server calculates all line prices, subtotals, delivery fees, and totals authoritatively
 */
export async function createOrder({ items, deliveryInformation }) {
  const payload = {
    items: items.map((i) => ({
      product: i.product?._id || i.product?.id || i.product,
      quantity: i.quantity,
    })),
    deliveryInformation: {
      fullName: deliveryInformation.fullName?.trim(),
      phone: deliveryInformation.phone?.trim(),
      address: deliveryInformation.address?.trim(),
      city: deliveryInformation.city?.trim(),
      additionalInstructions: deliveryInformation.additionalInstructions?.trim() || '',
    },
  };

  const response = await apiClient.post('/orders', payload);
  return response.data?.data?.order || null;
}

/**
 * Fetches order history for the authenticated customer
 */
export async function fetchOrders(params = {}) {
  const response = await apiClient.get('/orders', { params });
  return {
    orders: response.data?.data?.orders || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}

/**
 * Fetches a single order by ID
 */
export async function fetchOrderById(id) {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data?.data?.order || null;
}

/**
 * Cancels a pending order
 */
export async function cancelOrder(id, reason = '') {
  const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
  return response.data?.data?.order || null;
}
