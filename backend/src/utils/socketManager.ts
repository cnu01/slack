import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import User from '../models/User';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  username?: string;
}

interface UserPresence {
  userId: string;
  username: string;
  socketId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: Date;
  currentWorkspace?: string;
  currentChannel?: string;
}

interface TypingInfo {
  userId: string;
  username: string;
  channelId: string;
}

class SocketManager {
  private io: Server;
  private connectedUsers = new Map<string, UserPresence>();
  private typingUsers = new Map<string, TypingInfo>();

  constructor(io: Server) {
    this.io = io;
    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('🔗 User connected:', socket.id);

      // Authenticate socket connection
      socket.on('authenticate', async (token: string) => {
        console.log('🔐 Authentication attempt for socket:', socket.id);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
          const user = await User.findById(decoded.userId).select('username email profession');
          
          if (user) {
            const userId = (user._id as any).toString();
            socket.userId = userId;
            socket.username = user.username;
            
            // Add user to connected users
            this.connectedUsers.set(userId, {
              userId: userId,
              username: user.username,
              socketId: socket.id,
              status: 'online',
              lastSeen: new Date()
            });

            // Join user to their personal room
            socket.join(`user:${userId}`);
            
            // Emit authentication success
            socket.emit('authenticated', {
              userId: userId,
              username: user.username
            });

            // Broadcast user online status
            this.broadcastPresenceUpdate(userId, 'online');
            
            console.log(`✅ User authenticated: ${user.username} (${userId})`);
          } else {
            console.log('❌ Invalid user token');
            socket.emit('authentication_error', 'Invalid token');
          }
        } catch (error) {
          console.error('❌ Socket authentication error:', error);
          socket.emit('authentication_error', 'Invalid token');
        }
      });

      // Join workspace
      socket.on('join_workspace', (workspaceId: string) => {
        if (socket.userId) {
          socket.join(`workspace:${workspaceId}`);
          
          // Update user's current workspace
          const userPresence = this.connectedUsers.get(socket.userId);
          if (userPresence) {
            userPresence.currentWorkspace = workspaceId;
            this.connectedUsers.set(socket.userId, userPresence);
          }
          
          // Send current online users in workspace
          this.sendWorkspacePresence(socket, workspaceId);
          
          console.log(`📋 User ${socket.username} joined workspace: ${workspaceId}`);
        }
      });

      // Join channel
      socket.on('join_channel', (channelId: string) => {
        if (socket.userId) {
          socket.join(`channel:${channelId}`);
          
          // Update user's current channel
          const userPresence = this.connectedUsers.get(socket.userId);
          if (userPresence) {
            userPresence.currentChannel = channelId;
            this.connectedUsers.set(socket.userId, userPresence);
          }
          
          console.log(`🏷️ User ${socket.username} joined channel: ${channelId}`);
        }
      });

      // Leave channel
      socket.on('leave_channel', (channelId: string) => {
        if (socket.userId) {
          socket.leave(`channel:${channelId}`);
          
          // Clear typing status
          this.clearTypingStatus(socket.userId, channelId);
          
          console.log(`User ${socket.username} left channel: ${channelId}`);
        }
      });

      // Handle new message
      socket.on('new_message', (messageData: any) => {
        if (socket.userId && messageData.channelId) {
          console.log(`💬 Broadcasting message from ${socket.username} to channel ${messageData.channelId}`);
          
          // Broadcast message to all users in the channel (including sender)
          this.io.to(`channel:${messageData.channelId}`).emit('message_received', {
            ...messageData,
            author: {
              _id: socket.userId,
              username: socket.username
            }
          });
          
          console.log(`✅ Message broadcasted successfully`);
        }
      });

      // Handle typing indicators
      socket.on('typing_start', (channelId: string) => {
        if (socket.userId && socket.username) {
          const typingInfo: TypingInfo = {
            userId: socket.userId,
            username: socket.username,
            channelId
          };
          
          this.typingUsers.set(`${socket.userId}:${channelId}`, typingInfo);
          
          // Broadcast typing status to channel with channelId included
          socket.to(`channel:${channelId}`).emit('user_typing', {
            userId: socket.userId,
            username: socket.username,
            channelId: channelId,
            isTyping: true
          });
          
          console.log(`⌨️ User ${socket.username} started typing in channel ${channelId}`);
        }
      });

