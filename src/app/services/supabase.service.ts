import { Injectable, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

// Visitor access request data structure
export interface VisitorAccessRequest {
  id?: number;
  visitor_name: string;
  visitor_email: string;
  project_name: string;
  project_type: string;
  redirect_url: string;
  otp_code: string;
  is_verified: boolean;
  status_id: number; // 1 = Active, 2 = Inactive
  created_at?: string;
  verified_at?: string;
  expires_at?: string;
}

export interface SessionCheckResult {
  success: boolean;
  hasActiveSession: boolean;
  message: string;
  redirect_url?: string;
  visitor_name?: string;
}

// Contact message data structure
export interface ContactMessage {
  id?: number;
  sender_name: string;
  sender_email: string;
  subject?: string;
  message: string;
  is_read?: boolean;
  is_replied?: boolean;
  created_at?: string;
  local_time?: string;
  read_at?: string;
  replied_at?: string;
}

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  // Backend API URL
  // For local development: http://localhost:3000/api
  // For production: https://mb-port-production.up.railway.app/api
  private readonly API_URL = 'https://mb-port-production.up.railway.app/api';
  
  private isBrowser: boolean;

  constructor(@Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  /**
   * Check if user has an active session (status_id = 1)
   * If active, user can access without OTP
   */
  async checkSession(visitorEmail: string, projectName: string): Promise<SessionCheckResult> {
    if (!this.isBrowser) {
      return { success: false, hasActiveSession: false, message: 'Not in browser' };
    }
    
    try {
      const response = await fetch(`${this.API_URL}/check-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitor_email: visitorEmail,
          project_name: projectName
        })
      });

      return await response.json();
    } catch (error) {
      console.error('Failed to check session:', error);
      return { success: false, hasActiveSession: false, message: 'Session check failed' };
    }
  }

  /**
   * Save visitor access request to database
   */
  async saveAccessRequest(request: Omit<VisitorAccessRequest, 'id' | 'created_at' | 'verified_at' | 'status_id' | 'expires_at'>): Promise<boolean> {
    if (!this.isBrowser) return false;
    
    try {
      // Get local timestamp and timezone
      const now = new Date();
      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      
      // Format local time in readable format: "2026-01-17 00:36:42 IST"
      const localTime = this.formatLocalTime(now, clientTimezone);
      
      const response = await fetch(`${this.API_URL}/access-requests`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitor_name: request.visitor_name,
          visitor_email: request.visitor_email,
          project_name: request.project_name,
          project_type: request.project_type,
          redirect_url: request.redirect_url,
          otp_code: request.otp_code,
          local_time: localTime,
          client_timezone: clientTimezone
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to save access request:', error);
      return false;
    }
  }

  /**
   * Format date to readable local time with timezone abbreviation
   * Output: "2026-01-17 00:36:42 IST"
   */
  private formatLocalTime(date: Date, timezone: string): string {
    // Get timezone abbreviation (IST, PST, EST, etc.)
    const timezoneAbbr = this.getTimezoneAbbreviation(timezone);
    
    // Format: YYYY-MM-DD HH:mm:ss
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} ${timezoneAbbr}`;
  }

  /**
   * Get timezone abbreviation from timezone name
   */
  private getTimezoneAbbreviation(timezone: string): string {
    const abbreviations: { [key: string]: string } = {
      'Asia/Kolkata': 'IST',
      'Asia/Calcutta': 'IST',
      'America/New_York': 'EST',
      'America/Los_Angeles': 'PST',
      'America/Chicago': 'CST',
      'America/Denver': 'MST',
      'Europe/London': 'GMT',
      'Europe/Paris': 'CET',
      'Europe/Berlin': 'CET',
      'Asia/Tokyo': 'JST',
      'Asia/Shanghai': 'CST',
      'Asia/Dubai': 'GST',
      'Australia/Sydney': 'AEST',
      'Pacific/Auckland': 'NZST'
    };
    
    return abbreviations[timezone] || timezone.split('/').pop() || 'LOCAL';
  }

  /**
   * Update access request as verified (sets status_id to 1)
   */
  async markAsVerified(visitorEmail: string, otpCode: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    
    try {
      const response = await fetch(`${this.API_URL}/access-requests/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          visitor_email: visitorEmail,
          otp_code: otpCode
        })
      });

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Failed to update access request:', error);
      return false;
    }
  }

  /**
   * Get all access requests (for admin dashboard)
   */
  async getAllAccessRequests(): Promise<VisitorAccessRequest[]> {
    if (!this.isBrowser) return [];
    
    try {
      const response = await fetch(`${this.API_URL}/access-requests`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Failed to get access requests:', error);
      return [];
    }
  }

  /**
   * Get statistics
   */
  async getStats(): Promise<any> {
    if (!this.isBrowser) return null;
    
    try {
      const response = await fetch(`${this.API_URL}/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  }

  // ============================================
  // CONTACT MESSAGES API METHODS
  // ============================================

  /**
   * Save contact form message to database
   */
  async saveContactMessage(message: Omit<ContactMessage, 'id' | 'created_at' | 'is_read' | 'is_replied' | 'read_at' | 'replied_at'>): Promise<{ success: boolean; message: string; id?: number }> {
    if (!this.isBrowser) {
      return { success: false, message: 'Not in browser' };
    }
    
    try {
      // Get local timestamp and timezone
      const now = new Date();
      const clientTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const localTime = this.formatLocalTime(now, clientTimezone);
      
      const response = await fetch(`${this.API_URL}/contact-messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender_name: message.sender_name,
          sender_email: message.sender_email,
          subject: message.subject || 'No Subject',
          message: message.message,
          local_time: localTime,
          client_timezone: clientTimezone
        })
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Failed to save contact message:', error);
      return { success: false, message: 'Failed to save message' };
    }
  }

  /**
   * Get all contact messages (for admin)
   */
  async getAllContactMessages(): Promise<ContactMessage[]> {
    if (!this.isBrowser) return [];
    
    try {
      const response = await fetch(`${this.API_URL}/contact-messages`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success ? result.data : [];
    } catch (error) {
      console.error('Failed to get contact messages:', error);
      return [];
    }
  }

  /**
   * Get unread messages count
   */
  async getUnreadCount(): Promise<number> {
    if (!this.isBrowser) return 0;
    
    try {
      const response = await fetch(`${this.API_URL}/contact-messages/unread`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success ? result.unread_count : 0;
    } catch (error) {
      console.error('Failed to get unread count:', error);
      return 0;
    }
  }

  /**
   * Get contact message statistics
   */
  async getContactMessageStats(): Promise<any> {
    if (!this.isBrowser) return null;
    
    try {
      const response = await fetch(`${this.API_URL}/contact-messages/stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      return result.success ? result.data : null;
    } catch (error) {
      console.error('Failed to get contact message stats:', error);
      return null;
    }
  }
}
