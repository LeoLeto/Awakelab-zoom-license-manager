import { ZoomUsersResponse } from '../types/zoom.types';
import { 
  License, 
  Assignment, 
  LicenseWithAssignment, 
  CreateLicenseDto, 
  CreateAssignmentDto 
} from '../types/license.types';

const API_BASE_URL = '/api';

// Helper function for API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || error.message || 'Request failed');
  }
  return response.json();
}

export const zoomApi = {
  async getUsers(): Promise<ZoomUsersResponse> {
    return apiCall(`${API_BASE_URL}/zoom/users`);
  },

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return apiCall(`${API_BASE_URL}/zoom/test`);
  },

  async changePassword(userEmail: string, newPassword?: string): Promise<{
    success: boolean;
    email: string;
    newPassword: string;
    message: string;
  }> {
    return apiCall(`${API_BASE_URL}/zoom/change-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail, ...(newPassword && { newPassword }) }),
    });
  },

  async generatePassword(length: number = 12): Promise<{
    success: boolean;
    password: string;
  }> {
    return apiCall(`${API_BASE_URL}/zoom/generate-password?length=${length}`);
  },
};

export const licenseApi = {
  async getAllLicenses(): Promise<{ success: boolean; licenses: LicenseWithAssignment[] }> {
    return apiCall(`${API_BASE_URL}/licenses`);
  },

  async getLicenseById(id: string): Promise<{ success: boolean; license: LicenseWithAssignment }> {
    return apiCall(`${API_BASE_URL}/licenses/${id}`);
  },

  async getAvailableLicenses(startDate: string, endDate: string): Promise<{ 
    success: boolean; 
    availableLicenses: License[] 
  }> {
    return apiCall(
      `${API_BASE_URL}/licenses/available?startDate=${startDate}&endDate=${endDate}`
    );
  },

  async createLicense(data: CreateLicenseDto): Promise<{ success: boolean; license: License }> {
    return apiCall(`${API_BASE_URL}/licenses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async updateLicense(id: string, data: Partial<CreateLicenseDto>): Promise<{ 
    success: boolean; 
    license: License 
  }> {
    return apiCall(`${API_BASE_URL}/licenses/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async deleteLicense(id: string): Promise<{ success: boolean; message: string }> {
    return apiCall(`${API_BASE_URL}/licenses/${id}`, {
      method: 'DELETE',
    });
  },
};

export const assignmentApi = {
  async getAllAssignments(): Promise<{ success: boolean; assignments: Assignment[] }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments/all`);
  },

  async getActiveAssignments(): Promise<{ success: boolean; assignments: Assignment[] }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments/active`);
  },

  async createAssignment(data: CreateAssignmentDto): Promise<{ 
    success: boolean; 
    assignment: Assignment 
  }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  async cancelAssignment(id: string): Promise<{ success: boolean; message: string }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments/${id}/cancel`, {
      method: 'POST',
    });
  },
};
