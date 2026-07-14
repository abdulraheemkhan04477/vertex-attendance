import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiCalendar, FiClock, FiCheckCircle, FiXCircle } from 'react-icons/fi';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { leavesDB } from '../../services/db';
import type { LeaveRequest } from '../../types';
import { studentAuthService } from '../../services/auth';

export default function LeaveApply() {
  const [currentStudent, setCurrentStudent] = useState(studentAuthService.getCurrentStudent());
  const toast = useToast();
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ startDate: '', endDate: '', reason: '' });

  useEffect(() => {
    if (currentStudent) {
      setLeaves(leavesDB.getByStudent(currentStudent.rollNumber));
    }
    const handleStorage = () => {
      const updated = studentAuthService.getCurrentStudent();
      if (updated) setCurrentStudent(updated);
    };
    window.addEventListener('local-storage', handleStorage);
    return () => window.removeEventListener('local-storage', handleStorage);
  }, [currentStudent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudent) return;
    if (!form.startDate || !form.endDate || !form.reason) {
      toast.error('All fields are required');
      return;
    }
    
    const newLeave = leavesDB.add({
      studentId: currentStudent.id,
      rollNumber: currentStudent.rollNumber,
      studentName: currentStudent.name,
      startDate: form.startDate,
      endDate: form.endDate,
      reason: form.reason
    });
    
    setLeaves(prev => [newLeave, ...prev]);
    setShowModal(false);
    setForm({ startDate: '', endDate: '', reason: '' });
    toast.success('Leave applied successfully');
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiCalendar className="text-indigo-600 dark:text-indigo-400" />
            My Leaves
          </h2>
          <p className="text-gray-600 dark:text-gray-400">View and apply for leaves.</p>
        </div>
        <Button onClick={() => setShowModal(true)}>Apply for Leave</Button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
                <th className="p-4">Dates</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Applied At</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {leaves.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    You have not applied for any leaves yet.
                  </td>
                </tr>
              ) : (
                leaves.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime()).map((leave) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={leave.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300 max-w-xs truncate" title={leave.reason}>
                      {leave.reason}
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      {new Date(leave.appliedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium capitalize
                        ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>
                        {leave.status === 'pending' && <FiClock />}
                        {leave.status === 'approved' && <FiCheckCircle />}
                        {leave.status === 'rejected' && <FiXCircle />}
                        {leave.status}
                      </span>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md shadow-2xl"
          >
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4">Apply for Leave</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                  <input
                    type="date"
                    min={form.startDate}
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">Reason</label>
                <textarea
                  value={form.reason}
                  onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
                  className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white h-24 resize-none"
                  placeholder="Reason for leave"
                />
              </div>
              <div className="flex gap-3 justify-end mt-6">
                <Button type="button" variant="outline" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Submit Request</Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
