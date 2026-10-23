import { lazy } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from "react-router-dom";
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

// Admin and hackathon pages load on demand, so most visitors never download them.
// The layouts wrap their <Outlet /> in <Suspense>.
const AdminOverview = lazy(() => import("./pages/admin/AdminOverview").then((m) => ({ default: m.AdminOverview })));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers").then((m) => ({ default: m.AdminUsers })));
const AdminProjects = lazy(() => import("./pages/admin/AdminProjects").then((m) => ({ default: m.AdminProjects })));
const AdminColleges = lazy(() => import("./pages/admin/AdminColleges").then((m) => ({ default: m.AdminColleges })));
const AdminHackathons = lazy(() => import("./pages/admin/AdminHackathons"));
const AdminHackathonRooms = lazy(() => import("./pages/admin/AdminHackathonRooms"));
const AdminReports = lazy(() => import("./pages/admin/AdminReports"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminSubmissions = lazy(() => import("./pages/admin/AdminSubmissions"));
const HackathonDiscovery = lazy(() => import("./pages/hackathons/HackathonDiscovery"));
const HackathonDetails = lazy(() => import("./pages/hackathons/HackathonDetails"));
const HackathonRoom = lazy(() => import("./pages/hackathons/HackathonRoom"));
const HackathonProjectSubmission = lazy(() => import("./pages/hackathons/HackathonProjectSubmission"));
const PublicHackathonShowcase = lazy(() => import("./pages/hackathons/PublicHackathonShowcase"));
const MyHackathons = lazy(() => import("./pages/hackathons/MyHackathons"));

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function AdminRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  if (loading) return null;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return children;
}

// Where a signed-in user lands. The role is the one the server returned at login or /auth/me;
// it only picks a page, every admin API checks the role again on the server.
function homeFor(user, from) {
  if (user?.role === "admin") return "/admin";
  // Only same-app paths, so a crafted link can't redirect off-site.
  return typeof from === "string" && from.startsWith("/") && !from.startsWith("//") && !from.startsWith("/admin")
    ? from
    : "/dashboard";
}

function PublicRoute({ children }) {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();
  if (loading) return null;
  if (isAuthenticated) return <Navigate to={homeFor(user, location.state?.from)} replace />;
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
          <Route path="/my-hackathons" element={<ProtectedRoute><MyHackathons /></ProtectedRoute>} />

          {/* Private Hackathon Room & Project Submission */}
          {/* Server decides access: published rooms are public, others need a participant or admin login. */}
          <Route path="/hackathon/room/:roomId" element={<HackathonRoom />} />
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
          <Route path="students" element={<AdminUsers />} />
          <Route path="users" element={<Navigate to="/admin/students" replace />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="colleges" element={<AdminColleges />} />
          <Route path="hackathons" element={<AdminHackathons />} />
          <Route path="rooms" element={<AdminHackathonRooms />} />
          <Route path="submissions" element={<AdminSubmissions />} />
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
