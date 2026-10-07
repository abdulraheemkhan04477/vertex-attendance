import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiDollarSign } from 'react-icons/fi';
import type { Student, FeeType, PaymentMethod } from '../../types';
import { feePaymentsDB, feeStructuresDB } from '../../services/feesDb';
import { useToast } from '../../hooks/useToast';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

interface PaymentModalProps {
  student: Student;
  onClose: () => void;
  onSuccess: () => void;
}

const FEE_TYPES: FeeType[] = [
  'Tuition Fee',
  'Examination Fee',
  'Library Fee',
  'Hostel Fee',
  'Transport Fee',
  'Other Fee',
];

const PAYMENT_METHODS: PaymentMethod[] = [
  'Cash',
  'UPI',
  'Card',
  'Bank Transfer',
  'Other',
];

export function PaymentModal({ student, onClose, onSuccess }: PaymentModalProps) {
  const toast = useToast();
  const { currentUser } = useStore();

  const [feeType, setFeeType] = useState<FeeType>('Tuition Fee');
  const [amount, setAmount] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('UPI');
  const [transactionId, setTransactionId] = useState<string>(`TXN-${Date.now().toString().slice(-6)}`);
  const [remarks, setRemarks] = useState<string>('');
  const [saving, setSaving] = useState<boolean>(false);

  // Auto-fill fee amount if structure exists
  const handleFeeTypeChange = (selectedType: FeeType) => {
    setFeeType(selectedType);
    const structures = feeStructuresDB.getByClass(student.year, student.branch, student.semester);
    const matched = structures.find(s => s.feeType === selectedType);
    if (matched) {
      setAmount(String(matched.amount));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid positive payment amount.');
      return;
    }

    if (!paymentDate) {
      toast.error('Payment date is required.');
      return;
    }

    if (!transactionId.trim()) {
      toast.error('Transaction ID / Reference ID is required.');
      return;
    }

    setSaving(true);
    try {
      feePaymentsDB.collect({
        studentId: student.id,
        rollNumber: student.rollNumber,
        studentName: student.name,
        branch: student.branch || student.department || 'General',
        year: student.year || '1st Year',
        semester: student.semester || 'Sem 1',
        feeType,
        amount: numericAmount,
        paymentDate,
        paymentMethod,
        transactionId: transactionId.trim(),
        remarks: remarks.trim() || undefined,
        collectedBy: currentUser?.name || 'Admin',
        collectedByRole: currentUser?.role || 'admin',
      });

      toast.success(`Payment of ₹${numericAmount.toLocaleString()} collected successfully for ${student.name}`);
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to collect payment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
      >
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
              <FiDollarSign className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Collect Fee</h3>
              <p className="text-xs text-gray-500">{student.name} ({student.rollNumber})</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-300 grid grid-cols-2 gap-2">
            <div><span className="text-gray-400">Branch:</span> <strong className="text-gray-800 dark:text-white">{student.branch}</strong></div>
            <div><span className="text-gray-400">Class:</span> <strong className="text-gray-800 dark:text-white">{student.year}, {student.semester}</strong></div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fee Type</label>
            <select
              value={feeType}
              onChange={(e) => handleFeeTypeChange(e.target.value as FeeType)}
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            >
              {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Payment Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25000"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Payment Date</label>
              <input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Payment Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                {PAYMENT_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Transaction / Ref ID</label>
              <input
                type="text"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="e.g. UPI-99881122"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Remarks (Optional)</label>
            <input
              type="text"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. Paid via UPI GPay"
              className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
            />
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving} variant="primary">Collect Fee & Issue Receipt</Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
