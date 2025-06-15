import { Hash, Lock, ChevronDown, Plus, Circle, MessageSquare, Activity, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socketClient';
import { useEffect, useState } from 'react';

function Sidebar() {
  const { 
    user,
    currentWorkspace, 
    channels, 
    setChannels, 
    currentChannel, 
    setCurrentChannel,
    sidebarCollapsed,
    currentView,
    setCurrentView,
    onlineUsers,
    updateUserPresence
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [channelsLoaded, setChannelsLoaded] = useState(false);
  const [showCreateChannel, setShowCreateChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [newChannelPrivate, setNewChannelPrivate] = useState(false);
  const [workspaceUsers, setWorkspaceUsers] = useState<any[]>([]);

  useEffect(() => {
    if (currentWorkspace && !channelsLoaded) {
      loadChannels();
      loadWorkspaceUsers();
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

  const loadChannels = async () => {
    if (!currentWorkspace || channelsLoaded) return;
    
    try {
      setLoading(true);
      const response = await apiClient.getChannels(currentWorkspace._id);
      setChannels(response.channels);
      
      // Auto-select general channel if no channel is selected
      if (!currentChannel && response.channels.length > 0) {
        const generalChannel = response.channels.find((ch: any) => ch.name === 'general');
        if (generalChannel) {
          setCurrentChannel(generalChannel);
        }
      }
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
      // For now, create mock users based on workspace members
      // In a real app, you'd fetch this from an API
      const mockUsers = [
        { _id: user?._id, username: user?.username, status: 'online', profession: user?.profession },
        { _id: '2', username: 'john_doe', status: 'online', profession: 'Developer' },
        { _id: '3', username: 'jane_smith', status: 'away', profession: 'Designer' },
        { _id: '4', username: 'mike_wilson', status: 'offline', profession: 'Manager' },
        { _id: '5', username: 'sarah_jones', status: 'online', profession: 'Analyst' },
      ].filter(Boolean);
      
      setWorkspaceUsers(mockUsers);
    } catch (error) {
      console.error('Failed to load workspace users:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    socketClient.disconnect();
    window.location.href = '/auth';
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
    <div className="w-64 text-white flex flex-col h-full" style={{ backgroundColor: '#4A154B' }}>
      {/* Workspace Header */}
      <div className="p-4 border-b border-white border-opacity-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg text-white">{currentWorkspace?.name}</h1>
            <div className="flex items-center space-x-1 text-white text-opacity-80 text-sm">
              <Circle className="w-2 h-2 fill-green-400 text-green-400" />
              <span>{Object.values(onlineUsers).filter(user => user.status === 'online').length} online</span>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-white text-opacity-60" />
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto">
        {/* Threads */}
        <div className="p-2">
          <button
            onClick={() => setCurrentView('threads')}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              currentView === 'threads' 
                ? 'bg-white bg-opacity-10 text-white' 
                : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
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
              currentView === 'activity' 
                ? 'bg-white bg-opacity-10 text-white' 
                : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Activity</span>
          </button>
        </div>

        {/* Channels Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-opacity-80 text-sm font-medium">Channels</h3>
            <button
              onClick={() => setShowCreateChannel(true)}
              className="text-white text-opacity-60 hover:text-white hover:bg-white hover:bg-opacity-10 p-1 rounded transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {channels.map((channel: any) => (
              <button
                key={channel._id}
                onClick={() => handleChannelClick(channel)}
                className={`w-full flex items-center space-x-2 px-2 py-1 rounded text-sm transition-colors ${
                  currentChannel?._id === channel._id 
                    ? 'bg-white bg-opacity-10 text-white' 
                    : 'text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white'
                }`}
              >
                {channel.isPrivate ? (
                  <Lock className="w-4 h-4 text-white text-opacity-60" />
                ) : (
                  <Hash className="w-4 h-4 text-white text-opacity-60" />
                )}
                <span className="truncate">{channel.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Direct Messages Section */}
        <div className="px-4 py-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white text-opacity-80 text-sm font-medium">Direct Messages</h3>
            <button className="text-white text-opacity-60 hover:text-white hover:bg-white hover:bg-opacity-10 p-1 rounded transition-colors">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          
          <div className="space-y-1">
            {workspaceUsers.slice(0, 5).map((userItem: any) => (
              <button
                key={userItem._id}
                onClick={() => setCurrentView('dms')}
                className="w-full flex items-center space-x-2 px-2 py-1 rounded text-sm text-white text-opacity-80 hover:bg-white hover:bg-opacity-10 hover:text-white transition-colors"
              >
                {getStatusIcon(userItem.status)}
                <span className="truncate">{userItem.username}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile Section at Bottom */}
      <div className="border-t border-white border-opacity-10 p-3">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center text-sm font-bold text-white">
            {user?.username?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username}</p>
            <p className="text-xs text-white text-opacity-60 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-1 text-white text-opacity-60 hover:text-white hover:bg-white hover:bg-opacity-10 rounded transition-colors"
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
                  className="flex-1 text-white px-4 py-2 rounded-lg font-medium transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#1264A3' }}
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
    </div>
  );
}

export default Sidebar;
