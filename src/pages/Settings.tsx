import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiSun, FiMoon, FiUser, FiInfo, FiBell, FiShield, FiLogOut, FiMail } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import type { AppSettings } from '../types';
import { authService } from '../services/auth';
import { formatDistanceToNow } from 'date-fns';

export default function Settings() {
  const { settings, updateSettings, theme, toggleTheme, setAuthenticated } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saving, setSaving] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const lastChanged = authService.getLastPasswordChange();

  const handleChange = (key: keyof AppSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = async () => {
    if (!form.instituteName.trim()) { toast.error('Institute name cannot be empty'); return; }
    if (!form.facultyName.trim()) { toast.error('Faculty name cannot be empty'); return; }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    updateSettings(form);
    setSaving(false);
    toast.success('Settings saved successfully!');
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm.current || !passwordForm.new || !passwordForm.confirm) {
      toast.error('All fields are required');
      return;
    }
    if (passwordForm.new !== passwordForm.confirm) {
      toast.error('New passwords do not match');
      return;
    }
    if (passwordForm.current !== authService.getAdminPassword()) {
      toast.error('Current password is incorrect');
      return;
    }
    
    setPasswordSaving(true);
    await new Promise((r) => setTimeout(r, 400));
    authService.updateAdminPassword(passwordForm.new);
    setPasswordSaving(false);
    setIsPasswordModalOpen(false);
    setPasswordForm({ current: '', new: '', confirm: '' });
    toast.success('Password updated successfully! Please use it on your next login.');
  };

  const handleLogout = () => {
    if (confirm('Are you sure you want to log out?')) {
      setAuthenticated(false);
      localStorage.clear();
      window.location.href = '/';
    }
  };

  return (
    <div className="max-w-3xl space-y-5 mx-auto">
      {/* Profile / Account Settings */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiUser className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Profile Settings</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Faculty Name</label>
            <input
              type="text"
              value={form.facultyName}
              onChange={(e) => handleChange('facultyName', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              placeholder="Your full name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Email Address</label>
            <input
              type="email"
              defaultValue="admin@vertex.edu"
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              disabled
            />
            <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
          </div>
        </div>
      </motion.div>

      {/* Institute Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiInfo className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Institute Information</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Institute Name</label>
            <input
              type="text"
              value={form.instituteName}
              onChange={(e) => handleChange('instituteName', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              placeholder="Institute name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Department</label>
            <input
              type="text"
              value={form.department}
              onChange={(e) => handleChange('department', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              placeholder="Department name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Academic Session</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => handleChange('semester', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              placeholder="e.g. 2024-2025"
            />
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Theme Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiSun className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Appearance</h3>
          </div>
          <div className="p-6">
            <div className="flex gap-3">
              <button
                onClick={() => { updateSettings({ theme: 'light' }); setForm((f) => ({ ...f, theme: 'light' })); }}
                className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
              >
                <FiSun className={`w-6 h-6 ${theme === 'light' ? 'text-indigo-600' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${theme === 'light' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>Light Mode</p>
              </button>
              <button
                onClick={() => { updateSettings({ theme: 'dark' }); setForm((f) => ({ ...f, theme: 'dark' })); }}
                className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                }`}
              >
                <FiMoon className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'}`} />
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>Dark Mode</p>
              </button>
            </div>
          </div>
        </motion.div>

        {/* Preferences - Removed fake email notifications and push alerts */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiBell className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Preferences</h3>
          </div>
          <div className="p-6">
            <p className="text-sm text-gray-500">No preference settings available at this time.</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Security / Password */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
            <FiShield className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            <h3 className="text-base font-bold text-gray-800 dark:text-white">Security</h3>
          </div>
          <div className="p-6">
            <Button onClick={() => setIsPasswordModalOpen(true)} variant="outline" className="w-full justify-center">
              Change Password
            </Button>
            <p className="text-xs text-gray-500 mt-3 text-center">
              {lastChanged ? `Last changed ${formatDistanceToNow(new Date(lastChanged))} ago` : 'Never changed'}
            </p>
          </div>
        </motion.div>
        
        {/* About & Contact */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-6 text-white flex flex-col justify-between"
        >
          <div>
            <h3 className="font-bold text-lg mb-1">Vertex Attendance System</h3>
            <p className="text-indigo-200 text-sm">Version 2.0.0 • Production Build</p>
            <p className="text-indigo-300 text-xs mt-2">© 2026 Vertex Technologies</p>
          </div>
          <div className="mt-4 pt-4 border-t border-white/20 flex items-center gap-3">
            <Button onClick={() => window.open('mailto:support@vertex.edu')} className="bg-white/10 hover:bg-white/20 text-white border-none" size="sm" icon={<FiMail />}>
              Contact Support
            </Button>
          </div>
        </motion.div>
      </div>

      {/* Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <Button onClick={handleLogout} variant="danger" icon={<FiLogOut />}>
          Log Out
        </Button>
        <Button onClick={handleSave} loading={saving} variant="primary" size="lg" icon={<FiSave />}>
          Save Settings
        </Button>
      </div>

      {/* Change Password Modal */}
      {isPasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Change Password</h3>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Current Password</label>
                <input
                  type="password"
                  value={passwordForm.current}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, current: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">New Password</label>
                <input
                  type="password"
                  value={passwordForm.new}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, new: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordForm.confirm}
                  onChange={(e) => setPasswordForm((f) => ({ ...f, confirm: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setIsPasswordModalOpen(false)}>Cancel</Button>
                <Button type="submit" loading={passwordSaving}>Update Password</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
