import { useMemo, useState } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer
} from 'recharts';
import { FiAlertTriangle, FiTrendingUp, FiAward, FiActivity, FiCheckCircle } from 'react-icons/fi';
import { StatCard } from '../components/ui/StatCard';
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
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Attendance Analytics</h1>
          <p className="text-xs text-gray-500">Real-time attendance analytics and performance insights dashboard.</p>
        </div>
      </div>

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
                      <BarChart data={monthlyData}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="Present" fill="#22c55e" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 text-green-600">Top 10 High Attendance</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {topStudents.map((s, idx) => (
                    <div key={s.student.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-green-100 text-green-700 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.student.name}</p>
                          <p className="text-xs text-gray-400">{s.student.rollNumber} • {s.student.branch}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-green-600">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
                <h3 className="text-base font-bold text-gray-800 dark:text-white mb-4 text-red-500">Low Attendance List</h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {bottomStudents.map((s, idx) => (
                    <div key={s.student.id} className="flex items-center justify-between p-2.5 rounded-xl bg-gray-50 dark:bg-gray-700/50">
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-red-100 text-red-700 font-bold text-xs flex items-center justify-center">{idx + 1}</span>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">{s.student.name}</p>
                          <p className="text-xs text-gray-400">{s.student.rollNumber} • {s.student.branch}</p>
                        </div>
                      </div>
                      <span className="text-sm font-bold text-red-500">{s.percentage}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Subjects Tab */}
          {activeTab === 'subjects' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white">Subject-wise Attendance</h3>
              <div className="space-y-3">
                {subjectStats.map(sub => (
                  <div key={sub.subject} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-gray-700 dark:text-gray-300">{sub.subject}</span>
                      <span className="text-indigo-600">{sub.percentage}%</span>
                    </div>
                    <ProgressBar value={sub.percentage} colorClass={sub.percentage >= 75 ? 'bg-green-500' : 'bg-red-500'} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Warnings Tab */}
          {activeTab === 'warnings' && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5 space-y-4">
              <h3 className="text-base font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <FiAlertTriangle className="text-amber-500" />
                <span>Attendance Warnings & At-Risk Students</span>
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700 text-gray-500 font-semibold bg-gray-50 dark:bg-gray-800/80">
                      <th className="p-3">Roll Number</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Branch</th>
                      <th className="p-3">Attendance</th>
                      <th className="p-3">Status Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                    {lowStudents.map(s => (
                      <tr key={s.student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                        <td className="p-3 font-bold text-gray-900 dark:text-white">{s.student.rollNumber}</td>
                        <td className="p-3 font-semibold text-gray-800 dark:text-gray-200">{s.student.name}</td>
                        <td className="p-3 text-gray-500">{s.student.branch}</td>
                        <td className="p-3 font-bold text-red-500">{s.percentage}%</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400">
                            Below 75% Shortage
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
    </div>
  );
}
