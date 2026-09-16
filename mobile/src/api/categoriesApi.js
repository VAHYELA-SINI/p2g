import apiClient from './client';

/**
 * Fetches all categories from the backend
 * Supports optional isActive filtering and search query
 */
export async function fetchCategories(params = {}) {
  const queryParams = {
    isActive: params.isActive !== undefined ? params.isActive : true,
    ...(params.search && { search: params.search }),
    ...(params.sort && { sort: params.sort }),
  };

  const response = await apiClient.get('/categories', { params: queryParams });
  return response.data?.data?.categories || [];
}

/**
 * Fetches a single category by ID or slug
 */
export async function fetchCategoryById(idOrSlug) {
  const response = await apiClient.get(`/categories/${idOrSlug}`);
  return response.data?.data?.category || null;
}
