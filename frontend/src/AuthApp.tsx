import { useState, useEffect } from 'react';
import { Mail, Lock, User, Briefcase, ArrowRight, Sparkles, Eye, EyeOff } from 'lucide-react';
import WorkspaceSelection from './WorkspaceSelection';

interface FormData {
  email: string;
  password: string;
  username: string;
  profession: string;
}

interface AuthUser {
  _id: string;
  username: string;
  email: string;
  profession: string;
}

function App() {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    username: '',
    profession: ''
  });
  const [isLogin, setIsLogin] = useState(true);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [selectedWorkspace, setSelectedWorkspace] = useState<string | null>(null);

  const professions = [
    'Software Engineer',
    'Product Manager',
    'Designer',
    'Data Scientist',
    'Marketing Manager',
    'Sales Manager',
    'DevOps Engineer',
    'QA Engineer',
    'Business Analyst',
    'Project Manager',
    'Content Creator',
    'Customer Success',
    'HR Manager',
    'Finance Manager',
    'Operations Manager',
    'Other'
  ];

  useEffect(() => {
    // Check if user is already authenticated
    const token = localStorage.getItem('token');
    if (token) {
      // Try to get user info from backend to verify token
      fetchUserProfile();
    }
  }, []);

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
        setCurrentUser(data.user);
        setIsAuthenticated(true);
      } else {
        // Token is invalid, remove it
        localStorage.removeItem('token');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      localStorage.removeItem('token');
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const url = isLogin ? '/api/auth/login' : '/api/auth/register';
      const body = isLogin 
        ? { email: formData.email, password: formData.password }
        : formData;

      const res = await fetch(`http://localhost:5001${url}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      setResponse(data);
      
      if (data.token) {
        localStorage.setItem('token', data.token);
        setIsAuthenticated(true);
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Error:', error);
      setResponse({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setCurrentUser(null);
    setSelectedWorkspace(null);
    setFormData({ email: '', password: '', username: '', profession: '' });
    setResponse(null);
  };

  const handleWorkspaceSelect = (workspaceId: string) => {
    setSelectedWorkspace(workspaceId);
    // TODO: Navigate to main Slack interface
    console.log('Selected workspace:', workspaceId);
  };

  // If user is authenticated and has selected a workspace, show main app
  if (isAuthenticated && selectedWorkspace) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-900">Main Slack Interface</h1>
          <p className="mb-4 text-gray-600">Workspace ID: {selectedWorkspace}</p>
          <button
            onClick={() => setSelectedWorkspace(null)}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Workspaces
          </button>
        </div>
      </div>
    );
  }

  // If user is authenticated but hasn't selected workspace, show workspace selection
  if (isAuthenticated && currentUser) {
    return (
      <WorkspaceSelection
        user={currentUser}
        onWorkspaceSelect={handleWorkspaceSelect}
        onLogout={handleLogout}
      />
    );
  }

  const testWorkspaces = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5001/api/workspaces', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const data = await res.json();
      setResponse(data);
    } catch (error) {
      console.error('Error:', error);
      setResponse({ error: 'Network error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="relative w-full max-w-md">
        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg border border-gray-200 p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-purple-600 p-3 rounded-lg">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              slack
            </h1>
            <p className="text-gray-600">
              {isLogin ? 'Sign in to your workspace' : 'Join your team on Slack'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            {/* Username Field (Register only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    placeholder="Choose your username"
                    required
                  />
                </div>
              </div>
            )}

            {/* Profession Field (Register only) */}
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-sm font-medium text-gray-700">Profession</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    name="profession"
                    value={formData.profession}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all appearance-none bg-white"
                    required
                  >
                    <option value="">Select your profession</option>
                    {professions.map(profession => (
                      <option key={profession} value={profession}>
                        {profession}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full pl-12 pr-12 py-3 border border-gray-300 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-purple-600 text-white font-medium py-3 px-6 rounded-lg hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Auth Mode */}
          <div className="mt-6 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setResponse(null);
                setFormData({ email: '', password: '', username: '', profession: '' });
              }}
              className="text-purple-600 hover:text-purple-700 transition-colors text-sm"
            >
              {isLogin 
                ? "Don't have an account? Sign up" 
                : "Already have an account? Sign in"
              }
            </button>
          </div>

          {/* Test Button (for authenticated users) */}
          {localStorage.getItem('token') && (
            <div className="mt-4">
              <button
                onClick={testWorkspaces}
                disabled={loading}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-6 rounded-lg border border-gray-300 transition-all disabled:opacity-50"
              >
                {loading ? 'Loading...' : 'Test Workspaces API'}
              </button>
            </div>
          )}

          {/* Response Display */}
          {response && (
            <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-xs text-gray-600 mb-2">API Response:</div>
              <pre className="text-xs text-gray-800 overflow-auto max-h-40 whitespace-pre-wrap">
                {JSON.stringify(response, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
