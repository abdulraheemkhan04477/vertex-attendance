import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiLayers } from 'react-icons/fi';
import type { FeeStructure, FeeType } from '../../types';
import { BRANCHES, YEARS, SEMESTERS_BY_YEAR } from '../../types';
import { feeStructuresDB } from '../../services/feesDb';
import { useToast } from '../../hooks/useToast';
import { useStore } from '../../store/useStore';
import { Button } from '../ui/Button';

interface FeeStructureModalProps {
  initialData?: FeeStructure | null;
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

export function FeeStructureModal({ initialData, onClose, onSuccess }: FeeStructureModalProps) {
  const toast = useToast();
  const { currentUser } = useStore();

  const [course, setCourse] = useState<string>(initialData?.course || 'B.Tech');
  const [branch, setBranch] = useState<string>(initialData?.branch || 'EC/ECE');
  const [year, setYear] = useState<string>(initialData?.year || '1st Year');
  const [semester, setSemester] = useState<string>(initialData?.semester || 'Sem 1');
  const [feeType, setFeeType] = useState<FeeType>(initialData?.feeType || 'Tuition Fee');
  const [amount, setAmount] = useState<string>(initialData?.amount ? String(initialData.amount) : '');
  const [dueDate, setDueDate] = useState<string>(initialData?.dueDate || '2026-11-30');
  const [academicSession, setAcademicSession] = useState<string>(initialData?.academicSession || '2024-2025');
  const [saving, setSaving] = useState<boolean>(false);

  const availableSemesters = year && year !== 'All' ? SEMESTERS_BY_YEAR[year] || [] : Object.values(SEMESTERS_BY_YEAR).flat();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid positive fee amount');
      return;
    }

    if (!dueDate) {
      toast.error('Due date is required');
      return;
    }

    setSaving(true);
    try {
      if (initialData) {
        feeStructuresDB.update(initialData.id, {
          course,
          branch,
          year,
          semester,
          feeType,
          amount: numericAmount,
          dueDate,
          academicSession,
        });
        toast.success('Fee structure updated successfully');
      } else {
        feeStructuresDB.add({
          course,
          branch,
          year,
          semester,
          feeType,
          amount: numericAmount,
          dueDate,
          academicSession,
          createdBy: currentUser?.id || 'admin',
        });
        toast.success('Fee structure created successfully');
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save fee structure');
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
              <FiLayers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-800 dark:text-white text-base">
              {initialData ? 'Edit Fee Structure' : 'Add Fee Structure'}
            </h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700">
            <FiX className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Course</label>
              <input
                type="text"
                value={course}
                onChange={(e) => setCourse(e.target.value)}
                placeholder="e.g. B.Tech"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Branch</label>
              <select
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                <option value="All">All Branches</option>
                {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Year</label>
              <select
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                <option value="All">All Years</option>
                {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Semester</label>
              <select
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                <option value="All">All Semesters</option>
                {Array.from(new Set(availableSemesters)).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Fee Type</label>
              <select
                value={feeType}
                onChange={(e) => setFeeType(e.target.value as FeeType)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              >
                {FEE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Amount (₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 45000"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Academic Session</label>
              <input
                type="text"
                value={academicSession}
                onChange={(e) => setAcademicSession(e.target.value)}
                placeholder="e.g. 2024-2025"
                className="w-full px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
            <Button type="submit" loading={saving} variant="primary">
              {initialData ? 'Update Structure' : 'Create Structure'}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
