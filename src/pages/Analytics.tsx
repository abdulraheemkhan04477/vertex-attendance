import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { FiAlertTriangle, FiTrendingUp, FiAward, FiActivity } from 'react-icons/fi';
import { StatCard } from '../components/ui/StatCard';
import { Badge } from '../components/ui/Badge';
import { ProgressBar } from '../components/ui/ProgressBar';
import { analyticsService } from '../services/analyticsService';
import { attendanceService } from '../services/attendanceService';

const RADIAN = Math.PI / 180;
const renderCustomLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
  if (percent < 0.05) return null;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight="bold">{`${(percent * 100).toFixed(0)}%`}</text>;
};

export default function Analytics() {
  const summary = useMemo(() => analyticsService.getSummaryStats(), []);
  const pieData = useMemo(() => analyticsService.getStatusDistribution(), []);
  const monthlyData = useMemo(() => analyticsService.getMonthlyData(), []);
  const topStudents = useMemo(() => analyticsService.getTopStudents(10), []);
  const bottomStudents = useMemo(() => analyticsService.getBottomStudents(10), []);
  const subjectStats = useMemo(() => analyticsService.getSubjectWiseStats(), []);
  const lowStudents = useMemo(() => attendanceService.getLowAttendanceStudents(), []);
  const atRisk = useMemo(() => analyticsService.getAtRiskStudents(), []);

  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'subjects' | 'warnings'>('overview');

  const noData = pieData.length === 0;

  return (
    <div className="space-y-5">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { title: 'Total Students', value: summary.totalStudents, icon: <FiActivity className="w-5 h-5 text-indigo-600" />, bg: 'bg-indigo-100 dark:bg-indigo-900/30' },
          { title: 'Avg Attendance', value: `${summary.avgPercentage}%`, icon: <FiActivity className="w-5 h-5 text-blue-600" />, bg: 'bg-blue-100 dark:bg-blue-900/30' },
          { title: 'Highest', value: `${summary.highestPercentage}%`, icon: <FiTrendingUp className="w-5 h-5 text-green-600" />, bg: 'bg-green-100 dark:bg-green-900/30' },
          { title: 'Lowest', value: `${summary.lowestPercentage}%`, icon: <FiTrendingUp className="w-5 h-5 text-red-500" />, bg: 'bg-red-100 dark:bg-red-900/30' },
          { title: 'Below 75%', value: summary.below75Count, icon: <FiAlertTriangle className="w-5 h-5 text-orange-500" />, bg: 'bg-orange-100 dark:bg-orange-900/30' },
          { title: 'Perfect 100%', value: summary.perfectAttendanceCount, icon: <FiAward className="w-5 h-5 text-yellow-500" />, bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
        ].map((s, i) => (
          <StatCard key={s.title} title={s.title} value={s.value} icon={s.icon} iconBg={s.bg} delay={i * 0.05} />
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-2 shadow-sm">
        {[
          { id: 'overview' as const, label: '📊 Overview' },
          { id: 'students' as const, label: '👥 Students' },
          { id: 'subjects' as const, label: '📚 Subjects' },
          { id: 'warnings' as const, label: `⚠ Warnings (${lowStudents.length + atRisk.length})` },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-1 py-2 px-3 rounded-xl text-sm font-semibold transition-all ${
              activeTab === id
                ? 'bg-indigo-600 text-white shadow'
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Pie Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Status Distribution</h3>
            {noData ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} labelLine={false} label={renderCustomLabel} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(val: number, name: string) => [`${val} records`, name]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Monthly Bar Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
            <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4">Monthly Attendance</h3>
            {monthlyData.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="present" fill="#10b981" name="Present" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="absent"  fill="#ef4444" name="Absent"  radius={[3, 3, 0, 0]} />
                    <Bar dataKey="late"    fill="#f59e0b" name="Late"    radius={[3, 3, 0, 0]} />
                    <Bar dataKey="leave"   fill="#3b82f6" name="Leave"   radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Students Tab */}
      {activeTab === 'students' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top 10 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"><FiAward className="text-yellow-500" /> Top Attendance</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {topStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data</p>
              ) : topStudents.map((s, i) => (
                <div key={s.student.rollNumber} className="px-5 py-3">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0 ${i < 3 ? 'bg-yellow-400 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-500'}`}>{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{s.student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student.rollNumber}</p>
                    </div>
                    <span className="text-sm font-black text-green-600 dark:text-green-400">{s.percentage}%</span>
                  </div>
                  <ProgressBar value={s.percentage} size="sm" />
                </div>
              ))}
            </div>
          </div>

          {/* Bottom 10 */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2"><FiAlertTriangle className="text-red-500" /> Lowest Attendance</h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700">
              {bottomStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No data</p>
              ) : bottomStudents.map((s, i) => (
                <div key={s.student.rollNumber} className="px-5 py-3">
                  <div className="flex items-center gap-3 mb-1.5">
                    <span className="w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 flex items-center justify-center text-xs font-black flex-shrink-0">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{s.student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student.rollNumber}</p>
                    </div>
                    <span className={`text-sm font-black ${s.percentage < 75 ? 'text-red-500' : 'text-yellow-500'}`}>{s.percentage}%</span>
                  </div>
                  <ProgressBar value={s.percentage} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subjects Tab */}
      {activeTab === 'subjects' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          {subjectStats.length === 0 ? (
            <div className="py-16 text-center text-gray-400">No subject data yet</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                  {['Subject', 'Total', 'Present', 'Absent', 'Late', 'Leave', '%', 'Chart'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {subjectStats.map((s, i) => (
                  <tr key={s.subject} className={`border-b border-gray-50 dark:border-gray-700 ${i % 2 === 0 ? '' : 'bg-gray-50/50 dark:bg-gray-700/20'}`}>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-800 dark:text-gray-200">{s.subject}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{s.total}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">{s.present}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-red-500">{s.absent}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-yellow-500">{s.late}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-blue-500">{s.leave}</td>
                    <td className="px-4 py-3 text-sm font-black" style={{ color: s.percentage < 75 ? '#ef4444' : '#10b981' }}>{s.percentage}%</td>
                    <td className="px-4 py-3 w-32"><ProgressBar value={s.percentage} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Warnings Tab */}
      {activeTab === 'warnings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="px-5 py-4 border-b border-red-100 dark:border-red-900/30 bg-red-50 dark:bg-red-900/10 rounded-t-2xl">
              <h3 className="text-base font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
                <FiAlertTriangle /> Below 75% — Detention Risk ({lowStudents.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {lowStudents.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">✅ All students above 75%</p>
              ) : lowStudents.map((s) => (
                <div key={s.student.rollNumber} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student.rollNumber}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-black text-red-500">{s.percentage}%</span>
                      <div className="text-xs text-red-400">Need {75 - s.percentage}% more</div>
                    </div>
                  </div>
                  <ProgressBar value={s.percentage} size="sm" />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
            <div className="px-5 py-4 border-b border-yellow-100 dark:border-yellow-900/30 bg-yellow-50 dark:bg-yellow-900/10 rounded-t-2xl">
              <h3 className="text-base font-bold text-yellow-700 dark:text-yellow-400 flex items-center gap-2">
                ⚡ At Risk (75–85%) ({atRisk.length})
              </h3>
            </div>
            <div className="divide-y divide-gray-50 dark:divide-gray-700 max-h-96 overflow-y-auto">
              {atRisk.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">✅ No at-risk students</p>
              ) : atRisk.map((s) => (
                <div key={s.student.rollNumber} className="px-5 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <div>
                      <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.student.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.student.rollNumber}</p>
                    </div>
                    <span className="text-lg font-black text-yellow-500">{s.percentage}%</span>
                  </div>
                  <ProgressBar value={s.percentage} size="sm" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
