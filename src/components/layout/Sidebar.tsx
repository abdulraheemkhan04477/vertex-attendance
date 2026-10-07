import { NavLink, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiHome, FiClipboard, FiCalendar, FiBarChart2, FiFileText,
  FiUsers, FiSettings, FiLogOut, FiChevronLeft, FiChevronRight,
  FiZap, FiShield, FiCpu, FiDollarSign
} from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../hooks/useAuth';

const NAV_ITEMS = [
  { path: '/dashboard', label: 'Dashboard', icon: <FiHome />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/attendance', label: 'Attendance', icon: <FiClipboard />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/qr-attendance', label: 'QR Attendance', icon: <FiZap />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/biometric', label: 'Biometric', icon: <FiCpu />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/history', label: 'History', icon: <FiCalendar />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/fees', label: 'Fees', icon: <FiDollarSign />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/leaves', label: 'Leaves', icon: <FiFileText />, roles: ['superadmin', 'college_admin', 'hod'] },
  { path: '/analytics', label: 'Analytics', icon: <FiBarChart2 />, roles: ['superadmin', 'college_admin', 'hod', 'teacher'] },
  { path: '/reports', label: 'Reports', icon: <FiFileText />, roles: ['superadmin', 'college_admin', 'hod'] },
  { path: '/students', label: 'Students', icon: <FiUsers />, roles: ['superadmin', 'college_admin', 'hod'] },
  { path: '/staff', label: 'Staff', icon: <FiShield />, roles: ['superadmin', 'college_admin', 'hod'] },
  { path: '/settings', label: 'Settings', icon: <FiSettings />, roles: ['superadmin', 'college_admin', 'hod'] },
];

export function Sidebar() {
  const { sidebarOpen, toggleSidebar, settings, currentUser } = useStore();
  const { logout } = useAuth();
  const location = useLocation();

  const filteredNavItems = NAV_ITEMS.filter(item =>
    !item.roles || (currentUser && item.roles.includes(currentUser.role))
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={toggleSidebar}
          />
        )}
      </AnimatePresence>

      <aside
        className={`fixed left-0 top-0 h-full z-30 bg-gray-900 dark:bg-gray-950 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${sidebarOpen ? 'w-[260px] translate-x-0' : 'w-[260px] lg:w-[72px] -translate-x-full lg:translate-x-0'
          }`}
      >
        {/* Header */}
        <div className="flex items-center h-16 px-4 border-b border-gray-800 flex-shrink-0">
          <AnimatePresence mode="wait">
            {sidebarOpen ? (
              <motion.div
                key="open"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center flex-shrink-0 overflow-hidden">
                  {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <FiShield className="w-4 h-4 text-white" />}
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-bold truncate">{settings.instituteName || 'Attendance System'}</p>
                  <p className="text-gray-400 text-xs truncate">{settings.shortName || 'Management System'}</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="closed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center mx-auto overflow-hidden"
              >
                {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="w-full h-full object-cover" /> : <FiShield className="w-4 h-4 text-white" />}
              </motion.div>
            )}
          </AnimatePresence>

          {sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-white hover:bg-gray-800 transition-colors ml-2 flex-shrink-0"
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto overflow-x-hidden">
          <div className="space-y-1 px-2">
            {filteredNavItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center rounded-xl transition-all duration-200 relative group
                    ${isActive
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/50'
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    }
                    ${sidebarOpen ? 'px-3 py-2.5 gap-3' : 'px-2 py-2.5 justify-center'}
                  `}
                >
                  <span className={`text-lg flex-shrink-0 ${isActive ? 'text-white' : ''}`}>
                    {item.icon}
                  </span>
                  <AnimatePresence>
                    {sidebarOpen && (
                      <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                      >
                        {item.label}
                      </motion.span>
                    )}
                  </AnimatePresence>
                  {/* Tooltip for collapsed */}
                  {!sidebarOpen && (
                    <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                      {item.label}
                    </div>
                  )}
                </NavLink>
              );
            })}
          </div>
        </nav>

        {/* Footer */}
        <div className="border-t border-gray-800 p-3 flex-shrink-0">
          {sidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-3 px-2"
            >
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide truncate">
                {settings.facultyName}
              </p>
              <p className="text-xs text-gray-600 truncate">{settings.department.split('&')[0].trim()}</p>
            </motion.div>
          )}
          <button
            onClick={logout}
            className={`flex items-center rounded-xl text-gray-400 hover:bg-red-500/20 hover:text-red-400 transition-all duration-200 w-full
              ${sidebarOpen ? 'px-3 py-2.5 gap-3' : 'px-2 py-2.5 justify-center'}
            `}
          >
            <FiLogOut className="text-lg flex-shrink-0" />
            {sidebarOpen && <span className="text-sm font-medium">Logout</span>}
          </button>

          {!sidebarOpen && (
            <button
              onClick={toggleSidebar}
              className="w-full mt-2 flex items-center justify-center px-2 py-2 rounded-xl text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
