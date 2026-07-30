import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { ToastContainer } from './components/ui/Toast';
import { authService } from './services/auth';
import { seedDatabase, syncFromCloud } from './services/db';
import { useStore } from './store/useStore';

// Pages
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Attendance from './pages/Attendance';
import History from './pages/History';
import QRAttendance from './pages/QRAttendance';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';
import Students from './pages/Students';
import Staff from './pages/Staff';
import Settings from './pages/Settings';
import StudentLogin from './pages/StudentLogin';
import { StudentProtectedRoute } from './pages/StudentPortal';
import StudentDashboard from './pages/student-portal/StudentDashboard';
import OwnerLogin from './pages/OwnerLogin';
import Leaves from './pages/Leaves';
import LeaveApply from './pages/student-portal/LeaveApply';
import { useAuth } from './hooks/useAuth';

// Protected route wrapper
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, currentUser } = useAuth();
  if (!isAuthenticated) return <Navigate to="/student-login" replace />;
  
  if (allowedRoles && currentUser) {
    if (!allowedRoles.includes(currentUser.role)) {
      return <Navigate to="/dashboard" replace />;
    }
  }
  
  return <Layout>{children}</Layout>;
}

function AppInitializer() {
  const { loadSettings, setAuthenticated, setCurrentUser, settings } = useStore();

  useEffect(() => {
    document.title = settings?.instituteName || 'Attendance System';
  }, [settings?.instituteName]);

  useEffect(() => {
    // Seed database on first run
    seedDatabase();
    // Restore settings + theme
    loadSettings();
    // Restore auth
    if (authService.isAuthenticated()) {
      setAuthenticated(true);
      setCurrentUser(authService.getCurrentUser());
    }
    // Pull latest data from Supabase (runs async, non-blocking)
    syncFromCloud();
  }, [loadSettings, setAuthenticated, setCurrentUser]);

  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInitializer />
      <ToastContainer />
      <Routes>
        {/* Public */}
        <Route path="/login" element={<Login />} />
        <Route path="/veneyd04477" element={<OwnerLogin />} />

        {/* Protected */}
        <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod', 'teacher']}><Attendance /></ProtectedRoute>} />
        <Route path="/qr-attendance" element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod', 'teacher']}><QRAttendance /></ProtectedRoute>} />
        <Route path="/history"    element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod', 'teacher']}><History /></ProtectedRoute>} />
        <Route path="/analytics"  element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Analytics /></ProtectedRoute>} />
        <Route path="/reports"    element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Reports /></ProtectedRoute>} />
        <Route path="/students"   element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Students /></ProtectedRoute>} />
        <Route path="/staff"      element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Staff /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Settings /></ProtectedRoute>} />
        <Route path="/leaves"     element={<ProtectedRoute allowedRoles={['superadmin', 'college_admin', 'hod']}><Leaves /></ProtectedRoute>} />

        {/* Student Portal */}
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student" element={<StudentProtectedRoute />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route path="leaves" element={<LeaveApply />} />
          <Route index element={<Navigate to="/student/dashboard" replace />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/student-login" replace />} />
        <Route path="*" element={<Navigate to="/student-login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
