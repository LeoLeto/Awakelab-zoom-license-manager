import axios from 'axios';
import { ZoomAuthResponse, ZoomUser, ZoomUserListResponse } from '../types/zoom.types';

/**
 * ZoomService handles all interactions with the Zoom API
 * Focus: Password management and user administration
 */
class ZoomService {
  private accountId: string = '';
  private clientId: string = '';
  private clientSecret: string = '';
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private credentialsChecked: boolean = false;

  constructor() {
    // Don't check credentials in constructor - they may not be loaded yet
  }

  /**
   * Initialize credentials from environment variables
   * Called lazily on first API call
   */
  private initializeCredentials(): void {
    if (this.credentialsChecked) return;

    this.accountId = process.env.ZOOM_ACCOUNT_ID || '';
    this.clientId = process.env.ZOOM_CLIENT_ID || '';
    this.clientSecret = process.env.ZOOM_CLIENT_SECRET || '';
    this.credentialsChecked = true;

    if (!this.accountId || !this.clientId || !this.clientSecret) {
      console.warn('⚠️  Zoom API credentials not configured. Please set environment variables.');
    }
  }

  /**
   * Get OAuth access token using Server-to-Server OAuth
   * https://developers.zoom.us/docs/internal-apps/s2s-oauth/
   */
  private async getAccessToken(): Promise<string> {
    // Initialize credentials if not done yet
    this.initializeCredentials();

    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
      
      const response = await axios.post<ZoomAuthResponse>(
        `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${this.accountId}`,
        {},
        {
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          }
        }
      );

      this.accessToken = response.data.access_token;
      // Set expiry 5 minutes before actual expiration for safety
      this.tokenExpiry = Date.now() + ((response.data.expires_in - 300) * 1000);
      
      return this.accessToken;
    } catch (error: any) {
      console.error('Failed to get Zoom access token:', error.response?.data || error.message);
      throw new Error('Failed to authenticate with Zoom API');
    }
  }

  /**
   * Get all users in the Zoom account
   */
  async getAllUsers(): Promise<ZoomUser[]> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get<ZoomUserListResponse>(
        'https://api.zoom.us/v2/users',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          params: {
            status: 'active',
            page_size: 300
          }
        }
      );

      return response.data.users;
    } catch (error: any) {
      console.error('Failed to get Zoom users:', error.response?.data || error.message);
      throw new Error('Failed to retrieve Zoom users');
    }
  }

  /**
   * Get specific user by email or user ID
   */
  async getUser(userIdOrEmail: string): Promise<ZoomUser> {
    const token = await this.getAccessToken();
    
    try {
      const response = await axios.get<ZoomUser>(
        `https://api.zoom.us/v2/users/${encodeURIComponent(userIdOrEmail)}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error: any) {
      console.error('Failed to get Zoom user:', error.response?.data || error.message);
      throw new Error(`Failed to retrieve user: ${userIdOrEmail}`);
    }
  }

  /**
   * 🔑 CRITICAL FEATURE: Change Zoom user password
   * This is the most important feature for managing license handoffs
   * 
   * @param userIdOrEmail - Zoom user ID or email
   * @param newPassword - New password (must meet Zoom requirements)
   * @returns Success status
   */
  async changeUserPassword(userIdOrEmail: string, newPassword: string): Promise<boolean> {
    const token = await this.getAccessToken();
    
    // Validate password meets Zoom requirements
    if (!this.validatePassword(newPassword)) {
      throw new Error('Password does not meet Zoom requirements (min 8 chars, mix of letters and numbers)');
    }

    try {
      await axios.patch(
        `https://api.zoom.us/v2/users/${encodeURIComponent(userIdOrEmail)}/password`,
        {
          password: newPassword
        },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log(`✅ Successfully changed password for user: ${userIdOrEmail}`);
      return true;
    } catch (error: any) {
      console.error('Failed to change Zoom password:', error.response?.data || error.message);
      throw new Error(`Failed to change password for user: ${userIdOrEmail}`);
    }
  }

  /**
   * Generate a secure random password that meets Zoom requirements
   */
  generateSecurePassword(length: number = 12): string {
    const lowercase = 'abcdefghijklmnopqrstuvwxyz';
    const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    const special = '!@#$%^&*';
    const allChars = lowercase + uppercase + numbers + special;

    let password = '';
    
    // Ensure at least one of each required type
    password += lowercase[Math.floor(Math.random() * lowercase.length)];
    password += uppercase[Math.floor(Math.random() * uppercase.length)];
    password += numbers[Math.floor(Math.random() * numbers.length)];
    password += special[Math.floor(Math.random() * special.length)];

    // Fill the rest randomly
    for (let i = password.length; i < length; i++) {
      password += allChars[Math.floor(Math.random() * allChars.length)];
    }

    // Shuffle the password
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  /**
   * Validate password meets Zoom requirements
   */
  private validatePassword(password: string): boolean {
    // Zoom password requirements:
    // - At least 8 characters
    // - Contains letters and numbers
    // - Can contain special characters
    
    const minLength = password.length >= 8;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /[0-9]/.test(password);

    return minLength && hasLetter && hasNumber;
  }

  /**
   * Bulk password change for multiple users
   * Useful for end-of-period resets
   */
  async bulkChangePasswords(userEmails: string[]): Promise<{ 
    success: string[], 
    failed: { email: string, error: string }[] 
  }> {
    const results = {
      success: [] as string[],
      failed: [] as { email: string, error: string }[]
    };

    for (const email of userEmails) {
      try {
        const newPassword = this.generateSecurePassword();
        await this.changeUserPassword(email, newPassword);
        results.success.push(email);
        
        // Add small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error: any) {
        results.failed.push({
          email,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Test connection to Zoom API
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getAccessToken();
      console.log('✅ Zoom API connection successful');
      return true;
    } catch (error) {
      console.error('❌ Zoom API connection failed');
      return false;
    }
  }
}

export default new ZoomService();
