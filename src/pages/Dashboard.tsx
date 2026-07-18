import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiCheckCircle, FiXCircle, FiClock, FiPercent, FiActivity, FiAlertTriangle, FiCalendar } from 'react-icons/fi';
import { StatCard } from '../components/ui/StatCard';
import { ProgressBar } from '../components/ui/ProgressBar';
import { attendanceService } from '../services/attendanceService';
import { analyticsService } from '../services/analyticsService';
import { studentsDB } from '../services/db';
import { formatDate, today } from '../utils/dateUtils';
import { useStore } from '../store/useStore';
import { format } from 'date-fns';

export default function Dashboard() {
  const { settings } = useStore();
  const todayStr = today();
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const totalStudents = studentsDB.getAll().length;
  const todayStats = useMemo(() => attendanceService.getTodayStats(todayStr), [todayStr]);
  const lowAttendance = useMemo(() => attendanceService.getLowAttendanceStudents().slice(0, 5), []);
  const summary = useMemo(() => analyticsService.getSummaryStats(), []);

  const branchStats = useMemo(() => {
    const studentStats = attendanceService.getAllStudentStats();
    const branchTotals: Record<string, number> = {};
    const branchExpected: Record<string, number> = {};
    const branchAttended: Record<string, number> = {};
    const branchPresentToday: Record<string, number> = {};

    studentStats.forEach((s) => {
      const branch = s.student.branch;
      if (!branchTotals[branch]) {
        branchTotals[branch] = 0;
        branchExpected[branch] = 0;
        branchAttended[branch] = 0;
        branchPresentToday[branch] = 0;
      }
      branchTotals[branch]++;
      branchExpected[branch] += s.total;
      branchAttended[branch] += (s.present + s.late);
    });

    const todayRecords = attendanceService.getByDate(todayStr);
    const uniquePresentToday = new Set<string>();
    todayRecords.forEach((r) => {
      if (r.status === 'present' || r.status === 'late') {
        uniquePresentToday.add(r.rollNumber);
      }
    });

    uniquePresentToday.forEach((roll) => {
      const student = studentsDB.getByRollNumber(roll);
      if (student && branchPresentToday[student.branch] !== undefined) {
        branchPresentToday[student.branch]++;
      }
    });

    const stats = Object.keys(branchTotals).map((branch) => {
      const totalStudents = branchTotals[branch];
      const todayPresent = branchPresentToday[branch] || 0;
      const expected = branchExpected[branch] || 0;
      const attended = branchAttended[branch] || 0;
      
      const overallPercentage = expected > 0 ? Math.round((attended / expected) * 100) : 0;

      return { branch, totalStudents, todayPresent, overallPercentage };
    });

    stats.sort((a, b) => b.overallPercentage - a.overallPercentage);
    return stats;
  }, [todayStr, time]);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-indigo-600 via-indigo-700 to-purple-700 rounded-2xl p-6 text-white relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/4" />
        <div className="absolute bottom-0 left-1/3 w-32 h-32 bg-white/5 rounded-full translate-y-1/2" />
        <div className="relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Welcome back,</p>
              <h2 className="text-2xl font-black">{settings.facultyName}</h2>
              <p className="text-indigo-300 text-sm mt-1">{settings.department}</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-mono font-black">{format(time, 'hh:mm:ss a')}</div>
              <p className="text-indigo-300 text-sm">{formatDate(todayStr)}</p>
              <p className="text-indigo-400 text-xs">{format(time, 'EEEE')}</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Today's Stats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Today's Overview</h2>
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">
            {formatDate(todayStr)}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Students"
            value={totalStudents}
            subtitle="Enrolled in class"
            icon={<FiUsers className="w-6 h-6 text-indigo-600" />}
            iconBg="bg-indigo-100 dark:bg-indigo-900/30"
            delay={0}
          />
          <StatCard
            title="Today Present"
            value={todayStats.present + todayStats.late}
            subtitle={`of ${todayStats.total || totalStudents} marked`}
            icon={<FiCheckCircle className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
            delay={0.05}
          />
          <StatCard
            title="Today Absent"
            value={todayStats.absent}
            subtitle={todayStats.total > 0 ? `${Math.round((todayStats.absent / todayStats.total) * 100)}% absent` : 'No data yet'}
            icon={<FiXCircle className="w-6 h-6 text-red-500" />}
            iconBg="bg-red-100 dark:bg-red-900/30"
            delay={0.1}
          />
          <StatCard
            title="Today %"
            value={todayStats.total > 0 ? `${todayStats.percentage}%` : 'N/A'}
            subtitle={todayStats.total > 0 ? 'Attendance rate' : 'Take attendance first'}
            icon={<FiPercent className="w-6 h-6 text-blue-600" />}
            iconBg="bg-blue-100 dark:bg-blue-900/30"
            delay={0.15}
          />
        </div>
      </div>

      {/* Semester Stats */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <FiActivity className="text-indigo-600 dark:text-indigo-400" />
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Semester Statistics</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Overall %"
            value={`${summary.avgPercentage}%`}
            subtitle="Class average"
            icon={<FiPercent className="w-6 h-6 text-purple-600" />}
            iconBg="bg-purple-100 dark:bg-purple-900/30"
            delay={0.2}
          />
          <StatCard
            title="Highest"
            value={`${summary.highestPercentage}%`}
            subtitle="Best attendance"
            icon={<FiCheckCircle className="w-6 h-6 text-green-600" />}
            iconBg="bg-green-100 dark:bg-green-900/30"
            delay={0.25}
          />
          <StatCard
            title="Below 75%"
            value={summary.below75Count}
            subtitle="Need attention"
            icon={<FiAlertTriangle className="w-6 h-6 text-orange-500" />}
            iconBg="bg-orange-100 dark:bg-orange-900/30"
            delay={0.3}
          />
          <StatCard
            title="Perfect (100%)"
            value={summary.perfectAttendanceCount}
            subtitle="Full attendance"
            icon={<FiClock className="w-6 h-6 text-teal-600" />}
            iconBg="bg-teal-100 dark:bg-teal-900/30"
            delay={0.35}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branch Summary Grid */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <FiActivity className="text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-lg font-bold text-gray-800 dark:text-white">Branch Summary</h2>
          </div>
          {branchStats.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm py-12 text-center">
              <FiCheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400">No branch data available</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {branchStats.map((b, i) => (
                <motion.div
                  key={b.branch}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col h-full hover:shadow-md transition-shadow"
                >
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">{b.branch}</h3>
                    <div className={`px-2 py-1 rounded-full text-xs font-bold ${
                      b.overallPercentage >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
                      b.overallPercentage >= 60 ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' :
                      'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {b.overallPercentage}% Overall
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 mt-auto">
                    <div className="bg-gray-50 dark:bg-gray-700/50 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700 flex flex-col justify-center">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Today's Present</p>
                      <p className="text-sm font-bold text-gray-800 dark:text-white">
                        <span className="text-indigo-600 dark:text-indigo-400">{b.todayPresent}</span> / {b.totalStudents}
                      </p>
                    </div>
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800/50 flex flex-col items-center justify-center text-center">
                      <p className="text-[10px] text-indigo-600 dark:text-indigo-400 font-bold mb-0.5 uppercase tracking-wide">Attendance</p>
                      <div className="flex items-center gap-1">
                        <FiPercent className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                        <p className="text-2xl font-black text-indigo-700 dark:text-indigo-300">{b.overallPercentage}%</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          b.overallPercentage >= 75 ? 'bg-green-500' :
                          b.overallPercentage >= 60 ? 'bg-yellow-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${b.overallPercentage}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Low Attendance Warning */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-gray-100 dark:border-gray-700">
              <FiAlertTriangle className="text-orange-500 w-4 h-4" />
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Low Attendance</h3>
              {lowAttendance.length > 0 && (
                <span className="ml-auto text-xs bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full font-semibold">
                  {lowAttendance.length}
                </span>
              )}
            </div>
            {lowAttendance.length === 0 ? (
              <div className="py-12 text-center px-4">
                <FiCheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <p className="text-sm text-gray-400">All students above 75%</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-gray-700">
                {lowAttendance.map((s) => (
                  <div key={s.student.rollNumber} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-800 dark:text-gray-200 truncate">{s.student.name}</p>
                        <p className="text-xs text-gray-400 font-mono">{s.student.rollNumber}</p>
                      </div>
                      <span className="text-sm font-black text-red-500 flex-shrink-0 ml-2">{s.percentage}%</span>
                    </div>
                    <ProgressBar value={s.percentage} size="sm" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
