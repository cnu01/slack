import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface User {
  _id: string;
  username: string;
  email: string;
  profession: string;
  avatar?: string;
}

interface Workspace {
  _id: string;
  name: string;
  description: string;
  owner: string;
  members: string[];
}

interface Channel {
  _id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  memberCount: number;
  isMember: boolean;
  createdBy: User;
  createdAt: string;
}

interface Message {
  _id: string;
  content: string;
  author: User;
  channel: string;
  messageType: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  reactions?: { emoji: string; users: string[] }[];
  replyCount?: number;
  replyTo?: Message;
  isEdited: boolean;
  editedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface AppState {
  // Auth
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  
  // Current workspace and channel
  currentWorkspace: Workspace | null;
  currentChannel: Channel | null;
  currentDMUser: User | null; // Current DM conversation user
  
  // Data
  workspaces: Workspace[];
  channels: Channel[];
  messages: Message[];
  workspaceUsers: User[]; // All users in current workspace
  
  // Real-time features
  onlineUsers: { [userId: string]: { username: string; status: 'online' | 'away' | 'offline'; lastSeen: Date } };
  typingUsers: { [channelId: string]: string[] }; // Array of usernames currently typing
  
  // UI state
  sidebarCollapsed: boolean;
  rightSidebarOpen: boolean;
  currentView: 'channels' | 'dms' | 'threads' | 'activity';
  
  // AI state
  aiInteracting: boolean;
  aiHistory: any[];
  recentAutoReplies: string[];
  
  // Actions
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  setCurrentWorkspace: (workspace: Workspace | null) => void;
  setCurrentChannel: (channel: Channel | null) => void;
  setCurrentDMUser: (user: User | null) => void;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setChannels: (channels: Channel[]) => void;
  setWorkspaceUsers: (users: User[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateMessage: (messageId: string, updates: Partial<Message>) => void;
  deleteMessage: (messageId: string) => void;
  
  // Real-time actions
  updateUserPresence: (userId: string, username: string, status: 'online' | 'away' | 'offline', lastSeen: Date) => void;
  setTypingUsers: (channelId: string, usernames: string[]) => void;
  addTypingUser: (channelId: string, username: string) => void;
  removeTypingUser: (channelId: string, username: string) => void;
  
  // UI actions
  toggleSidebar: () => void;
  toggleRightSidebar: () => void;
  setCurrentView: (view: 'channels' | 'dms' | 'threads' | 'activity') => void;

  // AI actions
  setAIInteracting: (interacting: boolean) => void;
  addToAIHistory: (item: any) => void;
  addRecentAutoReply: (reply: string) => void;
  clearRecentAutoReplies: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // Initial state
      user: null,
      token: null,
      isAuthenticated: false,
      currentWorkspace: null,
      currentChannel: null,
      currentDMUser: null,
      workspaces: [],
      channels: [],
      messages: [],
      workspaceUsers: [],
      onlineUsers: {},
      typingUsers: {},
      sidebarCollapsed: false,
      rightSidebarOpen: false,
      currentView: 'channels',

      // AI state
      aiInteracting: false,
      aiHistory: [],
      recentAutoReplies: [],

      // Actions
      setAuth: (user, token) => set({ 
        user, 
        token, 
        isAuthenticated: true 
      }),
      
      logout: () => set({ 
        user: null, 
        token: null, 
        isAuthenticated: false,
        currentWorkspace: null,
        currentChannel: null,
        workspaces: [],
        channels: [],
        messages: [],
        workspaceUsers: [],
        onlineUsers: {},
        typingUsers: {}
      }),
      
      setCurrentWorkspace: (workspace) => set({ 
        currentWorkspace: workspace,
        currentChannel: null,
        channels: [],
        messages: [],
        workspaceUsers: []
      }),
      
      setCurrentChannel: (channel) => set({ 
        currentChannel: channel,
        currentDMUser: null, // Clear DM user when selecting channel
        messages: []
      }),
      
      setCurrentDMUser: (user) => set({ 
        currentDMUser: user,
        currentChannel: null, // Clear channel when selecting DM
        messages: []
      }),
      
      setWorkspaces: (workspaces) => set({ workspaces }),
      setChannels: (channels) => set({ channels }),
      setWorkspaceUsers: (users) => set({ workspaceUsers: users }),
      setMessages: (messages) => set({ messages }),
      
      addMessage: (message) => set((state) => {
        // Check if message already exists to prevent duplicates
        const exists = state.messages.some(existingMsg => existingMsg._id === message._id);
        if (exists) {
          console.log('🚫 Duplicate message prevented:', message._id);
          return state;
        }
        console.log('✅ Adding new message:', message._id);
        return { messages: [...state.messages, message] };
      }),
      
      updateMessage: (messageId, updates) => set((state) => ({
        messages: state.messages.map(msg => 
          msg._id === messageId ? { ...msg, ...updates } : msg
        )
      })),
      
      deleteMessage: (messageId) => set((state) => ({
        messages: state.messages.filter(msg => msg._id !== messageId)
      })),
      
      // Real-time actions
      updateUserPresence: (userId, username, status, lastSeen) => set((state) => ({
        onlineUsers: {
          ...state.onlineUsers,
          [userId]: { username, status, lastSeen }
        }
      })),
      
      setTypingUsers: (channelId, usernames) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [channelId]: usernames
        }
      })),
      
      addTypingUser: (channelId, username) => set((state) => {
        const currentTyping = state.typingUsers[channelId] || [];
        if (!currentTyping.includes(username)) {
          return {
            typingUsers: {
              ...state.typingUsers,
              [channelId]: [...currentTyping, username]
            }
          };
        }
        return state;
      }),
      
      removeTypingUser: (channelId, username) => set((state) => ({
        typingUsers: {
          ...state.typingUsers,
          [channelId]: (state.typingUsers[channelId] || []).filter(u => u !== username)
        }
      })),
      
      toggleSidebar: () => set((state) => ({ 
        sidebarCollapsed: !state.sidebarCollapsed 
      })),
      
      toggleRightSidebar: () => set((state) => ({ 
        rightSidebarOpen: !state.rightSidebarOpen 
      })),
      
      setCurrentView: (view) => set({ currentView: view }),

      // AI actions
      setAIInteracting: (interacting) => set({ aiInteracting: interacting }),
      
      addToAIHistory: (item) => set((state) => ({
        aiHistory: [item, ...state.aiHistory].slice(0, 50) // Keep last 50 items
      })),
      
      addRecentAutoReply: (reply) => set((state) => ({
        recentAutoReplies: [reply, ...state.recentAutoReplies.filter(r => r !== reply)].slice(0, 10) // Keep last 10 unique replies
      })),
      
      clearRecentAutoReplies: () => set({ recentAutoReplies: [] })
    }),
    {
      name: 'slack-clone-store',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        currentWorkspace: state.currentWorkspace,
        currentChannel: state.currentChannel,
        currentDMUser: state.currentDMUser,
        currentView: state.currentView
      })
    }
  )
);
