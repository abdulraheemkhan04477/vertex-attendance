import { Outlet, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { FiLogOut, FiSun, FiMoon, FiShield } from 'react-icons/fi';
import { NavLink } from 'react-router-dom';
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
  const { theme, toggleTheme, settings } = useStore();
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
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover"/> : <FiShield className="w-4 h-4 text-white" />}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-gray-800 dark:text-white">{settings.instituteName || 'Portal'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Student Portal</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-1">
              <NavLink 
                to="/student/dashboard" 
                className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                Dashboard
              </NavLink>
              <NavLink 
                to="/student/leaves" 
                className={({ isActive }) => `px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${isActive ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'}`}
              >
                Leaves
              </NavLink>
            </nav>
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
