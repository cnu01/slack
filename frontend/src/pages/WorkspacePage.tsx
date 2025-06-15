import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { apiClient } from '../lib/api';
import { socketClient } from '../lib/socketClient';
import Sidebar from '../components/Sidebar';
import MessagingArea from '../components/MessagingArea';
import ThreadsView from '../components/ThreadsView';
import ActivityView from '../components/ActivityView';
import DirectMessagesView from '../components/DirectMessagesView';

function WorkspacePage() {
  const { workspaceId, channelId, userId } = useParams<{ workspaceId: string; channelId?: string; userId?: string }>();
  const navigate = useNavigate();
  const { 
    user, 
    token, 
    setAuth, 
    setCurrentWorkspace,
    currentChannel,
    setCurrentChannel,
    currentDMUser,
    setCurrentDMUser,
    updateUserPresence,
    currentView,
    setCurrentView,
    sidebarCollapsed,
    workspaceUsers
  } = useAppStore();
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const initializeWorkspace = async () => {
      if (initialized) return;
      
      try {
        const savedToken = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        
        if (!savedToken || !savedUser) {
          navigate('/auth');
          return;
        }

        // Set auth if not already set
        if (!user || !token) {
          const userData = JSON.parse(savedUser);
          setAuth(userData, savedToken);
        }

        // Verify token and get user profile
        const profile = await apiClient.getProfile();
        setAuth(profile.user, savedToken);

        // Get workspace details
        const workspacesResponse = await apiClient.getWorkspaces();
        const workspace = workspacesResponse.workspaces.find((w: any) => w._id === workspaceId);
        
        if (!workspace) {
          setError('Workspace not found');
          return;
        }

        // Set workspace and load channels
        setCurrentWorkspace(workspace);
        
        // Load channels and handle channel/DM selection properly
        const channelsResponse = await apiClient.getChannels(workspace._id);
        
        // Load workspace users (needed for both DM and channel routing)
        let users = workspaceUsers;
        if (users.length === 0) {
          const usersResponse = await apiClient.getWorkspaceUsers(workspace._id);
          users = usersResponse.users;
        }

        // Handle DM routing
        if (userId) {
          const targetUser = users.find((u: any) => u._id === userId);
          if (targetUser) {
            console.log('Setting DM user from URL:', targetUser.username);
            setCurrentDMUser(targetUser);
            setCurrentView('dms');
            // Clear current channel when in DM mode
            setCurrentChannel(null);
          } else {
            // User ID in URL doesn't exist, redirect to general channel
            const generalChannel = channelsResponse.channels.find((ch: any) => ch.name === 'general');
            const defaultChannel = generalChannel || channelsResponse.channels[0];
            setCurrentChannel(defaultChannel);
            setCurrentView('channels');
            setCurrentDMUser(null);
            navigate(`/workspace/${workspaceId}/channel/${defaultChannel._id}`, { replace: true });
          }
        }
        // Handle channel routing OR check for persisted DM
        else if (channelsResponse.channels.length > 0) {
          let targetChannel = null;
          
          // Priority 1: If we have a channelId in URL, use that
          if (channelId) {
            targetChannel = channelsResponse.channels.find((ch: any) => ch._id === channelId);
            if (targetChannel) {
              console.log('Setting channel from URL:', targetChannel.name);
              setCurrentChannel(targetChannel);
              setCurrentView('channels');
              // Clear DM user when in channel mode
              setCurrentDMUser(null);
            } else {
              // Channel ID in URL doesn't exist, redirect to general
              const generalChannel = channelsResponse.channels.find((ch: any) => ch.name === 'general');
              const defaultChannel = generalChannel || channelsResponse.channels[0];
              setCurrentChannel(defaultChannel);
              setCurrentView('channels');
              setCurrentDMUser(null);
              navigate(`/workspace/${workspaceId}/channel/${defaultChannel._id}`, { replace: true });
            }
          }
          // Priority 2: If no channelId in URL but we have a persisted DM user, restore that
          else if (currentDMUser) {
            const targetUser = users.find((u: any) => u._id === currentDMUser._id);
            if (targetUser) {
              console.log('Restoring persisted DM with:', targetUser.username);
              setCurrentDMUser(targetUser);
              setCurrentView('dms');
              setCurrentChannel(null);
              navigate(`/workspace/${workspaceId}/dm/${targetUser._id}`, { replace: true });
            } else {
              // Persisted DM user doesn't exist anymore, fall back to general channel
              const generalChannel = channelsResponse.channels.find((ch: any) => ch.name === 'general');
              const defaultChannel = generalChannel || channelsResponse.channels[0];
              setCurrentChannel(defaultChannel);
              setCurrentView('channels');
              setCurrentDMUser(null);
              navigate(`/workspace/${workspaceId}/channel/${defaultChannel._id}`, { replace: true });
            }
          }
          // Priority 3: If no channelId in URL and no persisted DM, but we have a persisted channel, verify it exists
          else if (currentChannel) {
            targetChannel = channelsResponse.channels.find((ch: any) => ch._id === currentChannel._id);
            if (targetChannel) {
              console.log('Using persisted channel:', targetChannel.name);
              setCurrentView('channels');
              navigate(`/workspace/${workspaceId}/channel/${targetChannel._id}`, { replace: true });
            } else {
              // Stored channel doesn't exist anymore, fall back to general
              const generalChannel = channelsResponse.channels.find((ch: any) => ch.name === 'general');
              const defaultChannel = generalChannel || channelsResponse.channels[0];
              setCurrentChannel(defaultChannel);
              setCurrentView('channels');
              navigate(`/workspace/${workspaceId}/channel/${defaultChannel._id}`, { replace: true });
            }
          }
          // Priority 4: No specific routing info, auto-select general channel
          else {
            const generalChannel = channelsResponse.channels.find((ch: any) => ch.name === 'general');
            const defaultChannel = generalChannel || channelsResponse.channels[0];
            console.log('Auto-selecting default channel:', defaultChannel.name);
            setCurrentChannel(defaultChannel);
            setCurrentView('channels');
            navigate(`/workspace/${workspaceId}/channel/${defaultChannel._id}`, { replace: true });
          }
        }
        
        setInitialized(true);

        // Initialize Socket.IO connection for real-time messaging ONLY
        if (savedToken && profile.user) {
          console.log('Connecting to Socket.IO for real-time messaging...');
          socketClient.connect(savedToken, profile.user);
          socketClient.joinWorkspace(workspace._id);
          
          // Set up presence updates
          socketClient.onPresenceUpdate((presence) => {
            updateUserPresence(presence.userId, presence.username, presence.status, presence.lastSeen);
          });
          
          // Set up initial workspace presence
          socketClient.onWorkspacePresence((users) => {
            users.forEach(user => {
              updateUserPresence(user.userId, user.username, user.status, user.lastSeen);
            });
          });
        }
      } catch (error) {
        console.error('Initialization error:', error);
        localStorage.clear();
        navigate('/auth');
      } finally {
        setLoading(false);
      }
    };

    if (workspaceId && !initialized) {
      initializeWorkspace();
    }
  }, [workspaceId, channelId, navigate, initialized, currentChannel]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/workspaces')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex bg-gray-50">
      {!sidebarCollapsed && <Sidebar />}
      {/* Main Content Area */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {currentView === 'threads' && <ThreadsView />}
        {currentView === 'activity' && <ActivityView />}
        {currentView === 'dms' && <DirectMessagesView />}
        {currentView === 'channels' && <MessagingArea />}
        {!currentView && <MessagingArea />} {/* Default to messaging */}
      </div>
    </div>
  );
}

export default WorkspacePage;
