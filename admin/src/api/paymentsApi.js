import apiClient from './client';

export async function getPayments(params = {}) {
  const response = await apiClient.get('/payments', { params });
  return {
    payments: response.data?.data?.payments || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}
