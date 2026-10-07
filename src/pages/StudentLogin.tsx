import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FiUser, FiCalendar, FiZap, FiShield } from 'react-icons/fi';
import { studentAuthService } from '../services/auth';
import { useStore } from '../store/useStore';
import { useToast } from '../hooks/useToast';

export default function StudentLogin() {
  const navigate = useNavigate();
  const { settings } = useStore();
  const toast = useToast();
  const [rollNumber, setRollNumber] = useState('');
  const [dob, setDob] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  if (studentAuthService.isAuthenticated()) return <Navigate to="/student/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rollNumber.trim() || !dob.trim()) {
      toast.warning('Please enter Roll Number and Date of Birth');
      return;
    }
    setLoading(true);
    try {
      const ok = await studentAuthService.login(rollNumber, dob);
      if (!ok) {
        toast.error('Invalid roll number or date of birth');
        setShake(true);
        setTimeout(() => setShake(false), 600);
      } else {
        toast.success('Login successful');
        navigate('/student/dashboard');
      }
    } catch (err) {
      toast.error('An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background radial blue accents */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-sky-100/60 rounded-full blur-3xl translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + Institute Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col items-center mb-6"
        >
          {settings.logoUrl ? (
            <img src={settings.logoUrl} alt="Logo" className="w-16 h-16 rounded-2xl mb-3 shadow-md object-cover ring-4 ring-blue-50" />
          ) : (
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mb-3 shadow-md shadow-blue-500/20">
              <FiShield className="w-8 h-8 text-white" />
            </div>
          )}
          <h1 className="text-2xl font-bold text-slate-900 text-center tracking-tight">
            {settings.instituteName || 'Vertex Institute'}
          </h1>
          <p className="text-blue-600 text-xs font-semibold uppercase tracking-wider mt-1">
            {settings.shortName ? `${settings.shortName} Portal` : 'Campus Management System'}
          </p>
        </motion.div>

        {/* Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, x: shake ? [0, -8, 8, -8, 8, 0] : 0 }}
          transition={{ duration: 0.4 }}
          className="bg-white border border-blue-100/80 rounded-3xl p-8 shadow-xl shadow-blue-900/5 relative z-10"
        >
          <div className="mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-semibold mb-2">
              <FiZap className="w-3.5 h-3.5 text-blue-600" />
              <span>Student Portal</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Student Sign In</h2>
            <p className="text-slate-500 text-sm mt-0.5">Enter your roll number and date of birth to access your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Roll Number */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Roll Number</label>
              <div className="relative">
                <FiUser className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4" />
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Enter Roll Number"
                  autoFocus
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Date of Birth */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-semibold text-slate-700">Date of Birth</label>
                <span className="text-xs text-slate-400 font-medium">Format: DD/MM/YYYY</span>
              </div>
              <div className="relative">
                <FiCalendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-500 w-4 h-4" />
                <input
                  type="text"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  placeholder="DD/MM/YYYY (e.g. 15/08/2005)"
                  className="w-full bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 rounded-xl pl-10 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white focus:border-transparent transition-all"
                />
              </div>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.98 }}
              className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold py-3 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-70 mt-2 shadow-lg shadow-blue-600/20"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In'}
            </motion.button>
          </form>

          {/* Switch to Staff Login */}
          <div className="mt-6 text-center pt-4 border-t border-slate-100">
            <p className="text-slate-500 text-xs mb-1.5">Are you a faculty member or administrator?</p>
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold text-sm transition-colors inline-flex items-center gap-1">
              ← Switch to Staff Login
            </Link>
          </div>
        </motion.div>

        <p className="text-center text-slate-400 text-xs mt-6 font-medium">
          Vertex Attendance Management System
        </p>
      </div>
    </div>
  );
}
