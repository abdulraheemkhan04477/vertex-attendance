import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiSave, FiSun, FiMoon, FiUser, FiBook, FiCalendar, FiInfo } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';
import type { AppSettings } from '../types';
import { BRANCHES, YEARS } from '../types';

export default function Settings() {
  const { settings, updateSettings, theme, toggleTheme } = useStore();
  const toast = useToast();
  const [form, setForm] = useState<AppSettings>({ ...settings });
  const [saving, setSaving] = useState(false);

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

  return (
    <div className="max-w-2xl space-y-5">
      {/* Institute Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiInfo className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Institute Information</h3>
        </div>
        <div className="p-6 space-y-4">
          <div>
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
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Semester / Class</label>
            <input
              type="text"
              value={form.semester}
              onChange={(e) => handleChange('semester', e.target.value)}
              className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              placeholder="e.g. B.Tech 3rd Year - 6th Semester"
            />
          </div>
        </div>
      </motion.div>

      {/* Faculty Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiUser className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Faculty Details</h3>
        </div>
        <div className="p-6">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1.5">Default Faculty Name</label>
          <input
            type="text"
            value={form.facultyName}
            onChange={(e) => handleChange('facultyName', e.target.value)}
            className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            placeholder="Faculty name"
          />
          <p className="text-xs text-gray-400 mt-1.5">This name will be pre-filled in the attendance form</p>
        </div>
      </motion.div>

      {/* Subjects */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiBook className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Academic Structure</h3>
        </div>
        <div className="p-6">
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Years</p>
              <div className="flex flex-wrap gap-2">
                {YEARS.map((y) => (
                  <span key={y} className="px-3 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 text-xs font-medium rounded-md border border-indigo-200 dark:border-indigo-800">
                    {y}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">Branches</p>
              <div className="flex flex-wrap gap-2">
                {BRANCHES.map((b) => (
                  <span key={b} className="px-3 py-1 bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-xs font-medium rounded-md border border-purple-200 dark:border-purple-800">
                    {b}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">Subjects are dynamically determined based on the selected Year, Branch, and Semester.</p>
        </div>
      </motion.div>

      {/* Theme */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center gap-2">
          <FiSun className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
          <h3 className="text-base font-bold text-gray-800 dark:text-white">Appearance</h3>
        </div>
        <div className="p-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Choose your preferred color theme</p>
          <div className="flex gap-3">
            {/* Light */}
            <button
              onClick={() => { updateSettings({ theme: 'light' }); setForm((f) => ({ ...f, theme: 'light' })); }}
              className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                theme === 'light' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <FiSun className={`w-6 h-6 ${theme === 'light' ? 'text-indigo-600' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${theme === 'light' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>Light Mode</p>
                <p className="text-xs text-gray-400">Clean, bright interface</p>
              </div>
              {theme === 'light' && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Active</span>}
            </button>
            {/* Dark */}
            <button
              onClick={() => { updateSettings({ theme: 'dark' }); setForm((f) => ({ ...f, theme: 'dark' })); }}
              className={`flex-1 p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                theme === 'dark' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
              }`}
            >
              <FiMoon className={`w-6 h-6 ${theme === 'dark' ? 'text-indigo-400' : 'text-gray-400'}`} />
              <div>
                <p className={`text-sm font-semibold ${theme === 'dark' ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}>Dark Mode</p>
                <p className="text-xs text-gray-400">Easy on the eyes</p>
              </div>
              {theme === 'dark' && <span className="text-xs bg-indigo-600 text-white px-2 py-0.5 rounded-full">Active</span>}
            </button>
          </div>
        </div>
      </motion.div>

      {/* App Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white"
      >
        <h3 className="font-bold text-lg mb-1">Vertex — Smart Attendance System</h3>
        <p className="text-indigo-200 text-sm">Vertex Institute of Technology</p>
        <p className="text-indigo-300 text-xs mt-1">Version 2.0.0 • B.Tech Programs</p>
        <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-3 text-center">
          <div><p className="text-xl font-black">61</p><p className="text-xs text-indigo-300">Students</p></div>
          <div><p className="text-xl font-black">6</p><p className="text-xs text-indigo-300">Subjects</p></div>
          <div><p className="text-xl font-black">∞</p><p className="text-xs text-indigo-300">Sessions</p></div>
        </div>
      </motion.div>

      {/* Keyboard shortcuts */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5"
      >
        <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-3">Keyboard Shortcuts</h3>
        <div className="space-y-2">
          {[
            { key: 'Ctrl + S', desc: 'Save attendance' },
            { key: 'Ctrl + P', desc: 'Print report' },
            { key: 'Ctrl + Z', desc: 'Undo last change' },
            { key: 'Ctrl + Y', desc: 'Redo last change' },
          ].map(({ key, desc }) => (
            <div key={key} className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">{desc}</span>
              <kbd className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-mono rounded-lg border border-gray-200 dark:border-gray-600">{key}</kbd>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Save button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} loading={saving} variant="primary" size="lg" icon={<FiSave />}>
          Save Settings
        </Button>
      </div>
    </div>
  );
}
