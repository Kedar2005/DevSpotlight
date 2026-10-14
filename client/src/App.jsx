import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";

import { AuthLayout } from "./components/layout/AuthLayout";
import { MainLayout } from "./components/layout/MainLayout";
import { AdminLayout } from "./components/layout/AdminLayout";

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

// Admin Pages
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AdminUsers } from "./pages/admin/AdminUsers";
import { AdminProjects } from "./pages/admin/AdminProjects";
import { AdminColleges } from "./pages/admin/AdminColleges";
import AdminHackathons from "./pages/admin/AdminHackathons";
import AdminHackathonRooms from "./pages/admin/AdminHackathonRooms";
import AdminReports from "./pages/admin/AdminReports";
import AdminSettings from "./pages/admin/AdminSettings";

// Hackathon Pages
import HackathonDiscovery from "./pages/hackathons/HackathonDiscovery";
import HackathonDetails from "./pages/hackathons/HackathonDetails";
import HackathonRoom from "./pages/hackathons/HackathonRoom";
import HackathonProjectSubmission from "./pages/hackathons/HackathonProjectSubmission";
import PublicHackathonShowcase from "./pages/hackathons/PublicHackathonShowcase";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
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
        {/* Main Application Layout (Student & Public) */}
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

          {/* Hackathons Discovery & Public Showcase */}
          <Route path="/hackathons" element={<HackathonDiscovery />} />
          <Route path="/hackathon/:id" element={<HackathonDetails />} />
          <Route path="/hackathons/showcase" element={<PublicHackathonShowcase />} />

          {/* Private Hackathon Room & Project Submission */}
          <Route path="/hackathon/room/:roomId" element={<ProtectedRoute><HackathonRoom /></ProtectedRoute>} />
          <Route path="/hackathon/room/:roomId/submit" element={<ProtectedRoute><HackathonProjectSubmission /></ProtectedRoute>} />
        </Route>

        {/* Admin Dashboard Protected Routes */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="colleges" element={<AdminColleges />} />
          <Route path="hackathons" element={<AdminHackathons />} />
          <Route path="rooms" element={<AdminHackathonRooms />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="settings" element={<AdminSettings />} />
        </Route>
        
        {/* Auth Layout */}
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
