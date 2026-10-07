import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiUsers, FiDollarSign, FiCheckCircle, FiClock, FiTrendingUp } from 'react-icons/fi';
import { useStore } from '../../store/useStore';
import { studentsDB } from '../../services/db';
import { feePaymentsDB, getStudentFeeSummary } from '../../services/feesDb';
import { isSameDepartment, normalizeDepartment } from '../../utils/departmentUtils';

export function FeesDashboard() {
  const { currentUser } = useStore();

  const scopedStudents = useMemo(() => {
    let list = studentsDB.getAll();
    if (!currentUser) return list;

    if (currentUser.role === 'hod' && currentUser.department) {
      list = list.filter(s => isSameDepartment(currentUser.department, s.department, s.branch));
    } else if (currentUser.role === 'teacher') {
      const assignedBranches = (currentUser.assignedClasses || []).map((c: any) => normalizeDepartment(c.branch));
      list = list.filter(s => {
        const sBranch = normalizeDepartment(s.branch);
        if (assignedBranches.includes(sBranch)) return true;
        if (currentUser.department && isSameDepartment(currentUser.department, s.department, s.branch)) return true;
        return false;
      });
    }

    return list;
  }, [currentUser]);

  const stats = useMemo(() => {
    const summaries = scopedStudents.map(s => getStudentFeeSummary(s));

    const totalExpected = summaries.reduce((sum, s) => sum + s.totalFee, 0);
    const totalCollected = summaries.reduce((sum, s) => sum + s.paidFee, 0);
    const totalPending = summaries.reduce((sum, s) => sum + s.pendingFee, 0);

    const paidCount = summaries.filter(s => s.status === 'Paid').length;
    const partialCount = summaries.filter(s => s.status === 'Partial').length;
    const unpaidCount = summaries.filter(s => s.status === 'Unpaid').length;

    const collectionPercentage = totalExpected > 0 ? Math.min(100, Math.round((totalCollected / totalExpected) * 100)) : 0;

    return {
      totalStudents: scopedStudents.length,
      totalExpected,
      totalCollected,
      totalPending,
      paidCount,
      partialCount,
      unpaidCount,
      collectionPercentage,
    };
  }, [scopedStudents]);

  const recentPayments = useMemo(() => {
    let payments = feePaymentsDB.getAll();
    if (currentUser?.role === 'hod' && currentUser.department) {
      const normDept = normalizeDepartment(currentUser.department);
      payments = payments.filter(p => normalizeDepartment(p.branch) === normDept);
    } else if (currentUser?.role === 'teacher') {
      const assignedBranches = (currentUser.assignedClasses || []).map((c: any) => normalizeDepartment(c.branch));
      payments = payments.filter(p => assignedBranches.includes(normalizeDepartment(p.branch)));
    }

    return payments.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()).slice(0, 5);
  }, [currentUser]);

  return (
    <div className="space-y-6">
      {/* Scope Badge */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800 dark:text-white">Fees Overview</h2>
          <p className="text-xs text-gray-500">
            {currentUser?.role === 'hod' ? `Scope: ${currentUser.department} Department` :
             currentUser?.role === 'teacher' ? 'Scope: Assigned Classes' :
             'Scope: Institution Wide'}
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Expected */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Fees Expected</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <FiDollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">₹{stats.totalExpected.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">{stats.totalStudents} enrolled students</p>
        </motion.div>

        {/* Card 2: Total Collected */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Collected</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{stats.totalCollected.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{stats.collectionPercentage}% collected</p>
        </motion.div>

        {/* Card 3: Total Pending */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Pending</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
              <FiClock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">₹{stats.totalPending.toLocaleString()}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">{stats.unpaidCount + stats.partialCount} students pending</p>
        </motion.div>

        {/* Card 4: Fully Paid Count */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fully Paid</span>
            <div className="p-2 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl">
              <FiUsers className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">{stats.paidCount} / {stats.totalStudents}</p>
          <p className="text-xs text-gray-400 mt-1">Cleared all fee dues</p>
        </motion.div>
      </div>

      {/* Fee Collection Progress Bar */}
      <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiTrendingUp className="text-indigo-600" /> Overall Collection Progress
          </span>
          <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">{stats.collectionPercentage}% Collected</span>
        </div>
        <div className="w-full h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${stats.collectionPercentage}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs text-gray-500">
          <span>Collected: ₹{stats.totalCollected.toLocaleString()}</span>
          <span>Pending: ₹{stats.totalPending.toLocaleString()}</span>
        </div>
      </div>

      {/* Breakdown & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Status Distribution */}
        <div className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Fee Status Distribution</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-800/40">
              <span className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">Fully Paid</span>
              <span className="text-sm font-extrabold text-emerald-700 dark:text-emerald-400">{stats.paidCount} Students</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/40">
              <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">Partially Paid</span>
              <span className="text-sm font-extrabold text-amber-700 dark:text-amber-400">{stats.partialCount} Students</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-xl bg-red-50/50 dark:bg-red-900/10 border border-red-100 dark:border-red-800/40">
              <span className="text-xs font-semibold text-red-800 dark:text-red-300">Unpaid</span>
              <span className="text-sm font-extrabold text-red-700 dark:text-red-400">{stats.unpaidCount} Students</span>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="lg:col-span-2 p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-gray-800 dark:text-white">Recent Payments Collected</h3>
          {recentPayments.length > 0 ? (
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {recentPayments.map(p => (
                <div key={p.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{p.studentName}</p>
                    <p className="text-xs text-gray-400">{p.rollNumber} • {p.feeType} • {p.paymentDate}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400">+₹{p.amount.toLocaleString()}</span>
                    <span className="block text-[10px] text-gray-400 font-mono">{p.receiptNo}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">No payment transactions collected yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
