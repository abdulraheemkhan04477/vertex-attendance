import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiPrinter, FiEdit2, FiTrash2, FiClock } from 'react-icons/fi';
import type { FeePayment } from '../../types';
import { feePaymentsDB } from '../../services/feesDb';
import { useStore } from '../../store/useStore';
import { useToast } from '../../hooks/useToast';
import { normalizeDepartment } from '../../utils/departmentUtils';
import { ReceiptModal } from './ReceiptModal';
import { PaymentEditModal } from './PaymentEditModal';

interface PaymentHistoryListProps {
  initialRollNumber?: string;
}

export function PaymentHistoryList({ initialRollNumber }: PaymentHistoryListProps) {
  const toast = useToast();
  const { currentUser } = useStore();

  const isSuperOrAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'college_admin';

  const [searchQuery, setSearchQuery] = useState<string>(initialRollNumber || '');
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [viewingReceipt, setViewingReceipt] = useState<FeePayment | null>(null);
  const [editingPayment, setEditingPayment] = useState<FeePayment | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const payments = useMemo(() => {
    let list = feePaymentsDB.getAll();

    if (currentUser?.role === 'hod' && currentUser.department) {
      const normDept = normalizeDepartment(currentUser.department);
      list = list.filter(p => normalizeDepartment(p.branch) === normDept);
    } else if (currentUser?.role === 'teacher') {
      const assignedBranches = (currentUser.assignedClasses || []).map((c: any) => normalizeDepartment(c.branch));
      list = list.filter(p => assignedBranches.includes(normalizeDepartment(p.branch)));
    }

    if (filterMethod) {
      list = list.filter(p => p.paymentMethod === filterMethod);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(p =>
        p.studentName.toLowerCase().includes(q) ||
        p.rollNumber.toLowerCase().includes(q) ||
        p.receiptNo.toLowerCase().includes(q) ||
        p.transactionId.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());
  }, [currentUser, filterMethod, searchQuery, refreshTrigger]);

  const handleDelete = (id: string) => {
    if (!isSuperOrAdmin) {
      toast.error('Unauthorized: Only Super Admin and Admin can delete payment records');
      return;
    }

    if (confirm('Are you sure you want to delete this payment record? This will adjust student pending fees.')) {
      try {
        feePaymentsDB.delete(id);
        toast.success('Payment record deleted');
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete payment record');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Header */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student name, roll number, receipt no, txn ID..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={filterMethod}
            onChange={(e) => setFilterMethod(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
          >
            <option value="">All Payment Methods</option>
            <option value="Cash">Cash</option>
            <option value="UPI">UPI</option>
            <option value="Card">Card</option>
            <option value="Bank Transfer">Bank Transfer</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <th className="p-3.5">Receipt No & Date</th>
                <th className="p-3.5">Student</th>
                <th className="p-3.5">Fee Type</th>
                <th className="p-3.5">Amount</th>
                <th className="p-3.5">Method & Txn ID</th>
                <th className="p-3.5">Collected By</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-3.5">
                    <span className="font-bold text-gray-900 dark:text-white font-mono text-xs block">{p.receiptNo}</span>
                    <span className="text-xs text-gray-400 flex items-center gap-1 mt-0.5"><FiClock className="w-3 h-3" /> {p.paymentDate}</span>
                  </td>
                  <td className="p-3.5">
                    <span className="font-bold text-gray-900 dark:text-white block">{p.studentName}</span>
                    <span className="text-xs text-gray-400 font-mono">{p.rollNumber} ({p.branch})</span>
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold text-xs rounded-lg">
                      {p.feeType}
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-emerald-600 dark:text-emerald-400 text-base">
                    ₹{p.amount.toLocaleString()}
                  </td>
                  <td className="p-3.5">
                    <span className="font-semibold text-gray-800 dark:text-white text-xs block">{p.paymentMethod}</span>
                    <span className="font-mono text-[11px] text-gray-400 truncate max-w-[120px] block">{p.transactionId}</span>
                  </td>
                  <td className="p-3.5 text-xs text-gray-600 dark:text-gray-300">
                    <span className="font-semibold block">{p.collectedBy}</span>
                    <span className="text-[10px] text-gray-400 uppercase">{p.collectedByRole}</span>
                  </td>
                  <td className="p-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setViewingReceipt(p)}
                        className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="View & Print Receipt"
                      >
                        <FiPrinter className="w-4 h-4" />
                      </button>

                      {isSuperOrAdmin && (
                        <>
                          <button
                            onClick={() => setEditingPayment(p)}
                            className="p-1.5 text-gray-500 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Edit Payment Record"
                          >
                            <FiEdit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                            title="Delete Payment Record"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {payments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400 text-sm">
                    No payment history records found matching your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {viewingReceipt && (
        <ReceiptModal
          payment={viewingReceipt}
          onClose={() => setViewingReceipt(null)}
        />
      )}

      {editingPayment && (
        <PaymentEditModal
          payment={editingPayment}
          onClose={() => setEditingPayment(null)}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
