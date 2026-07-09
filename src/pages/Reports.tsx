import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiDownload, FiFileText, FiCalendar, FiPrinter } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { attendanceService } from '../services/attendanceService';
import { exportToCSV, exportToExcel, exportToPDF, exportStudentReportToExcel, exportStudentReportToPDF, printAttendance } from '../services/exportService';
import { formatDate, today, getMonthRange } from '../utils/dateUtils';
import { format, startOfWeek, endOfWeek, subWeeks, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useToast } from '../hooks/useToast';

type ReportType = 'daily' | 'weekly' | 'monthly' | 'semester';

export default function Reports() {
  const toast = useToast();
  const todayStr = today();
  const [activeReport, setActiveReport] = useState<ReportType>('daily');
  const [customDate, setCustomDate] = useState(todayStr);
  const [customMonth, setCustomMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [loading, setLoading] = useState<string | null>(null);

  const getRecords = () => {
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
  };

  const records = useMemo(getRecords, [activeReport, customDate, customMonth]);
  const allStudentStats = useMemo(() => attendanceService.getAllStudentStats(), []);

  const getTitle = () => {
    switch (activeReport) {
      case 'daily':   return `Daily Attendance Report — ${formatDate(customDate)}`;
      case 'weekly':  return `Weekly Attendance Report — Week of ${formatDate(customDate)}`;
      case 'monthly': return `Monthly Attendance Report — ${format(new Date(customMonth + '-01'), 'MMMM yyyy')}`;
      case 'semester': return 'Semester Attendance Report';
    }
  };

  const getFilename = () => {
    switch (activeReport) {
      case 'daily':   return `Daily_Report_${customDate}`;
      case 'weekly':  return `Weekly_Report_${customDate}`;
      case 'monthly': return `Monthly_Report_${customMonth}`;
      case 'semester': return 'Semester_Report';
    }
  };

  const doExport = async (type: 'csv' | 'excel' | 'pdf' | 'print' | 'student-excel' | 'student-pdf') => {
    setLoading(type);
    await new Promise((r) => setTimeout(r, 300));
    const title = getTitle();
    const filename = getFilename();

    try {
      if (type === 'csv') exportToCSV(records, filename);
      else if (type === 'excel') exportToExcel(records, filename);
      else if (type === 'pdf') exportToPDF(records, title);
      else if (type === 'print') printAttendance(records, title);
      else if (type === 'student-excel') exportStudentReportToExcel(allStudentStats, `Student_Report_${filename}`);
      else if (type === 'student-pdf') exportStudentReportToPDF(allStudentStats, `Student Summary — ${title}`);
      toast.success('Report generated successfully!');
    } catch {
      toast.error('Failed to generate report');
    }
    setLoading(null);
  };

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
        <div className="flex flex-wrap gap-3 items-end">
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
      </div>

      {/* Report Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-800 dark:text-white">{getTitle()}</h3>
            <p className="text-sm text-gray-400 mt-0.5">{records.length} attendance records found</p>
          </div>
          <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-3 py-1 rounded-full font-semibold">
            {records.length} records
          </span>
        </div>

        {/* Export Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-5">
          {[
            { id: 'csv' as const, icon: '📄', label: 'Export CSV', color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400' },
            { id: 'excel' as const, icon: '📊', label: 'Export Excel', color: 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400' },
            { id: 'pdf' as const, icon: '📕', label: 'Export PDF', color: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400' },
            { id: 'print' as const, icon: '🖨', label: 'Print Report', color: 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300' },
            { id: 'student-excel' as const, icon: '📈', label: 'Student Summary Excel', color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400' },
            { id: 'student-pdf' as const, icon: '📑', label: 'Student Summary PDF', color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800 text-purple-700 dark:text-purple-400' },
          ].map(({ id, icon, label, color }) => (
            <motion.button
              key={id}
              whileTap={{ scale: 0.97 }}
              onClick={() => doExport(id)}
              disabled={!!loading}
              className={`flex items-center gap-3 px-4 py-3 border rounded-xl font-semibold text-sm transition-all hover:shadow-sm disabled:opacity-50 ${color}`}
            >
              <span className="text-xl">{loading === id ? '⏳' : icon}</span>
              <span>{loading === id ? 'Generating...' : label}</span>
            </motion.button>
          ))}
        </div>

        {/* Preview Table */}
        {records.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-100 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/60">
                  {['#', 'Roll No.', 'Name', 'Date', 'Subject', 'Faculty', 'Lec', 'Status'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.slice(0, 10).map((r, i) => (
                  <tr key={r.id || i} className="border-t border-gray-50 dark:border-gray-700">
                    <td className="px-4 py-2 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-2 text-xs font-mono text-indigo-600 dark:text-indigo-400">{r.rollNumber}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-800 dark:text-gray-200">{r.studentName}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{formatDate(r.date)}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.subject}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.faculty}</td>
                    <td className="px-4 py-2 text-xs text-gray-500">{r.lectureNumber}</td>
                    <td className="px-4 py-2">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                        ${r.status === 'present' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${r.status === 'absent'  ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'     : ''}
                        ${r.status === 'late'    ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${r.status === 'leave'   ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'   : ''}
                      `}>
                        {r.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {records.length > 10 && (
              <div className="px-4 py-2 text-xs text-gray-400 bg-gray-50 dark:bg-gray-700/30 border-t border-gray-100 dark:border-gray-700">
                ... and {records.length - 10} more records (included in export)
              </div>
            )}
          </div>
        ) : (
          <div className="py-12 text-center">
            <FiFileText className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No records found for the selected period</p>
          </div>
        )}
      </div>
    </div>
  );
}
