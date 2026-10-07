import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiDollarSign, FiCheckCircle, FiClock, FiAlertCircle, FiPrinter, FiLayers, FiFileText } from 'react-icons/fi';
import { studentAuthService } from '../../services/auth';
import { getStudentFeeSummary, feePaymentsDB, feeStructuresDB } from '../../services/feesDb';
import type { FeePayment } from '../../types';
import { ReceiptModal } from '../../components/fees/ReceiptModal';
import { Button } from '../../components/ui/Button';

export default function StudentFees() {
  const currentStudent = studentAuthService.getCurrentStudent();

  const [viewingReceipt, setViewingReceipt] = useState<FeePayment | null>(null);

  const summary = useMemo(() => {
    if (!currentStudent) return null;
    return getStudentFeeSummary(currentStudent);
  }, [currentStudent]);

  const applicableStructures = useMemo(() => {
    if (!currentStudent) return [];
    return feeStructuresDB.getByClass(currentStudent.year, currentStudent.branch, currentStudent.semester);
  }, [currentStudent]);

  const paymentHistory = useMemo(() => {
    if (!currentStudent) return [];
    return feePaymentsDB.getByStudentId(currentStudent.id).concat(
      feePaymentsDB.getByRollNumber(currentStudent.rollNumber).filter(p => p.studentId !== currentStudent.id)
    ).sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [currentStudent]);

  if (!currentStudent || !summary) {
    return (
      <div className="p-8 text-center text-gray-500">
        Student account session not found. Please log in again.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">My Fee Details</h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {currentStudent.name} • Roll No: <span className="font-mono font-bold text-gray-700 dark:text-gray-300">{currentStudent.rollNumber}</span> • {currentStudent.branch} ({currentStudent.year}, {currentStudent.semester})
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Fee */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Fee</span>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <FiDollarSign className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 dark:text-white">₹{summary.totalFee.toLocaleString()}</p>
          <p className="text-xs text-gray-400 mt-1">Applicable academic fees</p>
        </motion.div>

        {/* Card 2: Paid Amount */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Total Paid</span>
            <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl">
              <FiCheckCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">₹{summary.paidFee.toLocaleString()}</p>
          <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">{paymentHistory.length} payments made</p>
        </motion.div>

        {/* Card 3: Pending Amount */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Pending Due</span>
            <div className="p-2 bg-amber-50 dark:bg-amber-900/30 text-amber-600 rounded-xl">
              <FiClock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-amber-600 dark:text-amber-400">₹{summary.pendingFee.toLocaleString()}</p>
          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1 font-semibold">Remaining balance</p>
        </motion.div>

        {/* Card 4: Fee Status */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="p-5 rounded-2xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Fee Status</span>
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
              summary.status === 'Paid'
                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                : summary.status === 'Partial'
                ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {summary.status === 'Paid' && <FiCheckCircle className="w-3.5 h-3.5" />}
              {summary.status === 'Partial' && <FiClock className="w-3.5 h-3.5" />}
              {summary.status === 'Unpaid' && <FiAlertCircle className="w-3.5 h-3.5" />}
              {summary.status}
            </span>
          </div>
          <p className="text-lg font-bold text-gray-800 dark:text-white mt-1">
            {summary.status === 'Paid' ? 'All dues cleared!' : summary.status === 'Partial' ? 'Partially Paid' : 'Payment Due'}
          </p>
        </motion.div>
      </div>

      {/* Grid: Fee Structure Breakdown & Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicable Fee Structure */}
        <div className="p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center gap-2">
            <FiLayers className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
            <h3 className="font-bold text-gray-800 dark:text-white text-base">Fee Breakdown</h3>
          </div>

          <div className="divide-y divide-gray-100 dark:divide-gray-700">
            {applicableStructures.map(s => (
              <div key={s.id} className="py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-white">{s.feeType}</p>
                  <p className="text-xs text-gray-400">Due: {s.dueDate}</p>
                </div>
                <span className="font-extrabold text-gray-900 dark:text-white">₹{s.amount.toLocaleString()}</span>
              </div>
            ))}

            {applicableStructures.length === 0 && (
              <p className="text-xs text-gray-400 py-6 text-center">No fee structure configured for your current class.</p>
            )}
          </div>
        </div>

        {/* Payment History */}
        <div className="lg:col-span-2 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiFileText className="text-indigo-600 dark:text-indigo-400 w-5 h-5" />
              <h3 className="font-bold text-gray-800 dark:text-white text-base">My Payment History</h3>
            </div>
            <span className="text-xs font-semibold text-gray-500">{paymentHistory.length} Payments</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                  <th className="p-3">Receipt No</th>
                  <th className="p-3">Fee Type</th>
                  <th className="p-3">Date</th>
                  <th className="p-3">Method & Txn ID</th>
                  <th className="p-3">Amount</th>
                  <th className="p-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                {paymentHistory.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                    <td className="p-3 font-mono font-bold text-gray-800 dark:text-white">{p.receiptNo}</td>
                    <td className="p-3 font-semibold text-gray-700 dark:text-gray-300">{p.feeType}</td>
                    <td className="p-3 text-gray-500">{p.paymentDate}</td>
                    <td className="p-3">
                      <span className="font-bold text-gray-700 dark:text-gray-300 block">{p.paymentMethod}</span>
                      <span className="font-mono text-[10px] text-gray-400">{p.transactionId}</span>
                    </td>
                    <td className="p-3 font-extrabold text-emerald-600 dark:text-emerald-400 text-sm">₹{p.amount.toLocaleString()}</td>
                    <td className="p-3 text-right">
                      <Button
                        onClick={() => setViewingReceipt(p)}
                        size="sm"
                        variant="outline"
                        icon={<FiPrinter />}
                      >
                        Receipt
                      </Button>
                    </td>
                  </tr>
                ))}

                {paymentHistory.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-400 text-xs">
                      No payment records found. Payments made will appear here with downloadable receipts.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Receipt Modal */}
      {viewingReceipt && (
        <ReceiptModal
          payment={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}
    </div>
  );
}
