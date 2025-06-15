import { Hash, Lock, ChevronDown, Plus, Circle, MessageSquare, Activity, LogOut, Menu, X, Brain } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socketClient';
// import { BackendAvatarService } from '../lib/backendAvatarService'; // Avatar functionality removed for now
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OrgBrainSidebar from './OrgBrainSidebar';

function Sidebar() {
  const navigate = useNavigate();
  const { 
    user,
    currentWorkspace, 
    channels, 
    setChannels, 
    currentChannel, 
    setCurrentChannel,
    setCurrentDMUser,
    sidebarCollapsed,
    toggleSidebar,
    currentView,
    setCurrentView,
    updateUserPresence,
    workspaceUsers,
    typingUsers,
    addTypingUser,
    removeTypingUser,
    setWorkspaceUsers
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [showOrgBrain, setShowOrgBrain] = useState(false);

  useEffect(() => {
    if (currentWorkspace && !channelsLoaded) {
      loadChannels();
      loadWorkspaceUsers();
      // Join the workspace room for real-time events
      socketClient.joinWorkspace(currentWorkspace._id);
    } else if (!currentWorkspace) {
      setChannelsLoaded(false);
    }
  }, [currentWorkspace, channelsLoaded]);

  // Set up real-time presence listening
  useEffect(() => {
    const unsubscribePresence = socketClient.onPresenceUpdate((presence) => {
      updateUserPresence(presence.userId, presence.username, presence.status, presence.lastSeen);
    });

    return () => {
      unsubscribePresence();
    };
  }, [updateUserPresence]);

  // Global typing listener for all conversations (DMs and channels)
  useEffect(() => {
    const unsubscribeTyping = socketClient.onTyping((typing) => {
      console.log('🔄 Global typing indicator received:', typing);
      
      // Extract channel/conversation ID from the typing event
      const channelId = typing.channelId;
      
      if (channelId) {
        if (typing.isTyping) {
          addTypingUser(channelId, typing.username);
          
          // Remove typing status after 3 seconds
          setTimeout(() => {
            removeTypingUser(channelId, typing.username);
          }, 3000);
        } else {
          removeTypingUser(channelId, typing.username);
        }
      }
    });

    return () => {
      unsubscribeTyping();
    };
  }, [addTypingUser, removeTypingUser]);

  const handleLogout = () => {
    localStorage.clear();
    socketClient.disconnect();
    window.location.href = '/auth';
  };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || !user) return;
    
    try {
      setLoading(true);
      
      // Avatar upload functionality temporarily disabled
      console.log('📝 Avatar upload feature is currently disabled');
      alert('Avatar upload feature is temporarily disabled. Please try again later.');
      
      // Reset form
      setShowProfileModal(false);
      setAvatarFile(null);
      setAvatarPreview(null);
      
      alert('Avatar updated successfully!');
    } catch (error) {
      console.error('❌ Failed to upload avatar:', error);
      alert(`Failed to upload avatar: ${error instanceof Error ? error.message : 'Please try again.'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDMUserClick = (dmUser: any) => {
    setCurrentDMUser(dmUser);
    setCurrentView('dms');
  };

  // Helper function to generate DM conversation ID
  const getDMConversationId = (otherUserId: string): string => {
    if (!user?._id) return '';
    const sortedIds = [user._id, otherUserId].sort();
    return `dm-${sortedIds[0]}-${sortedIds[1]}`;
  };

  // Helper function to check if user is typing in DM
  const isUserTypingInDM = (otherUserId: string): boolean => {
    const conversationId = getDMConversationId(otherUserId);
    const currentTyping = typingUsers[conversationId] || [];
    // Check if the other user (not current user) is typing
    return currentTyping.some(username => {
      // Find the user by username and check if it's not the current user
      const typingUser = workspaceUsers.find(u => u.username === username);
      return typingUser && typingUser._id === otherUserId;
    });
  };

  const loadChannels = async () => {
    if (!currentWorkspace || channelsLoaded) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getChannels(currentWorkspace._id);
      setChannels(response.channels);
      
      // Don't auto-select channels here - let WorkspacePage handle it
      // This prevents conflicts with URL-based navigation
      console.log('Loaded channels:', response.channels.map((ch: any) => ch.name));
      
      setChannelsLoaded(true);
    } catch (error) {
      console.error('Failed to load channels:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadWorkspaceUsers = async () => {
    if (!currentWorkspace) return;
    
    try {
      console.log('Loading workspace users for:', currentWorkspace.name);
      const response = await apiClient.getWorkspaceUsers(currentWorkspace._id);
      
      // Filter out current user from the list for DMs
      const otherUsers = response.users.filter((u: any) => u._id !== user?._id);
      
      setWorkspaceUsers(otherUsers);
      console.log('Loaded workspace users:', otherUsers.length);
    } catch (error) {
      console.error('Failed to load workspace users:', error);
      // Fallback to empty array if API fails
      setWorkspaceUsers([]);
    }
  };

  const handleChannelClick = async (channel: any) => {
    if (channel.isPrivate && !channel.isMember) {
      try {
        await apiClient.joinChannel(currentWorkspace!._id, channel._id);
        channel.isMember = true;
      } catch (error) {
        console.error('Failed to join channel:', error);
        return;
      }
    }
    setCurrentChannel(channel);
    setCurrentView('channels');
    // Update URL to reflect the selected channel
    navigate(`/workspace/${currentWorkspace!._id}/channel/${channel._id}`);
  };

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace || !newChannelName.trim()) return;

    try {
      const response = await apiClient.createChannel(
        currentWorkspace._id,
        newChannelName.trim(),
        newChannelDescription.trim(),
        newChannelPrivate
      );
      
      setChannels([...channels, response.channel]);
      setNewChannelName('');
      setNewChannelDescription('');
      setNewChannelPrivate(false);
      setShowCreateChannel(false);
    } catch (error) {
      console.error('Failed to create channel:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'online':
        return <Circle className="w-2 h-2 fill-green-400 text-green-400" />;
      case 'away':
        return <Circle className="w-2 h-2 fill-yellow-400 text-yellow-400" />;
      default:
        return <Circle className="w-2 h-2 fill-gray-400 text-gray-400" />;
    }
  };

  if (sidebarCollapsed) {
    return (
      <div className="w-16 bg-gray-800 text-white flex flex-col items-center py-4">
        <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-lg font-bold mb-4">
          {currentWorkspace?.name.charAt(0) || 'S'}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-gray-800 text-white flex flex-col h-full">
      {/* Hamburger Menu at Top */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <button
            onClick={toggleSidebar}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Toggle Sidebar"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex-1 ml-4">
            <h1 className="font-bold text-lg">{currentWorkspace?.name}</h1>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Threads */}
        <div className="p-2">
          <button
            onClick={() => setCurrentView('threads')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'threads' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>Threads</span>
          </button>
        </div>

        {/* Activity */}
        <div className="p-2">
          <button
            onClick={() => setCurrentView('activity')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'activity' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </button>
        </div>

        {/* Org Brain */}
        <div className="p-2">
          <button
            onClick={() => setShowOrgBrain(true)}
            className="w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-300 hover:bg-gray-700"
          >
            <Brain className="w-4 h-4" />
            <span>Org Brain</span>
          </button>
        </div>

        {/* Channels Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Channels</h3>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="text-gray-400 hover:text-white"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {channels.map((channel: any) => {
              const isTyping = typingUsers[channel._id] && typingUsers[channel._id].length > 0;
              return (
                <button
                  key={channel._id}
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors ${
                    currentChannel?._id === channel._id ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
                  }`}
                >
                  {channel.isPrivate ? (
                    <Lock className="w-4 h-4 text-gray-400" />
                  ) : (
                    <Hash className="w-4 h-4 text-gray-400" />
                  )}
                  <span className="truncate">{channel.name}</span>
                  {isTyping && (
                    <div className="flex space-x-0.5 ml-auto">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-gray-400 text-sm font-medium">Direct Messages</h3>
            <button className="text-gray-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {workspaceUsers.slice(0, 5).map((userItem: any) => {
              const isTyping = isUserTypingInDM(userItem._id);
              return (
                <button
                  key={userItem._id}
                  onClick={() => handleDMUserClick(userItem)}
                  className="w-full flex items-center space-x-2 px-2 py-1 rounded text-sm text-gray-300 hover:bg-gray-700 transition-colors"
                >
                  {getStatusIcon(userItem.status)}
                  <span className="truncate">{userItem.username}</span>
                  {isTyping && (
                    <div className="flex space-x-0.5 ml-auto">
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* User Profile Section at Bottom */}
      <div className="border-t border-gray-700 p-3">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowProfileModal(true)}
            className="flex items-center space-x-3 flex-1 text-left hover:bg-gray-700 rounded p-1 transition-colors"
          >
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-sm font-bold">
              {user?.avatar ? (
                <img src={user.avatar} alt="User avatar" className="w-8 h-8 rounded-lg object-cover" />
              ) : (
                user?.username?.charAt(0)?.toUpperCase() || 'U'
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{user?.username}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
            </div>
          </button>
          <button
            onClick={handleLogout}
            className="p-1 text-gray-400 hover:text-white transition-colors"
            title="Logout"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create Channel</h2>
            <form onSubmit={handleCreateChannel} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="e.g. marketing"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 text-gray-900"
                  placeholder="What's this channel about?"
                  rows={3}
                />
              </div>
              
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="private"
                  checked={newChannelPrivate}
                  onChange={(e) => setNewChannelPrivate(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="private" className="text-sm text-gray-700">
                  Make private
                </label>
              </div>
              
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium"
                  disabled={loading}
                >
                  Create Channel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateChannel(false);
                    setNewChannelName('');
                    setNewChannelDescription('');
                    setNewChannelPrivate(false);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900">Profile</h2>
              <button
                onClick={() => {
                  setShowProfileModal(false);
                  setAvatarFile(null);
                  setAvatarPreview(null);
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {/* Current Avatar */}
              <div className="text-center">
                <div className="w-20 h-20 bg-purple-600 rounded-full flex items-center justify-center text-2xl font-bold text-white mx-auto mb-2">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="w-20 h-20 rounded-full object-cover" />
                  ) : user?.avatar ? (
                    <img src={user.avatar} alt="Current avatar" className="w-20 h-20 rounded-full object-cover" />
                  ) : (
                    user?.username?.charAt(0)?.toUpperCase() || 'U'
                  )}
                </div>
                <p className="text-sm text-gray-600">{user?.username}</p>
              </div>

              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Avatar
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 pt-4">
                <button
                  onClick={handleAvatarUpload}
                  disabled={!avatarFile || loading}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium"
                >
                  {loading ? 'Uploading...' : 'Update Avatar'}
                </button>
                <button
                  onClick={() => {
                    setShowProfileModal(false);
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Org Brain Sidebar */}
      <OrgBrainSidebar 
        isOpen={showOrgBrain} 
        onClose={() => setShowOrgBrain(false)} 
      />
    </div>
  );
}

export default Sidebar;
