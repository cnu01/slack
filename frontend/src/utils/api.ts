const API_BASE_URL = 'https://slack-7ln6.onrender.com/api';

class ApiClient {
  private getHeaders(): HeadersInit {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Network error' }));
      throw new Error(error.error || 'Request failed');
    }

    return response.json();
  }

  // Auth APIs
  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    });
  }

  async register(username: string, email: string, password: string, profession: string) {
    return this.request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password, profession })
    });
  }

  async getProfile() {
    return this.request('/auth/profile');
  }

  // Workspace APIs
  async getWorkspaces() {
    return this.request('/workspaces');
  }

  async createWorkspace(name: string, description: string) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async joinWorkspace(inviteCode: string) {
    return this.request('/workspaces/join', {
      method: 'POST',
      body: JSON.stringify({ inviteCode })
    });
  }

  // Channel APIs
  async getChannels(workspaceId: string) {
    return this.request(`/channels/${workspaceId}/channels`);
  }

  async createChannel(workspaceId: string, name: string, description: string, isPrivate: boolean) {
    return this.request(`/channels/${workspaceId}/channels`, {
      method: 'POST',
      body: JSON.stringify({ name, description, isPrivate })
    });
  }

  async joinChannel(workspaceId: string, channelId: string) {
    return this.request(`/channels/${workspaceId}/channels/${channelId}/join`, {
      method: 'POST'
    });
  }

  // Message APIs
  async getMessages(channelId: string, page = 1, limit = 50) {
    return this.request(`/messages/channel/${channelId}?page=${page}&limit=${limit}`);
  }

  async sendMessage(channelId: string, content: string, type = 'text') {
    return this.request(`/messages/channel/${channelId}`, {
      method: 'POST',
      body: JSON.stringify({ content, type })
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE'
    });
  }
}

export const apiClient = new ApiClient();
