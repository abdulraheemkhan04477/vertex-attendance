import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu, FiSun, FiMoon, FiBell } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { collegesDB } from '../../services/db';
import { formatDate } from '../../utils/dateUtils';
import { format } from 'date-fns';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard':  'Dashboard',
  '/attendance': 'Mark Attendance',
  '/history':    'Attendance History',
  '/analytics':  'Analytics & Reports',
  '/reports':    'Generate Reports',
  '/students':   'Student Directory',
  '/settings':   'Settings',
};

export function Header() {
  const { toggleSidebar, toggleTheme, theme, settings, currentUser, activeCollegeId, setActiveCollegeId } = useStore();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  const allColleges = currentUser?.role === 'superadmin' ? collegesDB.getAll() : [];

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const title = PAGE_TITLES[location.pathname] ?? 'Vertex';

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-4 gap-4 flex-shrink-0 shadow-sm">
      {/* Menu toggle */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block">
          {formatDate(format(new Date(), 'yyyy-MM-dd'))} • {settings.semester}
        </p>
      </div>

      {/* College Switcher for Super Admin */}
      {currentUser?.role === 'superadmin' && (
        <div className="hidden md:flex items-center">
          <select
            value={activeCollegeId || 'ALL'}
            onChange={(e) => {
              setActiveCollegeId(e.target.value);
              window.location.reload(); // Reload to refresh all local state data
            }}
            className="text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
          >
            <option value="ALL">All Colleges (Global View)</option>
            {allColleges.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Live clock */}
      <div className="hidden md:flex flex-col items-end">
        <span className="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">
          {format(time, 'hh:mm:ss a')}
        </span>
        <span className="text-xs text-gray-400">{format(time, 'EEEE')}</span>
      </div>

      {/* Notification */}
      <button className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors relative">
        <FiBell className="w-5 h-5" />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-indigo-500 rounded-full" />
      </button>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <FiSun className="w-5 h-5 text-yellow-400" /> : <FiMoon className="w-5 h-5" />}
      </button>

      {/* Avatar */}
      <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
        {settings.facultyName?.charAt(0)?.toUpperCase() || 'A'}
      </div>
    </header>
  );
}
