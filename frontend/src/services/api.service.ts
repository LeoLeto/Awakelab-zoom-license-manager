import { ZoomUsersResponse } from '../types/zoom.types';

const API_BASE_URL = '/api';

export const zoomApi = {
  async getUsers(): Promise<ZoomUsersResponse> {
    const response = await fetch(`${API_BASE_URL}/zoom/users`);
    if (!response.ok) {
      throw new Error('Failed to fetch users');
    }
    return response.json();
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/zoom/test`);
    if (!response.ok) {
      throw new Error('Failed to test connection');
    }
    return response.json();
  },
};
