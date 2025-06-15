import { io, Socket } from 'socket.io-client';

interface User {
  _id: string;
  username: string;
  email: string;
  profession: string;
}

interface PresenceUpdate {
  userId: string;
  username: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
}

interface TypingStatus {
  userId: string;
  username: string;
  channelId: string;
  isTyping: boolean;
}

class SocketClient {
  private socket: Socket | null = null;
  private user: User | null = null;
  private messageHandlers: ((message: any) => void)[] = [];
  private presenceHandlers: ((presence: PresenceUpdate) => void)[] = [];
  private workspacePresenceHandlers: ((users: any[]) => void)[] = [];
  private typingHandlers: ((typing: TypingStatus) => void)[] = [];

  connect(token: string, user: User) {
    if (this.socket) {
      this.disconnect();
    }

    console.log('🔗 Attempting to connect to Socket.IO...', { user: user.username });
    this.user = user;
    this.socket = io('http://localhost:5001', {
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
      forceNew: true,
      transports: ['polling', 'websocket']
    });

    this.setupEventHandlers();
    
    // Authenticate after connection
    this.socket.on('connect', () => {
      console.log('✅ Socket connected successfully:', this.socket?.id);
      console.log('🔐 Authenticating with token...');
      this.authenticate(token);
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error);
    });
  }

  private authenticate(token: string) {
    if (this.socket) {
      this.socket.emit('authenticate', token);
    }
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Authentication
    this.socket.on('authenticated', (data) => {
      console.log('✅ Socket authenticated successfully:', data);
    });

    this.socket.on('authentication_error', (error) => {
      console.error('❌ Socket authentication error:', error);
    });

    // Messages
    this.socket.on('message_received', (message) => {
      console.log('📨 Real-time message received:', message);
      this.messageHandlers.forEach(handler => handler(message));
    });

    // Presence updates
    this.socket.on('presence_update', (presence: PresenceUpdate) => {
      console.log('Presence update:', presence);
      this.presenceHandlers.forEach(handler => handler(presence));
    });

    this.socket.on('workspace_presence', (users) => {
      console.log('Workspace presence:', users);
      // Handle initial presence data
      this.workspacePresenceHandlers.forEach(handler => handler(users));
    });

    // Typing indicators
    this.socket.on('user_typing', (typing: TypingStatus) => {
      // Don't show typing indicator for current user
      if (typing.userId !== this.user?._id) {
        this.typingHandlers.forEach(handler => handler(typing));
      }
    });
  }

  // Send message (used for real-time broadcasting)
  sendMessage(messageData: any) {
    if (this.socket) {
      this.socket.emit('new_message', messageData);
      console.log('📤 Sent message via socket:', messageData);
    }
  }

  // Room management
  joinWorkspace(workspaceId: string) {
    if (this.socket) {
      this.socket.emit('join_workspace', workspaceId);
      console.log('🔗 Joined workspace room:', workspaceId);
    }
  }

  joinChannel(channelId: string) {
    if (this.socket) {
      this.socket.emit('join_channel', channelId);
      console.log('🔗 Joined channel room:', channelId);
    }
  }

  leaveChannel(channelId: string) {
    if (this.socket) {
      this.socket.emit('leave_channel', channelId);
      console.log('🔌 Left channel room:', channelId);
    }
  }

  // Typing indicators
  startTyping(channelId: string) {
    if (this.socket) {
      this.socket.emit('typing_start', channelId);
    }
  }

  stopTyping(channelId: string) {
    if (this.socket) {
      this.socket.emit('typing_stop', channelId);
    }
  }

  // Status updates
  updateStatus(status: 'online' | 'away') {
    if (this.socket) {
      this.socket.emit('status_change', status);
    }
  }

  // Event handlers
  onMessage(handler: (message: any) => void) {
    this.messageHandlers.push(handler);
    return () => {
      this.messageHandlers = this.messageHandlers.filter(h => h !== handler);
    };
  }

  onPresenceUpdate(handler: (presence: PresenceUpdate) => void) {
    this.presenceHandlers.push(handler);
    return () => {
      this.presenceHandlers = this.presenceHandlers.filter(h => h !== handler);
    };
  }

  onTyping(handler: (typing: TypingStatus) => void) {
    this.typingHandlers.push(handler);
    return () => {
      this.typingHandlers = this.typingHandlers.filter(h => h !== handler);
    };
  }

  onWorkspacePresence(handler: (users: any[]) => void) {
    this.workspacePresenceHandlers.push(handler);
    return () => {
      this.workspacePresenceHandlers = this.workspacePresenceHandlers.filter(h => h !== handler);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.user = null;
    this.messageHandlers = [];
    this.presenceHandlers = [];
    this.workspacePresenceHandlers = [];
    this.typingHandlers = [];
  }

  isConnected() {
    return this.socket?.connected || false;
  }
}

// Create singleton instance
export const socketClient = new SocketClient();
