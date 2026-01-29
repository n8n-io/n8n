/**
 * API Client for Personal Vault
 */

const API_BASE = '/api/v1';

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  code?: string;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private onTokenRefresh?: (accessToken: string, refreshToken: string) => void;
  private onAuthError?: () => void;

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  setCallbacks(callbacks: {
    onTokenRefresh?: (accessToken: string, refreshToken: string) => void;
    onAuthError?: () => void;
  }) {
    this.onTokenRefresh = callbacks.onTokenRefresh;
    this.onAuthError = callbacks.onAuthError;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    retry = true
  ): Promise<ApiResponse<T>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers,
      });

      const data: ApiResponse<T> = await response.json();

      // Handle token expiration
      if (response.status === 401 && data.code === 'TOKEN_EXPIRED' && retry && this.refreshToken) {
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the original request
          return this.request<T>(endpoint, options, false);
        }
      }

      // Handle auth errors
      if (response.status === 401) {
        this.onAuthError?.();
      }

      return data;
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: 'Network error. Please check your connection.',
      };
    }
  }

  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      const data = await response.json();

      if (data.success && data.data) {
        this.accessToken = data.data.accessToken;
        this.refreshToken = data.data.refreshToken;
        this.onTokenRefresh?.(data.data.accessToken, data.data.refreshToken);
        return true;
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // Auth endpoints
  async getSalt(email: string) {
    return this.request<{ salt: string }>('/auth/salt', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async register(data: {
    email: string;
    authHash: string;
    salt: string;
    encryptedRecoveryBlob?: string;
  }) {
    return this.request<{
      user: { id: string; email: string; createdAt: string; updatedAt: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async login(email: string, authHash: string) {
    return this.request<{
      user: { id: string; email: string; createdAt: string; updatedAt: string };
      accessToken: string;
      refreshToken: string;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, authHash }),
    });
  }

  async logout() {
    if (this.refreshToken) {
      await this.request('/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });
    }
    this.clearTokens();
  }

  async getRecoveryBlob(email: string) {
    return this.request<{ encryptedRecoveryBlob: string }>('/auth/recovery-blob', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  // Entries endpoints
  async getEntries(page = 1, pageSize = 50) {
    return this.request<{
      items: Array<{
        id: string;
        type: string;
        encryptedData: string;
        folderId: string | null;
        createdAt: string;
        updatedAt: string;
      }>;
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>(`/entries?page=${page}&pageSize=${pageSize}`);
  }

  async getEntry(id: string) {
    return this.request<{
      id: string;
      type: string;
      encryptedData: string;
      folderId: string | null;
      createdAt: string;
      updatedAt: string;
    }>(`/entries/${id}`);
  }

  async createEntry(data: {
    type: string;
    encryptedData: string;
    folderId?: string | null;
  }) {
    return this.request<{
      id: string;
      type: string;
      encryptedData: string;
      folderId: string | null;
      createdAt: string;
      updatedAt: string;
    }>('/entries', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateEntry(id: string, data: { encryptedData?: string; folderId?: string | null }) {
    return this.request<{
      id: string;
      type: string;
      encryptedData: string;
      folderId: string | null;
      createdAt: string;
      updatedAt: string;
    }>(`/entries/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteEntry(id: string) {
    return this.request<{ message: string }>(`/entries/${id}`, {
      method: 'DELETE',
    });
  }

  // Folders endpoints
  async getFolders() {
    return this.request<
      Array<{
        id: string;
        encryptedName: string;
        parentId: string | null;
        createdAt: string;
      }>
    >('/folders');
  }

  async createFolder(data: { encryptedName: string; parentId?: string | null }) {
    return this.request<{
      id: string;
      encryptedName: string;
      parentId: string | null;
      createdAt: string;
    }>('/folders', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateFolder(id: string, data: { encryptedName?: string; parentId?: string | null }) {
    return this.request<{
      id: string;
      encryptedName: string;
      parentId: string | null;
      createdAt: string;
    }>(`/folders/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteFolder(id: string) {
    return this.request<{ message: string }>(`/folders/${id}`, {
      method: 'DELETE',
    });
  }
}

export const api = new ApiClient();
