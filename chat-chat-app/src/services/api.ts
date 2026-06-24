import Constants from 'expo-constants';

// Dynamically resolve local development IP for Android/iOS physical devices & simulators
const getApiUrl = () => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  
  // If in web browser, localhost is fine.
  // Otherwise, get the debugger host IP address.
  const debuggerHost = Constants.expoConfig?.hostUri || '';
  const host = debuggerHost.split(':')[0] || 'localhost';
  
  return `http://${host}:5000/api/v1/mobile`;
};

export const API_BASE_URL = getApiUrl();

let onUnauthorizedCallback: (() => void) | null = null;

export const setOnUnauthorized = (callback: () => void) => {
  onUnauthorizedCallback = callback;
};

const g: any = typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : {});
const originalFetch = g.fetch || (typeof fetch !== 'undefined' ? fetch : null);
if (originalFetch) {
  const interceptedFetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const response = await originalFetch(input, init);
    if (response.status === 401) {
      if (onUnauthorizedCallback) {
        onUnauthorizedCallback();
      }
    }
    return response;
  };

  if (g.fetch) {
    g.fetch = interceptedFetch;
  }
}

export interface OtpResponse {
  success: boolean;
  message: string;
  mockOtp?: string;
  data?: {
    mockOtp?: string;
  };
}

export interface VerifyOtpResponse {
  success: boolean;
  message: string;
  token: string;
  user: {
    _id: string;
    email?: string;
    mobileNumber?: string;
    displayName?: string;
    profileImage?: string;
  };
}

export interface ProfileResponse {
  success: boolean;
  message: string;
  user: {
    _id: string;
    email?: string;
    mobileNumber?: string;
    displayName?: string;
    profileImage?: string;
  };
}

export const api = {
  /**
   * Request OTP code sent to Email or Phone number
   */
  async sendOtp(payload: { email?: string; mobileNumber?: string }): Promise<OtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/send-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send OTP');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (sendOtp):', error);
      throw error;
    }
  },

  /**
   * Verify the OTP code to log in or create a user account
   */
  async verifyOtp(payload: { email?: string; mobileNumber?: string; otp: string }): Promise<VerifyOtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (verifyOtp):', error);
      throw error;
    }
  },

  /**
   * Get user profile by ID
   */
  async getProfile(userId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/${userId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch profile');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getProfile):', error);
      throw error;
    }
  },

  /**
   * Update the user profile (e.g. displayName / Full Name)
   */
  async updateProfile(
    userId: string, 
    token: string, 
    profileData: { displayName?: string; email?: string; mobileNumber?: string; profileImage?: string; slogan?: string; password?: string; gender?: string; username?: string }
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/profile/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`, // If auth middleware expects Bearer
        },
        body: JSON.stringify(profileData),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Profile update failed');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (updateProfile):', error);
      throw error;
    }
  },

  /**
   * Check if username is available
   */
  async checkUsernameAvailability(username: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/check-username/${encodeURIComponent(username)}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to check username');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (checkUsernameAvailability):', error);
      throw error;
    }
  },

  /**
   * Upload media file (e.g. user profile image)
   */
  async uploadMedia(fileUri: string, token: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${API_BASE_URL}/media/upload`);
      
      xhr.setRequestHeader('Authorization', `Bearer ${token}`);

      xhr.onload = () => {
        try {
          const response = JSON.parse(xhr.response);
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(response);
          } else {
            reject(new Error(response.message || 'Upload failed'));
          }
        } catch (e) {
          reject(new Error('Invalid JSON response from server'));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network request failed'));
      };

      const formData = new FormData();
      const uriParts = fileUri.split('/');
      const fileName = uriParts[uriParts.length - 1];
      const ext = fileName.split('.').pop() || 'jpg';
      const type = `image/${ext === 'png' ? 'png' : 'jpeg'}`;

      formData.append('file', {
        uri: fileUri,
        name: fileName,
        type: type
      } as any);

      xhr.send(formData);
    });
  },

  /**
   * Get all chats for a user
   */
  async getChats(userId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/user/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch chats');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getChats):', error);
      throw error;
    }
  },

  /**
   * Delete a single chat thread
   */
  async deleteChat(chatId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete chat');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (deleteChat):', error);
      throw error;
    }
  },

  /**
   * Delete multiple chat threads (bulk selection CRUD)
   */
  async deleteMultipleChats(chatIds: string[], token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ chatIds })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete multiple chats');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (deleteMultipleChats):', error);
      throw error;
    }
  },

  /**
   * Create or get a 1-to-1 chat thread with a contact
   */
  async createOrGetChat(currentUserId: string, participantId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/chats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ currentUserId, participantId })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create or get chat');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (createOrGetChat):', error);
      throw error;
    }
  },

  /**
   * Get all messages in a chat thread
   */
  async getMessages(chatId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/chats/${chatId}/messages`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch messages');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getMessages):', error);
      throw error;
    }
  },

  /**
   * Login with Email and Password
   */
  async loginWithPassword(payload: { email?: string; password?: string }): Promise<VerifyOtpResponse> {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (loginWithPassword):', error);
      throw error;
    }
  },

  /**
   * Create a new Status update (Story)
   */
  async createStatus(
    payload: { content: string; type?: 'text' | 'image'; mediaUrl?: string; backgroundColor?: string },
    token: string
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/statuses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create status update');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (createStatus):', error);
      throw error;
    }
  },

  /**
   * Get active Status updates grouped by users
   */
  async getStatuses(token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/statuses`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch statuses');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getStatuses):', error);
      throw error;
    }
  },

  /**
   * Delete a status update
   */
  async deleteStatus(statusId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/statuses/${statusId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to delete status update');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (deleteStatus):', error);
      throw error;
    }
  },

  /**
   * Update a status update
   */
  async updateStatus(
    statusId: string,
    payload: { content: string; type?: 'text' | 'image'; mediaUrl?: string; backgroundColor?: string },
    token: string
  ): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/statuses/${statusId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update status update');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (updateStatus):', error);
      throw error;
    }
  },

  /**
   * Fetch call logs list
   */
  async getCallLogs(token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/calls`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch call logs');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getCallLogs):', error);
      throw error;
    }
  },

  /**
   * Create a new call log entry
   */
  async createCallLog(token: string, payload: { receiverId: string; chatId?: string; type: 'audio' | 'video'; status: 'missed' | 'rejected' | 'completed'; duration?: number }): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/calls`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to create call log');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (createCallLog):', error);
      throw error;
    }
  },

  /**
   * Fetch active login sessions
   */
  async getSessions(token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch sessions');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (getSessions):', error);
      throw error;
    }
  },

  /**
   * Revoke a specific session by ID
   */
  async revokeSession(sessionId: string, token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to revoke session');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (revokeSession):', error);
      throw error;
    }
  },

  /**
   * Revoke all other sessions except current
   */
  async revokeOtherSessions(token: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/other`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to revoke other sessions');
      }
      return data;
    } catch (error: any) {
      console.error('API Error (revokeOtherSessions):', error);
      throw error;
    }
  }
};
