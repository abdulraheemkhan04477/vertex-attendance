import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiPlus, FiEdit2, FiTrash2, FiLayers } from 'react-icons/fi';
import type { FeeStructure } from '../../types';
import { BRANCHES, YEARS } from '../../types';
import { feeStructuresDB } from '../../services/feesDb';
import { useStore } from '../../store/useStore';
import { useToast } from '../../hooks/useToast';
import { Button } from '../ui/Button';
import { FeeStructureModal } from './FeeStructureModal';

export function FeeStructureList() {
  const toast = useToast();
  const { currentUser } = useStore();

  const isManagementAllowed = currentUser?.role === 'superadmin' || currentUser?.role === 'college_admin';

  const [filterBranch, setFilterBranch] = useState<string>('');
  const [filterYear, setFilterYear] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingStructure, setEditingStructure] = useState<FeeStructure | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const structures = useMemo(() => {
    let list = feeStructuresDB.getAll();
    if (filterBranch) list = list.filter(s => s.branch === filterBranch || s.branch === 'All');
    if (filterYear) list = list.filter(s => s.year === filterYear || s.year === 'All');
    return list;
  }, [filterBranch, filterYear, refreshTrigger]);

  const handleDelete = (id: string) => {
    if (!isManagementAllowed) {
      toast.error('Unauthorized: Only Super Admin and Admin can delete fee structures');
      return;
    }

    if (confirm('Are you sure you want to delete this fee structure?')) {
      try {
        feeStructuresDB.delete(id);
        toast.success('Fee structure deleted');
        setRefreshTrigger(prev => prev + 1);
      } catch (err: any) {
        toast.error(err?.message || 'Failed to delete fee structure');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 rounded-xl">
            <FiLayers className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-gray-800 dark:text-white text-base">Fee Structures</h3>
            <p className="text-xs text-gray-500">Configured tuition & academic fee schedules.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filterBranch}
            onChange={(e) => setFilterBranch(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
          >
            <option value="">All Branches</option>
            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
          </select>

          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl text-xs font-medium focus:outline-none dark:text-white"
          >
            <option value="">All Years</option>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>

          {isManagementAllowed && (
            <Button
              onClick={() => { setEditingStructure(null); setIsModalOpen(true); }}
              variant="primary"
              size="sm"
              icon={<FiPlus />}
            >
              Add Fee Structure
            </Button>
          )}
        </div>
      </div>

      {/* Fee Structures Table */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50 text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-semibold border-b border-gray-100 dark:border-gray-700">
                <th className="p-3.5">Course & Branch</th>
                <th className="p-3.5">Academic Class</th>
                <th className="p-3.5">Fee Type</th>
                <th className="p-3.5">Amount (₹)</th>
                <th className="p-3.5">Due Date</th>
                <th className="p-3.5">Session</th>
                {isManagementAllowed && <th className="p-3.5 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-sm">
              {structures.map((s) => (
                <tr key={s.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                  <td className="p-3.5 font-bold text-gray-800 dark:text-white">
                    {s.course} • <span className="text-indigo-600 dark:text-indigo-400">{s.branch}</span>
                  </td>
                  <td className="p-3.5 text-gray-600 dark:text-gray-300">
                    {s.year}, {s.semester}
                  </td>
                  <td className="p-3.5">
                    <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 font-semibold text-xs rounded-lg">
                      {s.feeType}
                    </span>
                  </td>
                  <td className="p-3.5 font-extrabold text-gray-900 dark:text-white">
                    ₹{s.amount.toLocaleString()}
                  </td>
                  <td className="p-3.5 text-xs text-gray-500">
                    {s.dueDate}
                  </td>
                  <td className="p-3.5 text-xs text-gray-500">
                    {s.academicSession}
                  </td>
                  {isManagementAllowed && (
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => { setEditingStructure(s); setIsModalOpen(true); }}
                          className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s.id)}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <FiTrash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {structures.length === 0 && (
                <tr>
                  <td colSpan={isManagementAllowed ? 7 : 6} className="p-8 text-center text-gray-400 text-sm">
                    No fee structures found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <FeeStructureModal
          initialData={editingStructure}
          onClose={() => setIsModalOpen(false)}
          onSuccess={() => setRefreshTrigger(prev => prev + 1)}
        />
      )}
    </div>
  );
}
