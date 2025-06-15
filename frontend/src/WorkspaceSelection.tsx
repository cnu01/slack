import { useState, useEffect } from 'react';
import { 
  Plus, 
  Users, 
  ArrowRight, 
  LogOut, 
  Building2,
  Globe,
  Lock,
  UserPlus,
  Search,
  Sparkles,
  Crown
} from 'lucide-react';

interface Workspace {
  _id: string;
  name: string;
  description?: string;
  owner: {
    _id: string;
    username: string;
  };
  memberCount: number;
  isMember: boolean;
  isOwner: boolean;
  isPublic: boolean;
  createdAt: string;
}

interface User {
  _id: string;
  username: string;
  email: string;
  profession: string;
}

interface WorkspaceSelectionProps {
  user: User;
  onWorkspaceSelect: (workspaceId: string) => void;
  onLogout: () => void;
}

function WorkspaceSelection({ user, onWorkspaceSelect, onLogout }: WorkspaceSelectionProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [newWorkspace, setNewWorkspace] = useState({
    name: '',
    description: '',
    isPublic: true
  });
  const [joinCode, setJoinCode] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      if (res.ok) {
        setWorkspaces(data.workspaces || []);
      }
    } catch (error) {
      console.error('Error fetching workspaces:', error);
    } finally {
      setLoading(false);
    }
  };

  const createWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(newWorkspace),
      });
      
      if (res.ok) {
        setShowCreateModal(false);
        setNewWorkspace({ name: '', description: '', isPublic: true });
        fetchWorkspaces();
      }
    } catch (error) {
      console.error('Error creating workspace:', error);
    }
  };

  const filteredWorkspaces = workspaces.filter(workspace =>
    workspace.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    workspace.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isOwner = (workspace: Workspace) => workspace.isOwner;

  const joinWorkspace = async (workspaceId: string) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:5001/api/workspaces/${workspaceId}/join`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (res.ok) {
        // Refresh workspaces list after joining
        fetchWorkspaces();
      } else {
        const error = await res.json();
        console.error('Join workspace error:', error);
      }
    } catch (error) {
      console.error('Error joining workspace:', error);
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="bg-purple-600 p-2 rounded-md">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Welcome back, {user.username}!</h1>
              <p className="text-sm text-gray-500">{user.profession} • {user.email}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center space-x-1.5 bg-white hover:bg-gray-50 text-gray-600 px-3 py-1.5 rounded-md border border-gray-300 transition-all text-sm"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Logout</span>
          </button>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-3 mb-6">
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-1.5 bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-all text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create Workspace</span>
          </button>
          <button
            onClick={() => setShowJoinModal(true)}
            className="flex items-center space-x-1.5 bg-white hover:bg-gray-50 text-gray-600 px-4 py-2 rounded-md border border-gray-300 transition-all text-sm font-medium"
          >
            <UserPlus className="w-4 h-4" />
            <span>Join Workspace</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-6 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search workspaces..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all"
          />
        </div>

        {/* Workspaces Grid */}
        {filteredWorkspaces.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              {workspaces.length === 0 ? "No workspaces yet" : "No workspaces found"}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {workspaces.length === 0 
                ? "Create your first workspace to get started"
                : "Try adjusting your search terms"
              }
            </p>
            {workspaces.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-all text-sm font-medium"
              >
                Create Your First Workspace
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkspaces.map((workspace) => (
              <div
                key={workspace._id}
                className="bg-white rounded-md border border-gray-200 p-4 hover:border-purple-300 hover:shadow-sm transition-all group"
              >
                {/* Header */}
                <div className="mb-3">
                  <div className="flex items-center space-x-1.5 mb-1.5">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {workspace.name}
                    </h3>
                    {isOwner(workspace) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-700">
                        <Crown className="w-2.5 h-2.5 mr-0.5" />
                        Owner
                      </span>
                    )}
                    {workspace.isMember && !isOwner(workspace) && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-700">
                        Member
                      </span>
                    )}
                  </div>
                  {workspace.description && (
                    <p className="text-gray-500 text-xs line-clamp-2 mb-2">
                      {workspace.description}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-3 mb-3 text-xs">
                  <div className="flex items-center space-x-1 text-gray-400">
                    <Users className="w-3 h-3" />
                    <span>{workspace.memberCount}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-gray-400">
                    {workspace.isPublic ? (
                      <>
                        <Globe className="w-3 h-3" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-3 h-3" />
                        <span>Private</span>
                      </>
                    )}
                  </div>
                  <span className="text-gray-300 ml-auto">
                    {formatDate(workspace.createdAt)}
                  </span>
                </div>

                {/* Action Button */}
                <div className="flex space-x-1.5">
                  {workspace.isMember ? (
                    // User is already a member - can enter
                    <button
                      onClick={() => onWorkspaceSelect(workspace._id)}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center justify-center"
                    >
                      <span>Open</span>
                      <ArrowRight className="ml-1 w-3 h-3" />
                    </button>
                  ) : (
                    // User is not a member - needs to join
                    <button
                      onClick={() => joinWorkspace(workspace._id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded text-sm font-medium transition-all flex items-center justify-center"
                    >
                      <UserPlus className="mr-1 w-3 h-3" />
                      <span>Join</span>
                    </button>
                  )}
                  
                  {isOwner(workspace) && (
                    <button
                      className="bg-gray-100 hover:bg-gray-200 text-gray-500 px-2 py-1.5 rounded transition-all"
                      title="Settings"
                    >
                      <span className="text-sm">⚙️</span>
                    </button>
                  )}
                </div>

                {/* Owner Info */}
                <div className="mt-2 pt-2 border-t border-gray-100">
                  <p className="text-xs text-gray-400">
                    by <span className="font-medium text-gray-500">{workspace.owner.username}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create Workspace Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Create New Workspace</h2>
            <form onSubmit={createWorkspace} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace Name *
                </label>
                <input
                  type="text"
                  value={newWorkspace.name}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter workspace name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={newWorkspace.description}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all resize-none"
                  placeholder="Describe your workspace (optional)"
                  rows={2}
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isPublic"
                  checked={newWorkspace.isPublic}
                  onChange={(e) => setNewWorkspace(prev => ({ ...prev, isPublic: e.target.checked }))}
                  className="w-3.5 h-3.5 text-purple-600 bg-white border-gray-300 rounded focus:ring-purple-500"
                />
                <label htmlFor="isPublic" className="text-sm text-gray-700">
                  Make this workspace public
                </label>
              </div>
              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 rounded-md border border-gray-300 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all text-sm font-medium"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Join Workspace Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl p-5 w-full max-w-sm">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Join Workspace</h2>
            <form className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workspace Invite Code
                </label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter invite code"
                />
              </div>
              <div className="flex space-x-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-3 py-2 bg-white hover:bg-gray-50 text-gray-600 rounded-md border border-gray-300 transition-all text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-all text-sm font-medium"
                >
                  Join
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkspaceSelection;
