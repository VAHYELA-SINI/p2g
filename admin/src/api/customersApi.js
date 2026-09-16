import apiClient from './client';

export async function getCustomers(params = {}) {
  const response = await apiClient.get('/customers', { params });
  return {
    customers: response.data?.data?.customers || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}

export async function getCustomerById(id) {
  const response = await apiClient.get(`/customers/${id}`);
  return response.data?.data || null;
}
