import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { FiSearch, FiShield, FiPlus, FiEdit2, FiTrash2, FiUserCheck, FiUserX } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { usersDB, collegesDB } from '../services/db';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import type { User, UserRole } from '../types';
import { AddEditStaffModal } from '../components/staff/AddEditStaffModal';

export default function Staff() {
  const toast = useToast();
  const { currentUser } = useStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [search, setSearch] = useState('');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<User | null>(null);

  const allStaff = useMemo(() => {
    let list = usersDB.getAll();
    
    // Role-based visibility
    if (currentUser?.role === 'superadmin') {
      // Superadmin can see college_admin (and themselves, but let's hide superadmin from the list for safety, or at least prevent edit)
      list = list.filter(u => u.role === 'college_admin' || u.role === 'superadmin');
    } else if (currentUser?.role === 'college_admin') {
      // College admin can see hod and teacher
      list = list.filter(u => u.role === 'hod' || u.role === 'teacher');
    } else if (currentUser?.role === 'hod') {
      // HOD can see teachers in their department
      list = list.filter(u => u.role === 'teacher' && u.department === currentUser.department);
    } else {
      list = []; // Teachers see nothing
    }
    
    return list;
  }, [refreshTrigger, currentUser]);

  const filteredStaff = useMemo(() => {
    if (!search.trim()) return allStaff;
    const q = search.toLowerCase();
    return allStaff.filter(s => 
      s.name.toLowerCase().includes(q) || 
      s.username.toLowerCase().includes(q) ||
      s.department?.toLowerCase().includes(q)
    );
  }, [allStaff, search]);

  const handleAddStaff = () => {
    setEditingStaff(null);
    setIsModalOpen(true);
  };

  const handleEditStaff = (staff: User) => {
    if (staff.id === 'super-admin-1' && currentUser?.id !== 'super-admin-1') {
      toast.error("Cannot edit permanent super admin account.");
      return;
    }
    setEditingStaff(staff);
    setIsModalOpen(true);
  };

  const handleDeleteStaff = (staff: User) => {
    if (staff.id === 'super-admin-1') {
      toast.error("Cannot delete permanent super admin account.");
      return;
    }
    if (window.confirm(`Are you sure you want to delete ${staff.name}? This will remove their access permanently.`)) {
      usersDB.delete(staff.id);
      toast.success('Staff account deleted');
      setRefreshTrigger(prev => prev + 1);
    }
  };

  const handleToggleStatus = (staff: User) => {
    if (staff.id === 'super-admin-1') {
      toast.error("Cannot modify permanent super admin account.");
      return;
    }
    usersDB.update(staff.id, { isActive: !staff.isActive });
    toast.success(`Account ${!staff.isActive ? 'activated' : 'deactivated'}`);
    setRefreshTrigger(prev => prev + 1);
  };

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'superadmin': return 'Super Admin';
      case 'college_admin': return 'College Admin';
      case 'hod': return 'HOD';
      case 'teacher': return 'Teacher';
      default: return role;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case 'superadmin': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'college_admin': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400';
      case 'hod': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'teacher': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl flex items-center justify-center">
            <FiShield className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">{allStaff.length}</p>
            <p className="text-xs text-gray-500">Managed Staff</p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[220px]">
          <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, username, or department..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
          />
        </div>
        
        <Button onClick={handleAddStaff} variant="primary" size="sm" icon={<FiPlus />}>
          Add Staff
        </Button>
      </div>

      {/* Staff List */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="p-4">Name / Username</th>
                <th className="p-4">Role</th>
                <th className="p-4">Department</th>
                <th className="p-4">Status</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredStaff.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-500">
                    No staff members found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredStaff.map((staff) => (
                  <motion.tr 
                    key={staff.id} 
                    layout 
                    initial={{ opacity: 0 }} 
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="font-semibold text-gray-900 dark:text-white">{staff.name}</div>
                      <div className="text-sm text-gray-500">{staff.username}</div>
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${getRoleColor(staff.role)}`}>
                        {getRoleLabel(staff.role)}
                      </span>
                      {staff.role === 'college_admin' && staff.collegeId && (
                        <div className="text-xs text-gray-500 mt-1">
                          {collegesDB.getById(staff.collegeId)?.name || 'Unknown College'}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-600 dark:text-gray-300">
                      {staff.department || '-'}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-1 text-xs font-semibold rounded-full border ${
                        staff.isActive 
                          ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' 
                          : 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'
                      }`}>
                        {staff.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {staff.id !== 'super-admin-1' && (
                          <button
                            onClick={() => handleToggleStatus(staff)}
                            className={`p-2 rounded-lg transition-colors ${
                              staff.isActive 
                                ? 'text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20' 
                                : 'text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20'
                            }`}
                            title={staff.isActive ? 'Deactivate' : 'Activate'}
                          >
                            {staff.isActive ? <FiUserX className="w-4 h-4" /> : <FiUserCheck className="w-4 h-4" />}
                          </button>
                        )}
                        <button
                          onClick={() => handleEditStaff(staff)}
                          disabled={staff.id === 'super-admin-1' && currentUser?.id !== 'super-admin-1'}
                          className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors disabled:opacity-50"
                          title="Edit"
                        >
                          <FiEdit2 className="w-4 h-4" />
                        </button>
                        {staff.id !== 'super-admin-1' && (
                          <button
                            onClick={() => handleDeleteStaff(staff)}
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddEditStaffModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        staff={editingStaff}
        onSave={() => setRefreshTrigger(prev => prev + 1)}
      />
    </div>
  );
}
