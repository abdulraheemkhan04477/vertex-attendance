import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiUsers, FiAlertTriangle, FiAward, FiPlus, FiEdit2, FiTrash2 } from 'react-icons/fi';
import { StudentProfile } from '../components/student/StudentProfile';
import { AddEditStudentModal } from '../components/student/AddEditStudentModal';
import { ProgressBar } from '../components/ui/ProgressBar';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { studentsDB } from '../services/db';
import { attendanceService } from '../services/attendanceService';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { isSameDepartment } from '../utils/departmentUtils';
import type { Student } from '../types';

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0] || '').join('').toUpperCase();
}

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600', 'from-blue-500 to-cyan-500',
  'from-green-500 to-teal-500', 'from-orange-500 to-red-500',
  'from-pink-500 to-rose-600', 'from-violet-500 to-indigo-600',
];

export default function Students() {
  const toast = useToast();
  const { currentUser } = useStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const allStudents = useMemo(() => {
    let list = studentsDB.getAll();
    if (currentUser?.role === 'hod' && currentUser.department) {
      list = list.filter(s => isSameDepartment(currentUser.department, s.department, s.branch));
    }
    return list.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true }));
  }, [refreshTrigger, currentUser]);
  const allStats = useMemo(() => attendanceService.getAllStudentStats(), [refreshTrigger]);
  
  const statsMap = useMemo(() => {
    const m = new Map<string, number>();
    allStats.forEach((s) => m.set(s.student.rollNumber, s.percentage));
    return m;
  }, [allStats]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'low' | 'ok' | 'perfect'>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  
  // CRUD state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const filtered = useMemo(() => {
    let list = allStudents;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((s) => s.name.toLowerCase().includes(q) || s.rollNumber.includes(q));
    }
    if (filter !== 'all') {
      list = list.filter((s) => {
        const pct = statsMap.get(s.rollNumber) ?? 0;
        if (filter === 'low')    return pct < 75;
        if (filter === 'ok')     return pct >= 75 && pct < 100;
        if (filter === 'perfect') return pct === 100;
        return true;
      });
    }
    return list;
  }, [allStudents, search, filter, statsMap]);

  const lowCount     = allStudents.filter((s) => (statsMap.get(s.rollNumber) ?? 0) < 75 && (statsMap.get(s.rollNumber) ?? 0) > 0).length;
  const perfectCount = allStudents.filter((s) => statsMap.get(s.rollNumber) === 100).length;

  const handleAddStudent = () => {
    setEditingStudent(null);
    setIsModalOpen(true);
  };

  const handleEditStudent = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    setEditingStudent(student);
    setIsModalOpen(true);
  };

  const handleDeleteStudent = (e: React.MouseEvent, student: Student) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete ${student.name}? This will NOT delete their attendance records.`)) {
      studentsDB.delete(student.id);
      toast.success('Student deleted');
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleSaveStudent = useCallback(() => {
    setRefreshTrigger(prev => prev + 1);
  }, []);

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <FiUsers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{allStudents.length}</p>
            <p className="text-xs text-gray-500">Total Students</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
            <FiAlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-red-500">{lowCount}</p>
            <p className="text-xs text-gray-500">Below 75%</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-yellow-100 dark:bg-yellow-900/30 rounded-xl flex items-center justify-center">
            <FiAward className="w-5 h-5 text-yellow-500" />
          </div>
          <div>
            <p className="text-2xl font-black text-yellow-500">{perfectCount}</p>
            <p className="text-xs text-gray-500">Perfect (100%)</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or roll number..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>
        
        {/* Actions */}
        <Button onClick={handleAddStudent} variant="primary" size="sm" icon={<FiPlus />}>
          Add Student
        </Button>

        {/* Filter */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1">
          {[
            { id: 'all' as const, label: 'All' },
            { id: 'low' as const, label: '⚠ Low' },
            { id: 'ok' as const, label: '✓ OK' },
            { id: 'perfect' as const, label: '🌟 Perfect' },
          ].map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setFilter(id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                filter === id ? 'bg-indigo-600 text-white shadow' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {/* View mode */}
        <div className="flex items-center gap-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl p-1">
          {['grid', 'list'].map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m as 'grid' | 'list')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${viewMode === m ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'}`}
            >
              {m === 'grid' ? '⊞' : '☰'} {m}
            </button>
          ))}
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">{filtered.length} students</span>
      </div>

      {/* Grid View */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          <AnimatePresence>
            {filtered.map((student, i) => {
              const pct = statsMap.get(student.rollNumber) ?? 0;
              const hasData = (statsMap.get(student.rollNumber) ?? -1) >= 0 && attendanceService.getStudentHistory(student.rollNumber).length > 0;
              const colorIdx = (parseInt(student.id) || 0) % AVATAR_COLORS.length;
              return (
                <motion.div
                  key={student.rollNumber}
                  layout
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: Math.min(i * 0.03, 0.5) }}
                  onClick={() => setSelectedStudent(student)}
                  className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 text-center hover:shadow-md hover:border-indigo-200 dark:hover:border-indigo-700 transition-all group relative cursor-pointer"
                >
                  {/* Actions overlay */}
                  <div className="absolute top-2 right-2 flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button 
                      onClick={(e) => handleEditStudent(e, student)}
                      className="p-1.5 bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 rounded-lg shadow hover:bg-indigo-50 dark:hover:bg-gray-600"
                      title="Edit Student"
                    >
                      <FiEdit2 className="w-3 h-3" />
                    </button>
                    <button 
                      onClick={(e) => handleDeleteStudent(e, student)}
                      className="p-1.5 bg-white dark:bg-gray-700 text-red-500 rounded-lg shadow hover:bg-red-50 dark:hover:bg-gray-600"
                      title="Delete Student"
                    >
                      <FiTrash2 className="w-3 h-3" />
                    </button>
                  </div>

                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-sm font-bold mx-auto mb-2 group-hover:scale-110 transition-transform`}>
                    {getInitials(student.name)}
                  </div>
                  <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-tight mb-0.5 line-clamp-2">{student.name}</p>
                  <p className="text-xs text-gray-400 font-mono mb-2">{student.rollNumber.slice(-4)}</p>
                  {hasData ? (
                    <>
                      <div className={`text-sm font-black mb-1 ${pct < 75 ? 'text-red-500' : pct === 100 ? 'text-green-600' : 'text-indigo-600'}`}>{pct}%</div>
                      <ProgressBar value={pct} size="sm" />
                    </>
                  ) : (
                    <span className="text-xs text-gray-300 dark:text-gray-600">No data</span>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/60 border-b border-gray-100 dark:border-gray-700">
                {['#', 'Student', 'Roll Number', 'Attendance %', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => {
                const pct = statsMap.get(student.rollNumber) ?? 0;
                const hasData = attendanceService.getStudentHistory(student.rollNumber).length > 0;
                const colorIdx = (parseInt(student.id) || 0) % AVATAR_COLORS.length;
                return (
                  <tr 
                    key={student.rollNumber} 
                    className="border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/40 transition-colors cursor-pointer"
                    onClick={() => setSelectedStudent(student)}
                  >
                    <td className="px-4 py-3 text-xs text-gray-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${AVATAR_COLORS[colorIdx]} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                          {getInitials(student.name)}
                        </div>
                        <span className="text-sm font-semibold text-gray-800 dark:text-gray-200">{student.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-indigo-600 dark:text-indigo-400">{student.rollNumber}</td>
                    <td className="px-4 py-3 w-36">
                      {hasData ? <ProgressBar value={pct} size="sm" showLabel /> : <span className="text-xs text-gray-400">No data</span>}
                    </td>
                    <td className="px-4 py-3">
                      {!hasData ? <span className="text-xs text-gray-300">—</span> :
                       pct < 75 ? <Badge variant="absent" label="Low" dot size="sm" /> :
                       pct === 100 ? <Badge variant="present" label="Perfect" dot size="sm" /> :
                       <Badge variant="present" label="OK" dot size="sm" />}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => handleEditStudent(e, student)}
                          className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                          title="Edit Student"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => handleDeleteStudent(e, student)}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                          title="Delete Student"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <StudentProfile
        student={selectedStudent}
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        isAdmin={true}
        onSave={handleSaveStudent}
      />

      <AddEditStudentModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        student={editingStudent}
        onSave={handleSaveStudent}
      />
    </div>
  );
}
