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
import Settings from './pages/Settings';
import StudentLogin from './pages/StudentLogin';
import { StudentProtectedRoute } from './pages/StudentPortal';
import StudentDashboard from './pages/student-portal/StudentDashboard';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const isAuth = authService.isAuthenticated();
  if (!isAuth) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppInitializer() {
  const { loadSettings, setAuthenticated } = useStore();

  useEffect(() => {
    // Seed database on first run
    seedDatabase();
    // Restore settings + theme
    loadSettings();
    // Restore auth
    if (authService.isAuthenticated()) {
      setAuthenticated(true);
    }
    // Pull latest data from Supabase (runs async, non-blocking)
    syncFromCloud();
  }, [loadSettings, setAuthenticated]);

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

        {/* Protected */}
        <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/attendance" element={<ProtectedRoute><Attendance /></ProtectedRoute>} />
        <Route path="/qr-attendance" element={<ProtectedRoute><QRAttendance /></ProtectedRoute>} />
        <Route path="/history"    element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/analytics"  element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/reports"    element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        <Route path="/students"   element={<ProtectedRoute><Students /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><Settings /></ProtectedRoute>} />

        {/* Student Portal */}
        <Route path="/student-login" element={<StudentLogin />} />
        <Route path="/student" element={<StudentProtectedRoute />}>
          <Route path="dashboard" element={<StudentDashboard />} />
          <Route index element={<Navigate to="/student/dashboard" replace />} />
        </Route>

        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
