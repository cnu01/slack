import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import WorkspaceSelection from '../WorkspaceSelection';

interface User {
  _id: string;
  username: string;
  email: string;
  profession: string;
}

function WorkspacesPage() {
  const navigate = useNavigate();
  const { currentWorkspace, currentChannel } = useAppStore();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    if (!token) {
      navigate('/auth');
      return;
    }

    // If we have a persisted workspace (and optionally channel), redirect there
    if (currentWorkspace) {
      if (currentChannel) {
        navigate(`/workspace/${currentWorkspace._id}/channel/${currentChannel._id}`, { replace: true });
      } else {
        navigate(`/workspace/${currentWorkspace._id}`, { replace: true });
      }
      return;
    }

    if (savedUser) {
      try {
        const userData = JSON.parse(savedUser);
        setUser(userData);
        setLoading(false);
      } catch (error) {
        console.error('Error parsing saved user:', error);
        localStorage.removeItem('user');
        navigate('/auth');
      }
    } else {
      // Try to fetch user profile from backend
      fetchUserProfile();
    }
  }, [navigate, currentWorkspace, currentChannel]);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        navigate('/auth');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      navigate('/auth');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/auth');
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    // Store selected workspace and navigate to main app
    localStorage.setItem('selectedWorkspace', workspaceId);
    navigate(`/workspace/${workspaceId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="w-12 h-12 border-3 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null; // This shouldn't happen, but just in case
  }

  return (
    <WorkspaceSelection
      user={user}
      onWorkspaceSelect={handleWorkspaceSelect}
      onLogout={handleLogout}
    />
  );
}

export default WorkspacesPage;
