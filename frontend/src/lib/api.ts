const API_BASE_URL = 'http://localhost:5001/api';

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const config: RequestInit = {
      headers: this.getAuthHeaders(),
      ...options
    };

    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
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

  async updateAvatar(avatarUrl: string) {
    return this.request('/auth/avatar', {
      method: 'PUT',
      body: JSON.stringify({ avatar: avatarUrl })
    });
  }

  // Workspace endpoints
  async getWorkspaces() {
    return this.request('/workspaces');
  }

  async createWorkspace(name: string, description: string) {
    return this.request('/workspaces', {
      method: 'POST',
      body: JSON.stringify({ name, description })
    });
  }

  async joinWorkspace(workspaceId: string) {
    return this.request(`/workspaces/${workspaceId}/join`, {
      method: 'POST'
    });
  }

  async getWorkspaceUsers(workspaceId: string) {
    return this.request(`/workspaces/${workspaceId}/users`);
  }

  // Channel endpoints
  async getChannels(workspaceId: string) {
    return this.request(`/channels/${workspaceId}/channels`);
  }

  async createChannel(workspaceId: string, name: string, description: string, isPrivate = false) {
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

  // Message endpoints
  async getMessages(channelId: string, page = 1, limit = 50) {
    return this.request(`/messages/channel/${channelId}?page=${page}&limit=${limit}`);
  }

  async sendMessage(
    channelId: string, 
    content: string, 
    mentions?: Array<{
      type: 'user' | 'channel' | 'everyone';
      targetId?: string;
      displayText: string;
    }>,
    messageType: 'text' | 'file' | 'image' | 'system' = 'text',
    fileData?: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    },
    replyTo?: string
  ) {
    const payload: any = { 
      content, 
      messageType,
      replyTo,
      mentions 
    };

    if (fileData) {
      payload.fileUrl = fileData.fileUrl;
      payload.fileName = fileData.fileName;
      payload.fileSize = fileData.fileSize;
      payload.fileType = fileData.fileType;
    }

    return this.request(`/messages/channel/${channelId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  async editMessage(messageId: string, content: string) {
    return this.request(`/messages/${messageId}`, {
      method: 'PUT',
      body: JSON.stringify({ content })
    });
  }

  async deleteMessage(messageId: string) {
    return this.request(`/messages/${messageId}`, {
      method: 'DELETE'
    });
  }

  // Reaction endpoints
  async addReaction(messageId: string, emoji: string) {
    return this.request(`/message-actions/${messageId}/reactions`, {
      method: 'POST',
      body: JSON.stringify({ emoji })
    });
  }

  async removeReaction(messageId: string, emoji: string) {
    return this.request(`/message-actions/${messageId}/reactions`, {
      method: 'DELETE',
      body: JSON.stringify({ emoji })
    });
  }

  // Thread endpoints
  async createThreadReply(
    messageId: string, 
    content: string,
    mentions?: Array<{
      type: 'user' | 'channel' | 'everyone';
      targetId?: string;
      displayText: string;
    }>
  ) {
    return this.request(`/message-actions/${messageId}/replies`, {
      method: 'POST',
      body: JSON.stringify({ content, mentions })
    });
  }

  async getThreadReplies(messageId: string, page = 1, limit = 50) {
    return this.request(`/message-actions/${messageId}/replies?page=${page}&limit=${limit}`);
  }

  // Pin endpoints
  async pinMessage(messageId: string) {
    return this.request(`/message-actions/${messageId}/pin`, {
      method: 'POST'
    });
  }

  async unpinMessage(messageId: string) {
    return this.request(`/message-actions/${messageId}/pin`, {
      method: 'DELETE'
    });
  }

  async getPinnedMessages(channelId: string) {
    return this.request(`/message-actions/channels/${channelId}/pinned`);
  }

  // Direct Message endpoints
  async getDMMessages(otherUserId: string, page = 1, limit = 50) {
    return this.request(`/messages/dm/${otherUserId}?page=${page}&limit=${limit}`);
  }

  async sendDMMessage(
    otherUserId: string, 
    content: string, 
    mentions?: Array<{
      type: 'user' | 'channel' | 'everyone';
      targetId?: string;
      displayText: string;
    }>,
    messageType: 'text' | 'file' | 'image' | 'system' = 'text',
    fileData?: {
      fileUrl: string;
      fileName: string;
      fileSize: number;
      fileType: string;
    },
    replyTo?: string
  ) {
    const payload: any = { 
      content, 
      messageType,
      replyTo,
      mentions 
    };

    if (fileData) {
      payload.fileUrl = fileData.fileUrl;
      payload.fileName = fileData.fileName;
      payload.fileSize = fileData.fileSize;
      payload.fileType = fileData.fileType;
    }

    return this.request(`/messages/dm/${otherUserId}`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }
}

export const apiClient = new ApiClient();
