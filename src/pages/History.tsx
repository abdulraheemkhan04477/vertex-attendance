import { useState, useMemo, useRef, useEffect } from 'react';
import { FiCalendar, FiSearch, FiDownload, FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { StudentProfile } from '../components/student/StudentProfile';
import { attendanceService } from '../services/attendanceService';
import { studentsDB } from '../services/db';
import { exportToCSV, exportToExcel, exportToPDF } from '../services/exportService';
import { formatDate, formatDateLong, getMonthDays, today } from '../utils/dateUtils';
import { format } from 'date-fns';
import type { AttendanceRecord } from '../types';
import { AttendanceEditModal } from '../components/attendance/AttendanceEditModal';
import { useToast } from '../hooks/useToast';
import { attendanceDB } from '../services/db';
export default function History() {
  const allStudents = useMemo(() => studentsDB.getAll(), []);

  const [viewMode, setViewMode] = useState<'date' | 'student' | 'calendar'>('date');
  const [selectedDate, setSelectedDate] = useState(today());
  const [selectedRoll, setSelectedRoll] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [profileStudent, setProfileStudent] = useState<typeof allStudents[0] | null>(null);
  const [editRecord, setEditRecord] = useState<AttendanceRecord | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  // Tracks IDs optimistically removed from the UI before Supabase confirms
  const [localDeletedIds, setLocalDeletedIds] = useState<Set<string>>(new Set());
  // Prevents duplicate delete requests for the same ID
  const deletingIds = useRef<Set<string>>(new Set());
  const toast = useToast();

  useEffect(() => {
    const handleStorage = () => setRefreshKey((k) => k + 1);
    window.addEventListener('local-storage', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-storage', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Get records based on view mode
  const records = useMemo((): AttendanceRecord[] => {
    let base: AttendanceRecord[];
    switch (viewMode) {
      case 'date':
        base = attendanceService.getByDate(selectedDate)
          .filter((r) => !searchQuery || r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) || r.rollNumber.includes(searchQuery));
        break;
      case 'student':
        if (!selectedRoll) { base = []; break; }
        base = attendanceService.getStudentHistory(selectedRoll).sort((a, b) => b.date.localeCompare(a.date));
        break;
      case 'calendar':
        base = attendanceService.getAll().filter((r) => r.date.startsWith(`${calYear}-${String(calMonth + 1).padStart(2, '0')}`));
        break;
      default:
        base = [];
    }
    // Optimistically hide records that are being / have been deleted
    return localDeletedIds.size > 0 ? base.filter((r) => !localDeletedIds.has(r.id)) : base;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, selectedDate, selectedRoll, searchQuery, calYear, calMonth, refreshKey, localDeletedIds]);

  const calDays = useMemo(() => getMonthDays(calYear, calMonth), [calYear, calMonth]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const datesWithData = useMemo(() => new Set(attendanceService.getUniqueDates()), [refreshKey]);

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    const filename = `History_${viewMode}_${format(new Date(), 'dd-MM-yyyy')}`;
    if (type === 'csv') exportToCSV(records, filename);
    else if (type === 'excel') exportToExcel(records, filename);
    else exportToPDF(records, `Attendance History — ${viewMode}`);
  };

  const handleEditSave = (id: string, changes: Partial<AttendanceRecord>) => {
    attendanceDB.update(id, changes);
    setRefreshKey((k) => k + 1);
    toast.success('Attendance record updated');
  };

  const handleDelete = async (id: string) => {
    // Prevent duplicate delete requests for the same record
    if (deletingIds.current.has(id)) return;
    if (!confirm('Are you sure you want to delete this record?')) return;

    // Mark as in-flight and optimistically hide from UI immediately
    deletingIds.current.add(id);
    setLocalDeletedIds((prev) => new Set(prev).add(id));

    try {
      await attendanceDB.delete(id);
      // Bump refreshKey so computed stats (totals, percentages) stay in sync
      setRefreshKey((k) => k + 1);
      toast.success('Attendance record deleted');
    } catch (err) {
      // Rollback optimistic removal on failure
      setLocalDeletedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.error('Failed to delete record. Please try again.');
    } finally {
      deletingIds.current.delete(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Mode Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-wrap gap-2 mb-4">
          {[
            { mode: 'date' as const, label: '📅 By Date' },
            { mode: 'student' as const, label: '👤 By Student' },
            { mode: 'calendar' as const, label: '🗓 Calendar' },
          ].map(({ mode, label }) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                viewMode === mode
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {viewMode === 'date' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            />
          )}

          {viewMode === 'student' && (
            <select
              value={selectedRoll}
              onChange={(e) => setSelectedRoll(e.target.value)}
              className="px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            >
              <option value="">Select Student...</option>
              {allStudents.map((s) => <option key={s.rollNumber} value={s.rollNumber}>{s.name} — {s.rollNumber}</option>)}
            </select>
          )}
          {viewMode === 'calendar' && (
            <div className="flex items-center gap-2">
              <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear((y) => y - 1); } else setCalMonth((m) => m - 1); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 dark:text-white min-w-[120px] text-center">
                {format(new Date(calYear, calMonth), 'MMMM yyyy')}
              </span>
              <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear((y) => y + 1); } else setCalMonth((m) => m + 1); }}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-600 dark:text-gray-300">
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {viewMode !== 'calendar' && (
            <div className="relative flex-1 min-w-[200px]">
              <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
          )}

          <div className="flex gap-2 ml-auto">
            <Button onClick={() => handleExport('csv')} variant="outline" size="sm" icon={<FiDownload />}>CSV</Button>
            <Button onClick={() => handleExport('excel')} variant="outline" size="sm" icon={<FiDownload />}>Excel</Button>
            <Button onClick={() => handleExport('pdf')} variant="outline" size="sm" icon={<FiDownload />}>PDF</Button>
          </div>
        </div>
      </div>

      {/* Calendar View */}
      {viewMode === 'calendar' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
          <div className="grid grid-cols-7 gap-2 mb-2">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {/* Fill empty days at start */}
            {[...Array((calDays[0].getDay() + 6) % 7)].map((_, i) => <div key={`e-${i}`} />)}
            {calDays.map((day) => {
              const ds = format(day, 'yyyy-MM-dd');
              const hasData = datesWithData.has(ds);
              const isToday2 = ds === today();
              return (
                <button
                  key={ds}
                  onClick={() => hasData && setSelectedDate(ds)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center text-sm transition-all
                    ${isToday2 ? 'ring-2 ring-indigo-500' : ''}
                    ${hasData
                      ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold hover:bg-indigo-200'
                      : 'text-gray-400 dark:text-gray-600 cursor-default'
                    }
                  `}
                >
                  <span>{day.getDate()}</span>
                  {hasData && <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full mt-0.5" />}
                </button>
              );
            })}
          </div>
          {records.length > 0 && (
            <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{records.length} records this month</p>
            </div>
          )}
        </div>
      )}

      {/* Records Table */}
      {viewMode !== 'calendar' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h3 className="text-base font-bold text-gray-800 dark:text-white">
                {viewMode === 'date' ? formatDateLong(selectedDate) :
                 allStudents.find((s) => s.rollNumber === selectedRoll)?.name || 'Select a student'}
              </h3>
              <p className="text-xs text-gray-400 mt-0.5">{records.length} records</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            {records.length === 0 ? (
              <div className="py-16 text-center">
                <FiCalendar className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-sm text-gray-400">No records found</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                    {viewMode !== 'student' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Roll No.</th>}
                    {viewMode !== 'student' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>}
                    {viewMode !== 'date' && <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>}
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Session</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Faculty</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Lec</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Remarks</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id || i} className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors">
                      <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                      {viewMode !== 'student' && <td className="px-4 py-3 text-xs font-mono font-semibold text-indigo-600 dark:text-indigo-400">{r.rollNumber}</td>}
                      {viewMode !== 'student' && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => {
                              const s = allStudents.find((st) => st.rollNumber === r.rollNumber);
                              if (s) setProfileStudent(s);
                            }}
                            className="text-sm font-medium text-gray-800 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          >
                            {r.studentName}
                          </button>
                        </td>
                      )}
                      {viewMode !== 'date' && <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{formatDate(r.date)}</td>}
                      <td className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300">{r.subject}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.faculty}</td>
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{r.lectureNumber}</td>
                      <td className="px-4 py-3"><Badge variant={r.status} label={r.status} dot size="sm" /></td>
                      <td className="px-4 py-3 text-xs text-gray-400">{r.remarks || '—'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setEditRecord(r)}
                            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(r.id)}
                            className="text-xs font-medium text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 px-2 py-1 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      <StudentProfile
        student={profileStudent}
        isOpen={!!profileStudent}
        onClose={() => setProfileStudent(null)}
      />

      <AttendanceEditModal
        isOpen={!!editRecord}
        onClose={() => setEditRecord(null)}
        record={editRecord}
        onSave={handleEditSave}
      />
    </div>
  );
}
