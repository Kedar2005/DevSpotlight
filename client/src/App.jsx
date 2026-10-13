import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import { AuthLayout } from "./components/layout/AuthLayout";
import { MainLayout } from "./components/layout/MainLayout";

import { Home } from "./pages/Home";
import { ProjectFeed } from "./pages/ProjectFeed";
import { ProjectDetails } from "./pages/ProjectDetails";
import { Dashboard } from "./pages/Dashboard";
import { Profile } from "./pages/Profile";
import { CreateProject } from "./pages/CreateProject";
import { Notifications } from "./pages/Notifications";
import { CollaborationRequests } from "./pages/CollaborationRequests";
import { EditProject } from "./pages/EditProject";
import { PublicProfile } from "./pages/PublicProfile";
import { Workspace } from "./pages/Workspace";
import { FindTeammates } from "./pages/FindTeammates";
import { Login } from "./pages/auth/Login";
import { Register } from "./pages/auth/Register";
import { ForgotPassword } from "./pages/auth/ForgotPassword";
import { ResetPassword } from "./pages/auth/ResetPassword";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/feed" element={<ProjectFeed />} />
          <Route path="/project/:id" element={<ProjectDetails />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/create-project" element={<ProtectedRoute><CreateProject /></ProtectedRoute>} />
          <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
          <Route path="/requests" element={<ProtectedRoute><CollaborationRequests /></ProtectedRoute>} />
          <Route path="/find-teammates" element={<ProtectedRoute><FindTeammates /></ProtectedRoute>} />
          <Route path="/workspace/:projectId" element={<ProtectedRoute><Workspace /></ProtectedRoute>} />
          <Route path="/project/:id/edit" element={<ProtectedRoute><EditProject /></ProtectedRoute>} />
          <Route path="/explore" element={<Navigate to="/feed" replace />} />
          <Route path="/settings" element={<ProtectedRoute><Navigate to="/profile" replace /></ProtectedRoute>} />
          <Route path="/project/new" element={<Navigate to="/create-project" replace />} />
          <Route path="/u/:userName" element={<PublicProfile />} />
        </Route>
        
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
          <Route path="/reset-password" element={<ResetPassword />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
