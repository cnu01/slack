import { Menu, Bell, User, LogOut } from 'lucide-react';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';

function Header() {
  const { user, toggleSidebar, logout } = useAppStore();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logout();
    localStorage.clear();
    navigate('/auth');
  };

  const getInitials = (username: string) => {
    return username?.charAt(0).toUpperCase() || 'U';
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowUserMenu(false);
      setShowNotifications(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={toggleSidebar}
            className="text-gray-500 hover:text-gray-700 p-1"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative">
            <button 
              onClick={(e) => {
                e.stopPropagation();
                setShowNotifications(!showNotifications);
              }}
              className="text-gray-500 hover:text-gray-700 p-2 relative"
            >
              <Bell className="w-5 h-5" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full text-xs text-white flex items-center justify-center">
                3
              </div>
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <div className="px-4 py-2 border-b border-gray-100">
                  <h3 className="font-medium text-gray-900">Notifications</h3>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Welcome to MISOGIAI!</div>
                    <div className="text-xs text-gray-500 mt-1">You've joined the workspace</div>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <div className="text-sm text-gray-900">#general channel created</div>
                    <div className="text-xs text-gray-500 mt-1">Default channel is ready</div>
                  </div>
                  <div className="px-4 py-3 hover:bg-gray-50">
                    <div className="text-sm text-gray-900">Start messaging!</div>
                    <div className="text-xs text-gray-500 mt-1">Your Slack clone is ready to use</div>
                  </div>
                </div>
                <div className="px-4 py-2 border-t border-gray-100">
                  <button className="text-xs text-purple-600 hover:text-purple-700">
                    Mark all as read
                  </button>
                </div>
              </div>
            )}
          </div>
          
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUserMenu(!showUserMenu);
              }}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-medium text-sm">
                {getInitials(user?.username || '')}
              </div>
              <span className="hidden md:block font-medium">{user?.username}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <div className="px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-medium">
                      {getInitials(user?.username || '')}
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user?.username}</div>
                      <div className="text-sm text-gray-500">{user?.profession}</div>
                      <div className="text-xs text-gray-400">{user?.email}</div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    // TODO: Implement profile modal
                    alert('Profile editing coming in Phase 4!');
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center"
                >
                  <User className="w-4 h-4 mr-2" />
                  Edit Profile
                </button>
                <div className="border-t border-gray-100 my-1"></div>
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
