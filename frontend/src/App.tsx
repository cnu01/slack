import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AuthPage from './pages/AuthPage';
import WorkspacesPage from './pages/WorkspacesPage';
import WorkspacePage from './pages/WorkspacePage';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/auth" element={<AuthPage />} />
        
        {/* Protected Routes */}
        <Route path="/workspaces" element={
          <ProtectedRoute>
            <WorkspacesPage />
          </ProtectedRoute>
        } />
        
        <Route path="/workspace/:workspaceId" element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        } />
        
        <Route path="/workspace/:workspaceId/channel/:channelId" element={
          <ProtectedRoute>
            <WorkspacePage />
          </ProtectedRoute>
        } />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/workspaces" replace />} />
        
        {/* Catch all - redirect to workspaces */}
        <Route path="*" element={<Navigate to="/workspaces" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
