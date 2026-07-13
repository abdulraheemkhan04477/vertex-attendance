import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiFileText, FiCheck, FiX } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { leavesDB, studentsDB } from '../services/db';
import type { LeaveRequest } from '../types';
import { useAuth } from '../hooks/useAuth';
import { useStore } from '../store/useStore';

export default function Leaves() {
  const { currentUser } = useAuth();
  const { settings } = useStore();
  const toast = useToast();
  
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    // Only fetch leaves for the current college if user is college admin
    const allLeaves = leavesDB.getAll();
    if (currentUser?.role === 'superadmin') {
      setLeaves(allLeaves);
    } else {
      setLeaves(allLeaves.filter(l => l.collegeId === settings.collegeId));
    }
  }, [currentUser, settings.collegeId]);

  const handleUpdateStatus = (id: string, status: 'approved' | 'rejected') => {
    leavesDB.update(id, { 
      status, 
      reviewedBy: currentUser?.name || 'Admin', 
      reviewedAt: new Date().toISOString() 
    });
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status, reviewedBy: currentUser?.name, reviewedAt: new Date().toISOString() } : l));
    toast.success(`Leave ${status} successfully`);
  };

  const filteredLeaves = leaves.filter(l => filter === 'all' || l.status === filter).sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <FiFileText className="text-indigo-600 dark:text-indigo-400" />
            Leave Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">Review and manage student leave requests.</p>
        </div>
        
        <div className="flex gap-2">
          {['pending', 'approved', 'rejected', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                filter === f 
                  ? 'bg-indigo-600 text-white' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-sm font-medium text-gray-500 dark:text-gray-400">
                <th className="p-4">Student</th>
                <th className="p-4">Dates</th>
                <th className="p-4">Reason</th>
                <th className="p-4">Applied At</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredLeaves.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No {filter !== 'all' ? filter : ''} leave requests found.
                  </td>
                </tr>
              ) : (
                filteredLeaves.map((leave) => (
                  <motion.tr
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    key={leave.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-medium text-gray-900 dark:text-white">{leave.studentName}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">{leave.rollNumber}</div>
                      {(() => {
                        const student = studentsDB.getByRollNumber(leave.rollNumber);
                        return student ? (
                          <div className="text-xs text-indigo-600 dark:text-indigo-400 font-medium mt-1">
                            {student.branch} • Sem {student.semester}
                          </div>
                        ) : null;
                      })()}
                    </td>
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
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize
                        ${leave.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : ''}
                        ${leave.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : ''}
                        ${leave.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' : ''}
                      `}>
                        {leave.status}
                      </span>
                    </td>
                    <td className="p-4 text-right flex justify-end gap-2">
                      {leave.status === 'pending' && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(leave.id, 'approved')} className="text-green-600 border-green-200 hover:bg-green-50 dark:border-green-900/50 dark:hover:bg-green-900/20">
                            <FiCheck /> Approve
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(leave.id, 'rejected')} className="text-red-600 border-red-200 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20">
                            <FiX /> Reject
                          </Button>
                        </>
                      )}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
