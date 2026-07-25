import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { FiMenu, FiSun, FiMoon, FiBell } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
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
  const { toggleSidebar, toggleTheme, theme, settings, currentUser } = useStore();
  const location = useLocation();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const title = PAGE_TITLES[location.pathname] ?? (settings?.shortName || 'App');

  return (
    <header className="h-16 bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex items-center px-2 sm:px-4 gap-2 sm:gap-4 flex-shrink-0 shadow-sm">
      {/* Menu toggle */}
      <button
        onClick={toggleSidebar}
        className="w-9 h-9 rounded-xl flex items-center justify-center text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 dark:text-gray-400 transition-colors flex-shrink-0"
      >
        <FiMenu className="w-5 h-5" />
      </button>

      {/* Title */}
      <div className="flex-1 min-w-0">
        <h1 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{title}</h1>
        <p className="text-xs text-gray-500 dark:text-gray-400 hidden sm:block truncate">
          {formatDate(format(new Date(), 'yyyy-MM-dd'))} • {settings.semester}
        </p>
      </div>



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

      {/* Avatar / Profile */}
      <div className="flex items-center gap-3">
        {currentUser && (
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs text-gray-500 dark:text-gray-400">👤 Welcome,</span>
            <span className="text-sm font-semibold text-gray-900 dark:text-white">
              {currentUser.name}
            </span>
          </div>
        )}
        <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
          {(currentUser?.name || settings.facultyName)?.charAt(0)?.toUpperCase() || 'A'}
        </div>
      </div>
    </header>
  );
}

