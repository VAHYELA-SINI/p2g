import apiClient from './client';

export async function getCategories(params = {}) {
  const response = await apiClient.get('/categories', { params });
  return response.data?.data?.categories || [];
}

export async function getCategoryById(id) {
  const response = await apiClient.get(`/categories/${id}`);
  return response.data?.data?.category || null;
}

export async function createCategory(categoryData) {
  const response = await apiClient.post('/categories', categoryData);
  return response.data?.data?.category || null;
}

export async function updateCategory(id, categoryData) {
  const response = await apiClient.put(`/categories/${id}`, categoryData);
  return response.data?.data?.category || null;
}

export async function deleteCategory(id) {
  const response = await apiClient.delete(`/categories/${id}`);
  return response.data || null;
}