      socket.on('typing_stop', (channelId: string) => {
        if (socket.userId) {
          this.clearTypingStatus(socket.userId, channelId);
        }
      });

      // Handle user status changes
      socket.on('status_change', (status: 'online' | 'away') => {
        if (socket.userId) {
          const userPresence = this.connectedUsers.get(socket.userId);
          if (userPresence) {
            userPresence.status = status;
            userPresence.lastSeen = new Date();
            this.connectedUsers.set(socket.userId, userPresence);
            
            this.broadcastPresenceUpdate(socket.userId, status);
          }
        }
      });

      // Handle disconnection
      socket.on('disconnect', () => {
        if (socket.userId) {
          // Clear typing status
          this.typingUsers.forEach((typing, key) => {
            if (typing.userId === socket.userId) {
              this.clearTypingStatus(typing.userId, typing.channelId);
            }
          });

          // Remove user from connected users
          this.connectedUsers.delete(socket.userId);
          
          // Broadcast user offline status
          this.broadcastPresenceUpdate(socket.userId, 'offline');

          console.log(`User ${socket.username} disconnected`);
        }
        
        console.log('User disconnected:', socket.id);
      });
    });
  }

  private clearTypingStatus(userId: string, channelId: string) {
    const key = `${userId}:${channelId}`;
    if (this.typingUsers.has(key)) {
      const typingInfo = this.typingUsers.get(key)!;
      this.typingUsers.delete(key);
      
      // Broadcast typing stop to channel with channelId included
      this.io.to(`channel:${channelId}`).emit('user_typing', {
        userId,
        username: typingInfo.username,
        channelId: channelId,
        isTyping: false
      });
      
      console.log(`⌨️ User ${typingInfo.username} stopped typing in channel ${channelId}`);
    }
  }

  private broadcastPresenceUpdate(userId: string, status: 'online' | 'away' | 'offline') {
    const userPresence = this.connectedUsers.get(userId);
    
    // For offline status, we might not have the user in connectedUsers anymore
    // So we need to broadcast to all workspaces the user might have been in
    if (status === 'offline') {
      // Broadcast to all connected users since we don't know which workspaces they were in
      this.io.emit('presence_update', {
        userId,
        username: userPresence?.username || 'Unknown User',
        status,
        lastSeen: new Date()
      });
    } else if (userPresence && userPresence.currentWorkspace) {
      this.io.to(`workspace:${userPresence.currentWorkspace}`).emit('presence_update', {
        userId,
        username: userPresence.username,
        status,
        lastSeen: userPresence.lastSeen
      });
    }
  }

  private sendWorkspacePresence(socket: Socket, workspaceId: string) {
    const workspaceUsers: any[] = [];
    
    this.connectedUsers.forEach((user) => {
      if (user.currentWorkspace === workspaceId) {
        workspaceUsers.push({
          userId: user.userId,
          username: user.username,
          status: user.status,
          lastSeen: user.lastSeen
        });
      }
    });

    socket.emit('workspace_presence', workspaceUsers);
  }

  // Public method to emit message to channel
  public emitToChannel(channelId: string, event: string, data: any) {
    this.io.to(`channel:${channelId}`).emit(event, data);
  }

  // Public method to emit to workspace
  public emitToWorkspace(workspaceId: string, event: string, data: any) {
    this.io.to(`workspace:${workspaceId}`).emit(event, data);
  }

  // Public method to get online users count for a workspace
  public getOnlineUsersCount(workspaceId: string): number {
    let count = 0;
    this.connectedUsers.forEach((user) => {
      if (user.currentWorkspace === workspaceId && user.status === 'online') {
        count++;
      }
    });
    return count;
  }

  // Public method to get all online users in a workspace
  public getOnlineUsers(workspaceId: string): UserPresence[] {
    const onlineUsers: UserPresence[] = [];
    this.connectedUsers.forEach((user) => {
      if (user.currentWorkspace === workspaceId && user.status === 'online') {
        onlineUsers.push(user);
      }
    });
    return onlineUsers;
  }
}

export default SocketManager;
