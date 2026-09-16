import apiClient from './client';

export async function getOrders(params = {}) {
  const response = await apiClient.get('/orders', { params });
  return {
    orders: response.data?.data?.orders || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}

export async function getOrderById(id) {
  const response = await apiClient.get(`/orders/${id}`);
  return response.data?.data?.order || null;
}

export async function updateOrderStatus(id, { status, note = '' }) {
  const response = await apiClient.patch(`/orders/${id}/status`, { status, note });
  return response.data?.data?.order || null;
}

export async function cancelOrder(id, reason = '') {
  const response = await apiClient.post(`/orders/${id}/cancel`, { reason });
  return response.data?.data?.order || null;
}

export async function getOrderStats() {
  const response = await apiClient.get('/orders/stats');
  return response.data?.data || null;
}
