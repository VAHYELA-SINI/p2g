import apiClient from './client';

export async function login({ email, password }) {
  const response = await apiClient.post('/auth/login', { email, password });
  return response.data?.data || null;
}

export async function getMe() {
  const response = await apiClient.get('/auth/me');
  return response.data?.data?.user || null;
}

export async function updateProfile(data) {
  const response = await apiClient.put('/auth/profile', data);
  return response.data?.data?.user || null;
}

export async function changePassword({ currentPassword, newPassword }) {
  const response = await apiClient.put('/auth/change-password', {
    currentPassword,
    newPassword,
  });
  return response.data || null;
}
