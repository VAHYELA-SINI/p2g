import apiClient from './client';

/**
 * Fetches paginated, filtered, and searched products from the backend
 */
export async function fetchProducts(params = {}) {
  const queryParams = {
    page: params.page || 1,
    limit: params.limit || 20,
    isAvailable: params.isAvailable !== undefined ? params.isAvailable : true,
    ...(params.category && { category: params.category }),
    ...(params.search && { search: params.search }),
    ...(params.minPrice !== undefined && { minPrice: params.minPrice }),
    ...(params.maxPrice !== undefined && { maxPrice: params.maxPrice }),
    ...(params.sort && { sort: params.sort }),
  };

  const response = await apiClient.get('/products', { params: queryParams });
  return {
    products: response.data?.data?.products || [],
    pagination: response.data?.data?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
  };
}

/**
 * Fetches single product details by MongoDB ID or slug
 */
export async function fetchProductById(idOrSlug) {
  const response = await apiClient.get(`/products/${idOrSlug}`);
  return response.data?.data?.product || null;
}
