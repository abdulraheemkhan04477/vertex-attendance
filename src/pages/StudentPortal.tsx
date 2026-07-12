import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiLogOut, FiZap, FiSun, FiMoon } from 'react-icons/fi';
import { studentAuthService } from '../services/auth';
import { useStore } from '../store/useStore';

export function StudentProtectedRoute() {
  if (!studentAuthService.isAuthenticated()) {
    return <Navigate to="/student-login" replace />;
  }
  return <StudentPortalLayout />;
}

function StudentPortalLayout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useStore();
  const [student, setStudent] = useState(studentAuthService.getCurrentStudent());

  useEffect(() => {
    const handleStorage = () => {
      const updated = studentAuthService.getCurrentStudent();
      if (updated) setStudent(updated);
    };
    window.addEventListener('local-storage', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-storage', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  const handleLogout = () => {
    studentAuthService.logout();
    navigate('/student-login');
  };

  if (!student) {
    return <Navigate to="/student-login" replace />;
  }

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'dark' : ''}`}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200 flex flex-col">
        
        {/* Header */}
        <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-4 md:px-8 justify-between flex-shrink-0 shadow-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <FiZap className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800 dark:text-white">Vertex</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Student Portal</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 md:gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student.name}</p>
              <p className="text-xs text-gray-500 font-mono">{student.rollNumber}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <FiSun className="w-5 h-5 text-yellow-400" /> : <FiMoon className="w-5 h-5" />}
            </button>
            <button
              onClick={handleLogout}
              className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              title="Logout"
            >
              <FiLogOut className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
