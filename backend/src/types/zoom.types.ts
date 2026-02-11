// Zoom API Types

export interface ZoomAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope: string;
}

export interface ZoomUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  type: number;
  role_name?: string;
  pmi?: number;
  use_pmi?: boolean;
  personal_meeting_url?: string;
  timezone?: string;
  verified?: number;
  dept?: string;
  created_at?: string;
  last_login_time?: string;
  pic_url?: string;
  host_key?: string;
  language?: string;
  phone_number?: string;
  status?: string;
}

export interface ZoomUserListResponse {
  page_count: number;
  page_number: number;
  page_size: number;
  total_records: number;
  users: ZoomUser[];
}

export interface PasswordChangeRequest {
  userEmail: string;
  newPassword?: string; // Optional, will generate if not provided
}

export interface PasswordChangeResponse {
  success: boolean;
  email: string;
  newPassword?: string;
  message: string;
}
