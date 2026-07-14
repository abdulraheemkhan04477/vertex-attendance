import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiFilter } from 'react-icons/fi';
import { attendanceService } from '../services/attendanceService';
import { studentsDB } from '../services/db';
import { exportSummaryToCSV, exportSummaryToExcel, exportSummaryToPDF, printSummary } from '../services/exportService';
import { formatDate, today, getMonthRange } from '../utils/dateUtils';
import { format, startOfWeek, endOfWeek } from 'date-fns';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { isSameDepartment } from '../utils/departmentUtils';
import { YEARS, BRANCHES, SEMESTERS_BY_YEAR } from '../types';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'semester';

export default function Reports() {
  const toast = useToast();
  const { currentUser } = useStore();
  const todayStr = today();
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [customDate, setCustomDate] = useState(todayStr);
  const [customMonth, setCustomMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState<string | null>(null);

  // Filters
  const [filterBranch, setFilterBranch] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterSemester, setFilterSemester] = useState('');
  const [filterSection, setFilterSection] = useState('');

  const records = useMemo(() => {
    switch (activeReport) {
      case 'daily':
        return attendanceService.getByDate(customDate);
      case 'weekly': {
        const ref = new Date(customDate);
        const start = format(startOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        const end   = format(endOfWeek(ref, { weekStartsOn: 1 }), 'yyyy-MM-dd');
        return attendanceService.getAll().filter((r) => r.date >= start && r.date <= end);
      }
      case 'monthly': {
        const ref = new Date(customMonth + '-01');
        const { start, end } = getMonthRange(format(ref, 'yyyy-MM-dd'));
        return attendanceService.getAll().filter((r) => r.date >= start && r.date <= end);
      }
      case 'semester':
        return attendanceService.getAll();
    }
  }, [activeReport, customDate, customMonth]);

  const filteredStudents = useMemo(() => {
    let list = studentsDB.getAll();
    if (filterBranch) list = list.filter(s => s.branch === filterBranch);
    if (filterYear) list = list.filter(s => s.year === filterYear);
    if (filterSemester) list = list.filter(s => s.semester === filterSemester);
    if (filterSection) list = list.filter(s => s.section === filterSection);
    return list;
  }, [currentUser, filterBranch, filterYear, filterSemester, filterSection]);

  const reportStats = useMemo(() => {
    return filteredStudents.map((student) => {
      const stRecords = records.filter((r) => r.rollNumber === student.rollNumber);
      const total = stRecords.length;
      const present = stRecords.filter((r) => r.status === 'present').length;
      const absent = stRecords.filter((r) => r.status === 'absent').length;
      const late = stRecords.filter((r) => r.status === 'late').length;
      const leave = stRecords.filter((r) => r.status === 'leave').length;
      const attended = present + late;
      const percentage = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { student, total, present, absent, late, leave, percentage };
    }).filter(s => s.total > 0 || activeReport === 'semester'); // only show students who have records, except for semester where we show all
  }, [filteredStudents, records, activeReport]);

  const getTitle = () => {
    switch (activeReport) {
      case 'daily':   return `Daily Attendance Summary — ${formatDate(customDate)}`;
      case 'weekly':  return `Weekly Attendance Summary — Week of ${formatDate(customDate)}`;
      case 'monthly': return `Monthly Attendance Summary — ${format(new Date(customMonth + '-01'), 'MMMM yyyy')}`;
      case 'semester': return 'Semester Attendance Summary';
    }
  };

  const getFilename = () => {
    switch (activeReport) {
      case 'daily':   return `Daily_Summary_${customDate}`;
      case 'weekly':  return `Weekly_Summary_${customDate}`;
      case 'monthly': return `Monthly_Summary_${customMonth}`;
      case 'semester': return 'Semester_Summary';
    }
  };

  const doExport = async (type: 'csv' | 'excel' | 'pdf' | 'print') => {
    setLoading(type);
    await new Promise((r) => setTimeout(r, 300));
    const title = getTitle();
    const filename = getFilename();

    try {
      if (type === 'csv') exportSummaryToCSV(reportStats, filename);
      else if (type === 'excel') exportSummaryToExcel(reportStats, filename);
      else if (type === 'pdf') exportSummaryToPDF(reportStats, title);
      else if (type === 'print') printSummary(reportStats, title);
      toast.success('Report generated successfully!');
    } catch {
      toast.error('Failed to generate report');
    }
    setLoading(null);
  };

  const availableSemesters = filterYear ? SEMESTERS_BY_YEAR[filterYear] || [] : Object.values(SEMESTERS_BY_YEAR).flat();

  return (
    <div className="space-y-5">
      {/* Report Type Selector */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-4">Select Report Type</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { type: 'daily' as const, icon: '📅', label: 'Daily', desc: 'Single day report' },
            { type: 'weekly' as const, icon: '📆', label: 'Weekly', desc: '7-day report' },
            { type: 'monthly' as const, icon: '🗓', label: 'Monthly', desc: 'Full month report' },
            { type: 'semester' as const, icon: '📋', label: 'Semester', desc: 'All records' },
          ].map(({ type, icon, label, desc }) => (
            <motion.button
              key={type}
              whileTap={{ scale: 0.97 }}
              onClick={() => setActiveReport(type)}
              className={`p-4 rounded-xl border-2 text-left transition-all ${
                activeReport === type
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 hover:border-indigo-300'
              }`}
            >
              <div className="text-2xl mb-2">{icon}</div>
              <div className={`text-sm font-bold ${activeReport === type ? 'text-indigo-700 dark:text-indigo-400' : 'text-gray-800 dark:text-gray-200'}`}>{label}</div>
              <div className="text-xs text-gray-400">{desc}</div>
            </motion.button>
          ))}
        </div>

        {/* Date selectors */}
        <div className="flex flex-wrap gap-3 items-end mb-5">
          {(activeReport === 'daily' || activeReport === 'weekly') && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                {activeReport === 'daily' ? 'Select Date' : 'Select Week (pick any day)'}
              </label>
              <input
                type="date"
                value={customDate}
                onChange={(e) => setCustomDate(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
          )}
          {activeReport === 'monthly' && (
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Select Month</label>
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
          )}
        </div>
        
        {/* Filters */}
        <div className="border-t border-gray-100 dark:border-gray-700 pt-4 mt-4">
          <div className="flex items-center gap-2 mb-3">
            <FiFilter className="text-gray-400" />
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Filter Students</h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <select
                value={filterYear}
                onChange={(e) => setFilterYear(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <select
                value={filterSemester}
                onChange={(e) => setFilterSemester(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="">All Semesters</option>
                {Array.from(new Set(availableSemesters)).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <select
                value={filterSection}
                onChange={(e) => setFilterSection(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl outline-none text-gray-900 dark:text-white"
              >
                <option value="">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Report Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">{getTitle()}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{reportStats.length} students included in summary</p>
          </div>
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-semibold">
            {reportStats.length} Students
          </span>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          {[
            { id: 'csv' as const, icon: '📄', label: 'Export CSV', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
            { id: 'excel' as const, icon: '📊', label: 'Export Excel', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' },
            { id: 'pdf' as const, icon: '📕', label: 'Export PDF', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' },
            { id: 'print' as const, icon: '🖨', label: 'Print Report', color: 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300' },
          ].map(({ id, icon, label, color }) => (
            <button
              key={id}
              onClick={() => doExport(id)}
              disabled={loading !== null || reportStats.length === 0}
              className={`flex items-center justify-center gap-2 p-3 rounded-xl border ${color} hover:opacity-80 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <span className="text-lg">{icon}</span>
              <span className="text-sm font-semibold">{loading === id ? '...' : label}</span>
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <th className="p-3">Roll No</th>
                <th className="p-3">Name</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Total Days</th>
                <th className="p-3">Present</th>
                <th className="p-3">Absent</th>
                <th className="p-3 text-right">Attendance %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {reportStats.slice(0, 5).map((s, i) => (
                <tr key={i} className="text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                  <td className="p-3 font-medium">{s.student.rollNumber}</td>
                  <td className="p-3">{s.student.name}</td>
                  <td className="p-3">{s.student.branch}</td>
                  <td className="p-3 text-center">{s.total}</td>
                  <td className="p-3 text-center text-green-600 font-medium">{s.present}</td>
                  <td className="p-3 text-center text-red-600 font-medium">{s.absent}</td>
                  <td className="p-3 text-right">
                    <span className={`px-2 py-1 rounded-md font-bold ${s.percentage >= 75 ? 'bg-green-100 text-green-700 dark:bg-green-900/30' : 'bg-red-100 text-red-700 dark:bg-red-900/30'}`}>
                      {s.percentage}%
                    </span>
                  </td>
                </tr>
              ))}
              {reportStats.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-500">
                    No records found for the selected filters and date range.
                  </td>
                </tr>
              )}
              {reportStats.length > 5 && (
                <tr>
                  <td colSpan={7} className="p-3 text-center text-xs text-gray-400 bg-gray-50/50 dark:bg-gray-900/20">
                    Showing 5 of {reportStats.length} students. Export to see full list.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
