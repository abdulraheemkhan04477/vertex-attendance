import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiClock, FiCalendar, FiBook, FiCheckCircle, FiXCircle, FiAlertCircle, FiUser } from 'react-icons/fi';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { studentAuthService } from '../../services/auth';
import { attendanceService } from '../../services/attendanceService';
import { formatDate } from '../../utils/dateUtils';
import { STATUS_COLORS, STATUS_LABELS } from '../../types';

export default function StudentDashboard() {
  const student = studentAuthService.getCurrentStudent();
  
  if (!student) return null;

  const history = useMemo(() => attendanceService.getStudentHistory(student.rollNumber), [student.rollNumber]);
  
  // Calculate stats
  const total = history.length;
  const present = history.filter((r) => r.status === 'present').length;
  const absent = history.filter((r) => r.status === 'absent').length;
  const late = history.filter((r) => r.status === 'late').length;
  const leave = history.filter((r) => r.status === 'leave').length;
  const percentage = total === 0 ? 0 : Math.round((present / total) * 100);

  // Take recent 30 records
  const recentHistory = [...history].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 30);

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-3xl p-6 md:p-8 text-white shadow-xl shadow-indigo-900/20"
      >
        <h1 className="text-2xl md:text-3xl font-black mb-2">Welcome back, {student.name}!</h1>
        <p className="text-indigo-200">Here is your attendance summary for the current academic session.</p>
        
        <div className="flex flex-wrap gap-4 mt-6">
          <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-md border border-white/20">
            <p className="text-xs text-indigo-200 uppercase tracking-wide font-semibold">Program</p>
            <p className="font-medium text-sm">{student.department}</p>
          </div>
          <div className="bg-white/10 rounded-xl px-4 py-2 backdrop-blur-md border border-white/20">
            <p className="text-xs text-indigo-200 uppercase tracking-wide font-semibold">Semester</p>
            <p className="font-medium text-sm">{student.year} • {student.branch} • {student.semester}</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Attendance Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-8 flex flex-col items-center justify-center text-center shadow-sm"
        >
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-6">Overall Attendance</h3>
          <div className="relative w-40 h-40 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" stroke="currentColor" className="text-gray-100 dark:text-gray-700" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none" stroke="currentColor"
                strokeWidth="8" strokeLinecap="round"
                className={percentage < 75 ? 'text-red-500' : percentage === 100 ? 'text-green-500' : 'text-indigo-600'}
                strokeDasharray={`${(percentage / 100) * 283} 283`}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-black ${percentage < 75 ? 'text-red-500' : percentage === 100 ? 'text-green-500' : 'text-indigo-600'}`}>{percentage}%</span>
            </div>
          </div>
          <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
            {percentage < 75 ? 'Your attendance is critically low.' : percentage === 100 ? 'Perfect attendance!' : 'Keep it up!'}
          </p>
        </motion.div>

        {/* Stats Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="md:col-span-2 grid grid-cols-2 gap-4"
        >
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                <FiBook />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Total Classes</p>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{total}</p>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <FiCheckCircle />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Present</p>
            </div>
            <p className="text-3xl font-black text-green-600">{present}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500">
                <FiXCircle />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Absent</p>
            </div>
            <p className="text-3xl font-black text-red-500">{absent}</p>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-center shadow-sm">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center text-yellow-600">
                <FiClock />
              </div>
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Late</p>
            </div>
            <p className="text-3xl font-black text-yellow-600">{late}</p>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 p-6 shadow-sm"
        >
          <h3 className="text-sm font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <FiUser className="text-indigo-500" /> Your Profile
          </h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-500 mb-1">Email</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white break-all">{student.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Phone</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{student.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Date of Birth</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{student.dob || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Guardian Name</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{student.guardianName || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Address</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{student.address || 'Not provided'}</p>
            </div>
          </div>
        </motion.div>

        {/* Recent History Table */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="md:col-span-2 bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FiCalendar className="text-indigo-500" /> Recent Attendance (Last 30)
            </h3>
          </div>
          
          <div className="flex-1 overflow-x-auto">
            {recentHistory.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <FiAlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                <p>No attendance records found.</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50">
                    <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase text-xs">Date</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase text-xs">Subject</th>
                    <th className="px-6 py-3 text-left font-semibold text-gray-500 uppercase text-xs">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {recentHistory.map((rec) => (
                    <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 dark:text-gray-300">
                        {formatDate(rec.date)}
                        <span className="text-xs text-gray-400 ml-2">(L-{rec.lectureNumber})</span>
                      </td>
                      <td className="px-6 py-4 text-gray-900 dark:text-gray-300">
                        {rec.subjectName || rec.subject.split('|').pop()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant={rec.status === 'present' ? 'present' : rec.status === 'absent' ? 'absent' : rec.status === 'late' ? 'late' : 'leave'} label={STATUS_LABELS[rec.status]} dot />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

    </div>
  );
}
