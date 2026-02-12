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

  async changePassword(userEmail: string, newPassword?: string): Promise<{
    success: boolean;
    email: string;
    newPassword: string;
    message: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/zoom/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userEmail,
        ...(newPassword && { newPassword }),
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to change password');
    }
    return response.json();
  },

  async generatePassword(length: number = 12): Promise<{
    success: boolean;
    password: string;
  }> {
    const response = await fetch(`${API_BASE_URL}/zoom/generate-password?length=${length}`);
    if (!response.ok) {
      throw new Error('Failed to generate password');
    }
    return response.json();
  },
};
