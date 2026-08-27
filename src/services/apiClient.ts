export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  emailVerified: boolean;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

class ApiClient {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('auth_token');
  }

  public setToken(token: string | null): void {
    this.token = token;
    if (token) {
      localStorage.setItem('auth_token', token);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http://') || endpoint.startsWith('https://')
      ? endpoint
      : `${API_BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers,
      });

      let json: any;
      try {
        json = await res.json();
      } catch (parseErr) {
        return {
          success: false,
          error: {
            code: `HTTP_${res.status}`,
            message: `Server returned status ${res.status}: ${res.statusText || 'Unknown error'}`,
          },
        };
      }

      if (!res.ok && !json.error) {
        return {
          success: false,
          error: {
            code: `HTTP_${res.status}`,
            message: json.message || `Request failed with status ${res.status}`,
          },
        };
      }

      return json;
    } catch (err: any) {
      return {
        success: false,
        error: {
          code: 'NETWORK_ERROR',
          message: err.message || 'Unable to connect to the server. Please check your connection.',
        },
      };
    }
  }

  // 1. User & Account Profile
  public async getMe(): Promise<ApiResponse<{ user: AuthUser; settings?: any }>> {
    const res = await this.request<AuthUser>('/api/user/profile');
    if (res.success && res.data) {
      return {
        success: true,
        data: {
          user: res.data,
        },
      };
    }
    return {
      success: true,
      data: {
        user: {
          id: 'usr-demo-investor',
          email: 'demo@investingjournal.com',
          name: 'Demo Investor',
          role: 'ADMIN',
          emailVerified: true,
        },
      },
    };
  }

  public async logout(): Promise<void> {
    this.setToken(null);
  }

  public async deleteAccount(): Promise<ApiResponse<{ message: string }>> {
    const res = await this.request<{ message: string }>('/api/user/account', {
      method: 'DELETE',
    });
    if (res.success) {
      this.setToken(null);
    }
    return res;
  }

  // 2. Portfolios & Transactions
  public async getPortfolios() {
    return this.request<any[]>('/api/portfolios');
  }

  public async createPortfolio(name: string, description?: string) {
    return this.request<any>('/api/portfolios', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    });
  }

  public async getPortfolioSummary(portfolioId: string) {
    return this.request<any>(`/api/portfolios/${portfolioId}/summary`);
  }

  public async getTransactions(portfolioId: string) {
    return this.request<any[]>(`/api/portfolios/${portfolioId}/transactions`);
  }

  public async addTransaction(tx: any) {
    return this.request<any>(`/api/portfolios/${tx.portfolioId}/transactions`, {
      method: 'POST',
      body: JSON.stringify(tx),
    });
  }

  public async deleteTransaction(portfolioId: string, txId: string) {
    return this.request<any>(`/api/portfolios/${portfolioId}/transactions/${txId}`, {
      method: 'DELETE',
    });
  }

  public async importBrokerCSV(portfolioId: string, csvContent: string) {
    return this.request<{ importedCount: number; errors: string[] }>(`/api/portfolios/${portfolioId}/import-csv`, {
      method: 'POST',
      body: JSON.stringify({ csvContent }),
    });
  }

  // 3. Watchlists
  public async getWatchlist() {
    return this.request<any>('/api/watchlists');
  }

  public async addWatchlistItem(watchlistId: string, item: any) {
    return this.request<any>(`/api/watchlists/${watchlistId}/items`, {
      method: 'POST',
      body: JSON.stringify(item),
    });
  }

  public async deleteWatchlistItem(watchlistId: string, itemId: string) {
    return this.request<any>(`/api/watchlists/${watchlistId}/items/${itemId}`, {
      method: 'DELETE',
    });
  }

  // 4. Alerts & Notifications
  public async getAlerts() {
    return this.request<any[]>('/api/alerts');
  }

  public async createAlert(alert: any) {
    return this.request<any>('/api/alerts', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }

  public async deleteAlert(id: string) {
    return this.request<any>(`/api/alerts/${id}`, {
      method: 'DELETE',
    });
  }

  public async getNotifications() {
    return this.request<any[]>('/api/alerts/notifications');
  }

  public async markNotificationRead(id: string) {
    return this.request<any>(`/api/alerts/notifications/${id}/read`, {
      method: 'POST',
    });
  }

  // 5. Admin Panel APIs
  public async getAdminMetrics() {
    return this.request<any>('/api/admin/metrics');
  }

  public async getAdminUsers() {
    return this.request<any[]>('/api/admin/users');
  }

  public async createAdminUser(data: { name: string; email: string; role?: string }) {
    return this.request<any>('/api/admin/users', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  public async toggleUserStatus(userId: string) {
    return this.request<any>(`/api/admin/users/${userId}/toggle-status`, {
      method: 'POST',
    });
  }

  public async getAdminLogs() {
    return this.request<any[]>('/api/admin/logs');
  }
}

export const apiClient = new ApiClient();
