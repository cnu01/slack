import { Hash, Lock, ChevronDown, Plus, Circle, MessageCircle, Activity, MessageSquare, User, LogOut, Settings } from 'lucide-react';
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
    updateUserPresence,
    setAuth
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

  const handleChannelSelect = async (channel: any) => {
    if (!channel.isMember && channel.isPrivate) {
      // Try to join the channel first
      try {
        await apiClient.joinChannel(currentWorkspace!._id, channel._id);
        // Reload channels to get updated membership status
        await loadChannels();
      } catch (error) {
        console.error('Failed to join channel:', error);
        return;
      }
    }
    setCurrentChannel(channel);
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
    <div className="w-64 bg-gray-800 text-white flex flex-col">
      {/* Workspace Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">{currentWorkspace?.name}</h1>
            <div className="flex items-center space-x-3 text-gray-400 text-sm">
              <span>{channels.length} channels</span>
              <div className="flex items-center space-x-1">
                <Circle className="w-2 h-2 fill-green-400 text-green-400" />
                {/* <span>{Object.values(onlineUsers).filter(user => user.status === 'online').length} online</span> */}
              </div>
            </div>
          </div>
          <ChevronDown className="w-5 h-5 text-gray-400" />
        </div>
      </div>

      {/* Navigation */}
      <div className="p-4 space-y-2">
        <button
          onClick={() => setCurrentView('channels')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'channels' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Channels
        </button>
        <button
          onClick={() => setCurrentView('dms')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'dms' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Direct Messages
        </button>
        <button
          onClick={() => setCurrentView('activity')}
          className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            currentView === 'activity' ? 'bg-purple-600 text-white' : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Activity
        </button>
      </div>

      {/* Navigation Views */}
      {currentView === 'channels' && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-300 font-medium text-sm">Channels</h2>
              <button
                onClick={() => setShowCreateChannel(true)}
                className="text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {loading ? (
              <div className="text-gray-400 text-sm px-3 py-2">Loading channels...</div>
            ) : (
              <div className="space-y-1">
                {channels.map((channel: any) => (
                  <button
                    key={channel._id}
                    onClick={() => handleChannelSelect(channel)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors flex items-center ${
                      currentChannel?._id === channel._id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {channel.isPrivate ? (
                      <Lock className="w-4 h-4 mr-2" />
                    ) : (
                      <Hash className="w-4 h-4 mr-2" />
                    )}
                    <span className="truncate">{channel.name}</span>
                    {!channel.isMember && (
                      <div className="ml-auto">
                        <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Direct Messages View */}
      {currentView === 'dms' && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-gray-300 font-medium text-sm">Direct Messages</h2>
              <button className="text-gray-400 hover:text-white">
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="text-gray-400 text-sm px-3 py-8 text-center">
              <p>🚧 Direct Messages</p>
              <p className="text-xs mt-2">Coming in Phase 4</p>
            </div>
          </div>
        </div>
      )}

      {/* Activity View */}
      {currentView === 'activity' && (
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2">
            <h2 className="text-gray-300 font-medium text-sm mb-3">Activity</h2>
            <div className="text-gray-400 text-sm px-3 py-8 text-center">
              <p>📊 Activity Feed</p>
              <p className="text-xs mt-2">Coming in Phase 4</p>
            </div>
          </div>
        </div>
      )}

      {/* Create Channel Modal */}
      {showCreateChannel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-full mx-4 shadow-2xl">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create Channel</h2>
            <form onSubmit={handleCreateChannel}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900 bg-white"
                  placeholder="e.g. marketing"
                  required
                  autoFocus
                />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:border-transparent text-gray-900 bg-white resize-none"
                  rows={3}
                  placeholder="What's this channel about?"
                />
              </div>
              <div className="mb-6">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newChannelPrivate}
                    onChange={(e) => setNewChannelPrivate(e.target.checked)}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Make private</span>
                </label>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateChannel(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                >
                  Create Channel
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
