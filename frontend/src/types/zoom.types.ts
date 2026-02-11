export interface ZoomUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  type: number;
  status?: string;
  dept?: string;
  created_at?: string;
}

export interface ZoomUsersResponse {
  success: boolean;
  count: number;
  users: ZoomUser[];
}

export interface ApiError {
  success: false;
  error: string;
}
