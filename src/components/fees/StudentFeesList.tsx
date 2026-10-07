import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle } from 'react-icons/fi';
import type { Student } from '../../types';
import { BRANCHES, YEARS, SEMESTERS_BY_YEAR } from '../../types';
import { studentsDB } from '../../services/db';
import { getStudentFeeSummary } from '../../services/feesDb';
import { useStore } from '../../store/useStore';
import { isSameDepartment, normalizeDepartment } from '../../utils/departmentUtils';
import { Button } from '../ui/Button';
import { PaymentModal } from './PaymentModal';

interface StudentFeesListProps {
  onViewHistory?: (rollNumber: string) => void;
}

export function StudentFeesList({ onViewHistory }: StudentFeesListProps) {
  const { currentUser } = useStore();

  const isHod = currentUser?.role === 'hod';
  const isTeacher = currentUser?.role === 'teacher';
  const canCollect = currentUser?.role === 'superadmin' || currentUser?.role === 'college_admin' || currentUser?.role === 'hod';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterBranch, setFilterBranch] = useState<string>(isHod && currentUser?.department ? currentUser.department : '');
  const [filterYear, setFilterYear] = useState<string>('');
  const [filterSemester, setFilterSemester] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');

  const [collectingStudent, setCollectingStudent] = useState<Student | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const availableSemesters = filterYear ? SEMESTERS_BY_YEAR[filterYear] || [] : Object.values(SEMESTERS_BY_YEAR).flat();

  // Role-scoped students
  const filteredStudents = useMemo(() => {
    let list = studentsDB.getAll();

    if (isHod && currentUser?.department) {
      list = list.filter(s => isSameDepartment(currentUser.department, s.department, s.branch));
    } else if (isTeacher) {
      const assignedBranches = (currentUser.assignedClasses || []).map((c: any) => normalizeDepartment(c.branch));
      list = list.filter(s => {
        const sBranch = normalizeDepartment(s.branch);
        if (assignedBranches.includes(sBranch)) return true;
        if (currentUser.department && isSameDepartment(currentUser.department, s.department, s.branch)) return true;
        return false;
      });
    }

    if (filterBranch && !isHod) {
      const normB = normalizeDepartment(filterBranch);
      list = list.filter(s => normalizeDepartment(s.branch) === normB);
    }

    if (filterYear) list = list.filter(s => s.year === filterYear);
    if (filterSemester) list = list.filter(s => s.semester === filterSemester);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.rollNumber.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
      );
    }

    return list;
  }, [currentUser, isHod, isTeacher, filterBranch, filterYear, filterSemester, searchQuery]);

  // Compute student summaries
  const studentSummaries = useMemo(() => {
    let summaries = filteredStudents.map(student => getStudentFeeSummary(student));

    if (filterStatus) {
      summaries = summaries.filter(s => s.status === filterStatus);
    }

    return summaries;
  }, [filteredStudents, filterStatus, refreshTrigger]);

  return (
    <div className="space-y-4">
      {/* Search & Cascading Filter Controls */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-[240px]">
            <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by student name, roll number..."
              className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isHod && (
              <select
                value={filterBranch}
                onChange={(e) => setFilterBranch(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
              >
                <option value="">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            )}

            <select
              value={filterYear}
              onChange={(e) => setFilterYear(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
            >
              <option value="">All Years</option>
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            <select
              value={filterSemester}
              onChange={(e) => setFilterSemester(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
            >
              <option value="">All Semesters</option>
              {Array.from(new Set(availableSemesters)).map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
            >
              <option value="">All Fee Statuses</option>
              <option value="Paid">Paid</option>
              <option value="Partial">Partial</option>
              <option value="Unpaid">Unpaid</option>
            </select>
          </div>
        </div>
      </div>

      {/* Student Fees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <th className="p-3.5">Roll No</th>
                <th className="p-3.5">Student Name</th>
                <th className="p-3.5">Branch & Class</th>
                <th className="p-3.5">Total Fee</th>
                <th className="p-3.5">Paid</th>
                <th className="p-3.5">Pending</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {studentSummaries.map(({ student, totalFee, paidFee, pendingFee, status }) => (
                <tr key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-3.5 font-bold text-gray-800 dark:text-white font-mono">
                    {student.rollNumber}
                  </td>
                  <td className="p-3.5 font-semibold text-gray-900 dark:text-white">
                    {student.name}
                  </td>
                  <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-bold">{student.branch}</span> ({student.year}, {student.semester})
                  </td>
                  <td className="p-3.5 font-extrabold text-gray-900 dark:text-white">
                    ₹{totalFee.toLocaleString()}
                  </td>
                  <td className="p-3.5 font-extrabold text-emerald-600 dark:text-emerald-400">
                    ₹{paidFee.toLocaleString()}
                  </td>
                  <td className="p-3.5 font-extrabold text-amber-600 dark:text-amber-400">
                    ₹{pendingFee.toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                      status === 'Paid'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                        : status === 'Partial'
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    }`}>
                      {status === 'Paid' && <FiCheckCircle className="w-3.5 h-3.5" />}
                      {status === 'Partial' && <FiClock className="w-3.5 h-3.5" />}
                      {status === 'Unpaid' && <FiAlertCircle className="w-3.5 h-3.5" />}
                      {status}
                    </span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {canCollect && (
                        <Button
                          onClick={() => setCollectingStudent(student)}
                          size="sm"
                          variant="primary"
                          icon={<FiDollarSign />}
                        >
                          Collect Fee
                        </Button>
                      )}

                      {onViewHistory && (
                        <Button
                          onClick={() => onViewHistory(student.rollNumber)}
                          size="sm"
                          variant="outline"
                        >
                          History
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {studentSummaries.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-gray-400 text-sm">
                    No student fee records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Fee Modal */}
      {collectingStudent && (
        <PaymentModal
          student={collectingStudent}
          onClose={() => setCollectingStudent(null)}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
