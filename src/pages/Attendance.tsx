import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FiSearch, FiSave, FiRefreshCw, FiCheckCircle, FiXCircle, FiFilter,
  FiDownload, FiUsers, FiChevronLeft, FiChevronRight
} from 'react-icons/fi';
import { AttendanceRow } from '../components/attendance/AttendanceRow';
import { StudentProfile } from '../components/student/StudentProfile';
import { Button } from '../components/ui/Button';
import { studentsDB } from '../services/db';
import { attendanceService } from '../services/attendanceService';
import { exportToCSV, exportToExcel, exportToPDF } from '../services/exportService';
import { useToast } from '../hooks/useToast';
import { today } from '../utils/dateUtils';
import type { Student, AttendanceStatus } from '../types';
import { YEARS, BRANCHES, SEMESTERS_BY_YEAR } from '../types';
import { useStore } from '../store/useStore';
import { normalizeDepartment } from '../utils/departmentUtils';

const PAGE_SIZE = 20;

type FilterType = 'all' | AttendanceStatus;

export default function Attendance() {
  const toast = useToast();
  const { settings, currentUser } = useStore();
  const allStudents = useMemo(() => {
    const list = studentsDB.getAll();
    return list.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
  }, []);

  // Session state
  const [date, setDate] = useState(today());
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [lectureNumber, setLectureNumber] = useState(1);

  // Derived available options
  const availableSemesters = year ? SEMESTERS_BY_YEAR[year] || [] : [];

  // Derived full subject string for storage (now just year/branch/sem)
  const fullSubject = useMemo(() => {
    if (!year || !branch || !semester) return '';
    return `${year}|${branch}|${semester}`;
  }, [year, branch, semester]);

  // Reset dependent fields when parent changes
  useEffect(() => {
    setSemester('');
  }, [year, branch]);

  // Attendance state: rollNumber -> status/remark
  const [statusMap, setStatusMap] = useState<Record<string, AttendanceStatus | null>>({});
  const [remarkMap, setRemarkMap] = useState<Record<string, string>>({});

  // Undo/Redo stacks
  const undoStack = useRef<Array<Record<string, AttendanceStatus | null>>>([]);
  const redoStack = useRef<Array<Record<string, AttendanceStatus | null>>>([]);

  // UI state
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<FilterType>('all');
  const [page, setPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const isPreviousDate = date < today();
  const canEdit = !isPreviousDate || currentUser?.role === 'superadmin' || currentUser?.role === 'college_admin';


  // Students filtered by selected year + branch (the "working set" for attendance).
  // This is separate from the display-level `filtered` which also applies search/status filters.
  const branchFilteredStudents = useMemo(() => {
    let list = allStudents;
    if (year) {
      list = list.filter(s => s.year === year);
    }
    if (branch) {
      const normalizedBranch = normalizeDepartment(branch);
      list = list.filter(s => normalizeDepartment(s.branch) === normalizedBranch);
    }
    return list;
  }, [allStudents, year, branch]);

  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    const handleStorage = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('local-storage', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-storage', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Load existing session data when session params change
  useEffect(() => {
    if (!fullSubject) {
      setStatusMap({});
      setRemarkMap({});
      return;
    }
    const existing = attendanceService.getBySession(date, fullSubject, lectureNumber);
    const sMap: Record<string, AttendanceStatus | null> = {};
    const rMap: Record<string, string> = {};
    branchFilteredStudents.forEach((s) => {
      const rec = existing.find((r) => r.rollNumber === s.rollNumber);
      sMap[s.rollNumber] = rec ? rec.status : null;
      rMap[s.rollNumber] = rec ? rec.remarks : '';
    });
    setStatusMap(sMap);
    setRemarkMap(rMap);
    undoStack.current = [];
    redoStack.current = [];
  }, [date, fullSubject, lectureNumber, branchFilteredStudents, refreshTrigger]);

  const pushUndo = useCallback((prev: Record<string, AttendanceStatus | null>) => {
    undoStack.current = [...undoStack.current.slice(-19), prev];
    redoStack.current = [];
  }, []);

  const handleStatusChange = useCallback((rollNumber: string, status: AttendanceStatus) => {
    setStatusMap((prev) => {
      pushUndo(prev);
      return { ...prev, [rollNumber]: prev[rollNumber] === status ? null : status };
    });
  }, [pushUndo]);

  const handleRemarkChange = useCallback((rollNumber: string, remark: string) => {
    setRemarkMap((prev) => ({ ...prev, [rollNumber]: remark }));
  }, []);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) { toast.info('Nothing to undo'); return; }
    const prev = undoStack.current.pop()!;
    redoStack.current.push(statusMap);
    setStatusMap(prev);
  }, [statusMap, toast]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) { toast.info('Nothing to redo'); return; }
    const next = redoStack.current.pop()!;
    undoStack.current.push(statusMap);
    setStatusMap(next);
  }, [statusMap, toast]);

  const markAll = useCallback((status: AttendanceStatus) => {
    if (!canEdit) return;
    setStatusMap((prev) => {
      pushUndo(prev);
      const next = { ...prev };
      branchFilteredStudents.forEach((s) => { next[s.rollNumber] = status; });
      return next;
    });
    toast.info(`All students marked as ${status}`);
  }, [branchFilteredStudents, pushUndo, toast, canEdit]);

  const reset = useCallback(() => {
    if (!canEdit) return;
    setStatusMap((prev) => {
      pushUndo(prev);
      const next: Record<string, AttendanceStatus | null> = {};
      branchFilteredStudents.forEach((s) => { next[s.rollNumber] = null; });
      return next;
    });
    toast.info('Attendance reset');
  }, [branchFilteredStudents, pushUndo, toast, canEdit]);

  const handleSave = useCallback(async () => {
    if (!canEdit) return;
    if (!fullSubject) { toast.error('Please select Year, Branch, and Semester'); return; }
    
    const faculty = currentUser?.name || settings.facultyName || 'Default Faculty';
    
    const records = branchFilteredStudents
      .filter((s) => statusMap[s.rollNumber])
      .map((s) => ({
        studentId: s.id,
        rollNumber: s.rollNumber,
        studentName: s.name,
        date,
        subject: fullSubject,
        faculty,
        lectureNumber,
        status: statusMap[s.rollNumber]!,
        remarks: remarkMap[s.rollNumber] || '',
        year,
        branch: s.branch,
        semesterNum: semester
      }));
    if (records.length === 0) { toast.warning('Please mark at least one student'); return; }
    setSaving(true);
    attendanceService.saveSession(records);
    setSaving(false);
    toast.success(`✅ Attendance saved for ${records.length} students!`);
  }, [fullSubject, year, branch, semester, settings.facultyName, date, lectureNumber, branchFilteredStudents, statusMap, remarkMap, toast, currentUser, canEdit]);


  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); if (canEdit) handleSave(); }
      if (e.ctrlKey && e.key === 'p') { e.preventDefault(); window.print(); }
      if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (canEdit) handleUndo(); }
      if (e.ctrlKey && e.key === 'y') { e.preventDefault(); if (canEdit) handleRedo(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [handleSave, handleUndo, handleRedo, canEdit]);

  // Filtered + searched + paginated students
  // Starts from branchFilteredStudents (already year+branch filtered) then applies search/status
  const filtered = useMemo(() => {
    let list = branchFilteredStudents;
    
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.includes(q));
    }
    if (filter !== 'all') {
      list = list.filter((s) => statusMap[s.rollNumber] === filter);
    }
    return list;
  }, [branchFilteredStudents, search, filter, statusMap]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  // Stats
  const markedCount = filtered.filter((s) => statusMap[s.rollNumber]).length;
  const presentCount = filtered.filter((s) => statusMap[s.rollNumber] === 'present').length;
  const absentCount  = filtered.filter((s) => statusMap[s.rollNumber] === 'absent').length;
  const lateCount    = filtered.filter((s) => statusMap[s.rollNumber] === 'late').length;
  const leaveCount   = filtered.filter((s) => statusMap[s.rollNumber] === 'leave').length;

  const currentRecords = useMemo(() => {
    if (!fullSubject) return [];
    return filtered.filter((s) => statusMap[s.rollNumber]).map((s) => ({
      id: '', studentId: s.id, rollNumber: s.rollNumber, studentName: s.name,
      date, subject: fullSubject, faculty: currentUser?.name || settings.facultyName || 'Default Faculty', lectureNumber, status: statusMap[s.rollNumber]!,
      remarks: remarkMap[s.rollNumber] || '', timestamp: new Date().toISOString(),
    }));
  }, [filtered, statusMap, remarkMap, date, fullSubject, settings.facultyName, lectureNumber]);

  return (
    <div className="space-y-4">
      {/* Session Config */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Academic Session</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="col-span-2 md:col-span-1">
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => setYear(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            >
              <option value="">Select Year...</option>
              {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
            <select
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            >
              <option value="">Select Branch...</option>
              {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={!year}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white disabled:opacity-50"
            >
              <option value="">Select Sem...</option>
              {availableSemesters.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lecture</label>
            <select
              value={lectureNumber}
              onChange={(e) => setLectureNumber(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>L-{n}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Bulk actions */}
          {canEdit && (
            <>
              <Button onClick={() => markAll('present')} variant="success"  size="sm" icon={<FiCheckCircle />}>Mark All Present</Button>
              <Button onClick={() => markAll('absent')}  variant="danger"   size="sm" icon={<FiXCircle />}>Mark All Absent</Button>
              <Button onClick={reset}                     variant="secondary" size="sm" icon={<FiRefreshCw />}>Reset</Button>
            </>
          )}

          <div className="flex-1" />

          {/* Export */}
          <Button onClick={() => exportToCSV(currentRecords, `Attendance_${date}_${semester}`)} variant="outline" size="sm" icon={<FiDownload />}>CSV</Button>
          <Button onClick={() => exportToExcel(currentRecords, `Attendance_${date}_${semester}`)} variant="outline" size="sm" icon={<FiDownload />}>Excel</Button>
          <Button onClick={() => exportToPDF(currentRecords, `Attendance ${date} - ${semester}`)} variant="outline" size="sm" icon={<FiDownload />}>PDF</Button>

          {/* Save */}
          {canEdit && (
            <Button onClick={handleSave} loading={saving} variant="primary" size="sm" icon={<FiSave />}>
              Save (Ctrl+S)
            </Button>
          )}
        </div>

        {/* Mini stats */}
        <div className="flex flex-wrap gap-3 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          {[
            { label: 'Total',   val: filtered.length, color: 'text-gray-600 dark:text-gray-400' },
            { label: 'Marked',  val: markedCount,   color: 'text-indigo-600' },
            { label: 'Present', val: presentCount,  color: 'text-green-600' },
            { label: 'Absent',  val: absentCount,   color: 'text-red-500' },
            { label: 'Late',    val: lateCount,     color: 'text-yellow-600' },
            { label: 'Leave',   val: leaveCount,    color: 'text-blue-600' },
          ].map(({ label, val, color }) => (
            <div key={label} className="text-center">
              <div className={`text-lg font-black ${color}`}>{val}</div>
              <div className="text-xs text-gray-400">{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Search by name or roll number..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1 overflow-x-auto w-full sm:w-auto flex-shrink-0 hide-scrollbar">
          {(['all', 'present', 'absent', 'late', 'leave'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => { setFilter(f); setPage(1); }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                filter === f
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && statusMap && (
                <span className="ml-1 opacity-70">
                  ({f === 'present' ? presentCount : f === 'absent' ? absentCount : f === 'late' ? lateCount : leaveCount})
                </span>
              )}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
          <FiUsers className="w-4 h-4" />
          <span>{filtered.length} students</span>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase w-10">#</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Roll No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Mark</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Remarks</th>
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center">
                    <FiFilter className="w-8 h-8 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                    <p className="text-sm text-gray-400">No students match your filter</p>
                  </td>
                </tr>
              ) : paginated.map((student, i) => (
                <AttendanceRow
                  key={student.rollNumber}
                  student={student}
                  index={(page - 1) * PAGE_SIZE + i + 1}
                  status={statusMap[student.rollNumber] ?? null}
                  remark={remarkMap[student.rollNumber] ?? ''}
                  onStatusChange={handleStatusChange}
                  onRemarkChange={handleRemarkChange}
                  onStudentClick={setSelectedStudent}
                  readOnly={!canEdit}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setPage(i + 1)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    page === i + 1 ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-40 transition-colors"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Profile Modal */}
      <StudentProfile
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
      />
    </div>
  );
}
