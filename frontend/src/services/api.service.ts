import { ZoomUsersResponse } from '../types/zoom.types';
import { 
  License, 
  Assignment, 
  LicenseWithAssignment, 
  CreateLicenseDto, 
  CreateAssignmentDto 
} from '../types/license.types';
import { HistoryEntry, HistoryFilters } from '../types/history.types';

const API_BASE_URL = '/api';

// Helper function to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = localStorage.getItem('authToken');
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return headers;
}

// Helper function for API calls
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  const headers = {
    ...getAuthHeaders(),
    ...(options?.headers || {}),
  };

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Solicitud fallida' }));
    throw new Error(error.error || error.message || 'Solicitud fallida');
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

  async getPendingAssignments(): Promise<{ success: boolean; assignments: Assignment[] }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments/pending`);
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

  async updateAssignment(id: string, data: Partial<CreateAssignmentDto>): Promise<{ 
    success: boolean; 
    assignment: Assignment 
  }> {
    return apiCall(`${API_BASE_URL}/licenses/assignments/${id}`, {
      method: 'PUT',
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

export const historyApi = {
  async getRecentHistory(filters?: HistoryFilters): Promise<HistoryEntry[]> {
    const params = new URLSearchParams();
    
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.entityType) params.append('entityType', filters.entityType);
    if (filters?.action) params.append('action', filters.action);
    if (filters?.actor) params.append('actor', filters.actor);
    if (filters?.startDate) params.append('startDate', filters.startDate.toISOString());
    if (filters?.endDate) params.append('endDate', filters.endDate.toISOString());
    
    const queryString = params.toString();
    return apiCall(`${API_BASE_URL}/history/recent${queryString ? `?${queryString}` : ''}`);
  },

  async getLicenseHistory(licenseId: string, limit: number = 50, full: boolean = true): Promise<HistoryEntry[]> {
    return apiCall(`${API_BASE_URL}/history/license/${licenseId}?limit=${limit}&full=${full}`);
  },

  async getAssignmentHistory(assignmentId: string, limit: number = 50): Promise<HistoryEntry[]> {
    return apiCall(`${API_BASE_URL}/history/assignment/${assignmentId}?limit=${limit}`);
  },
};

export const analyticsApi = {
  async getAnalyticsOverview(): Promise<any> {
    return apiCall(`${API_BASE_URL}/analytics/overview`);
  },

  async getAnalyticsLicenses(limit: number = 10): Promise<any> {
    return apiCall(`${API_BASE_URL}/analytics/licenses?limit=${limit}`);
  },

  async getAnalyticsTeachers(limit: number = 10): Promise<any> {
    return apiCall(`${API_BASE_URL}/analytics/teachers?limit=${limit}`);
  },

  async getAnalyticsTrends(days: number = 30): Promise<any> {
    return apiCall(`${API_BASE_URL}/analytics/trends?days=${days}`);
  },
};

const apiService = {
  ...zoomApi,
  ...licenseApi,
  ...historyApi,
  ...analyticsApi,
};

export default apiService;
