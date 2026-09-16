import apiClient from './client';

export async function getProducts(params = {}) {
  const response = await apiClient.get('/products', { params });
  return {
    products: response.data?.data?.products || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}

export async function getProductById(id) {
  const response = await apiClient.get(`/products/${id}`);
  return response.data?.data?.product || null;
}

export async function createProduct(productData) {
  const response = await apiClient.post('/products', productData);
  return response.data?.data?.product || null;
}

export async function updateProduct(id, productData) {
  const response = await apiClient.put(`/products/${id}`, productData);
  return response.data?.data?.product || null;
}

export async function deleteProduct(id) {
  const response = await apiClient.delete(`/products/${id}`);
  return response.data || null;
}

export async function uploadImage(file) {
  const formData = new FormData();
  formData.append('image', file);

  const response = await apiClient.post('/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });

  return response.data?.data || null;
}
