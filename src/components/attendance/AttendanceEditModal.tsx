import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave } from 'react-icons/fi';
import { Button } from '../ui/Button';
import type { AttendanceRecord } from '../../types';

interface AttendanceEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: AttendanceRecord | null;
  onSave: (id: string, changes: Partial<AttendanceRecord>) => void;
}

export function AttendanceEditModal({ isOpen, onClose, record, onSave }: AttendanceEditModalProps) {
  const [status, setStatus] = useState<AttendanceRecord['status']>('present');
  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (record) {
      setStatus(record.status);
      setRemarks(record.remarks || '');
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(record.id, { status, remarks });
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 w-full max-w-md relative"
        >
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
          >
            <FiX className="w-5 h-5" />
          </button>
          
          <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-1">Edit Attendance</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Updating record for <span className="font-semibold">{record.studentName}</span>
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Status</label>
              <div className="grid grid-cols-2 gap-2">
                {(['present', 'absent', 'late', 'leave'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`px-4 py-2 text-sm font-semibold rounded-xl capitalize transition-colors ${
                      status === s
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Remarks</label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Optional notes about this attendance..."
                rows={3}
                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white resize-none"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" icon={<FiSave />}>
                Save Changes
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
