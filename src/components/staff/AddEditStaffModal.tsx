import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { User, UserRole, YEARS, BRANCHES, SEMESTERS_BY_YEAR } from '../../types';
import { useStore } from '../../store/useStore';
import { usersDB, collegesDB } from '../../services/db';

interface AddEditStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  staff: User | null;
  onSave: () => void;
}

export function AddEditStaffModal({ isOpen, onClose, staff, onSave }: AddEditStaffModalProps) {
  const { currentUser } = useStore();
  const [formData, setFormData] = useState<Partial<User>>({
    isActive: true,
    role: 'teacher',
    assignedClasses: [],
  });
  const [password, setPassword] = useState('');
  
  // College details for College Admin creation
  const [collegeName, setCollegeName] = useState('');
  const [collegeCode, setCollegeCode] = useState('');
  const [collegeLogo, setCollegeLogo] = useState('');

  // Setup initial form state based on editing vs creating
  useEffect(() => {
    if (staff) {
      setFormData(staff);
      setPassword('');
    } else {
      // Default role selection based on permissions
      let defaultRole: UserRole = 'teacher';
      if (currentUser?.role === 'superadmin') defaultRole = 'college_admin';
      else if (currentUser?.role === 'college_admin') defaultRole = 'hod';
      
      setFormData({
        username: '',
        name: '',
        email: '',
        role: defaultRole,
        department: currentUser?.role === 'hod' ? currentUser.department : '',
        isActive: true,
        assignedClasses: [],
      });
      setPassword('');
      setCollegeName('');
      setCollegeCode('');
      setCollegeLogo('');
    }
  }, [staff, isOpen, currentUser]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.name || !formData.role) return;

    if (!staff && !password) {
      alert('Password is required for new accounts');
      return;
    }

    if (!staff && formData.role === 'college_admin' && (!collegeName || !collegeCode)) {
      alert('College Name and College Code are required when creating a College Admin');
      return;
    }

    if (staff) {
      // Editing
      const updates: Partial<User> = {
        name: formData.name,
        email: formData.email,
        role: formData.role,
        department: formData.department,
        isActive: formData.isActive,
        assignedClasses: formData.role === 'teacher' ? formData.assignedClasses : [],
      };
      if (password) {
        updates.password = password;
      }
      usersDB.update(staff.id, updates);
    } else {
      // Creating
      let newCollegeId = undefined;
      
      if (formData.role === 'college_admin') {
        const newCollege = collegesDB.add({
          name: collegeName,
          code: collegeCode,
          logoUrl: collegeLogo
        });
        newCollegeId = newCollege.id;
      }

      usersDB.add({
        username: formData.username,
        password: password,
        name: formData.name,
        email: formData.email,
        role: formData.role as UserRole,
        department: formData.department,
        collegeId: newCollegeId, // Set explicitly
        assignedClasses: formData.role === 'teacher' ? formData.assignedClasses : [],
        isActive: formData.isActive ?? true,
        createdAt: new Date().toISOString(),
      });
    }

    onSave();
    onClose();
  };

  const handleAddClass = () => {
    setFormData(prev => ({
      ...prev,
      assignedClasses: [
        ...(prev.assignedClasses || []),
        { year: YEARS[0], branch: BRANCHES[0], semester: SEMESTERS_BY_YEAR[YEARS[0]][0] }
      ]
    }));
  };

  const handleRemoveClass = (index: number) => {
    setFormData(prev => ({
      ...prev,
      assignedClasses: (prev.assignedClasses || []).filter((_, i) => i !== index)
    }));
  };

  const handleClassChange = (index: number, field: string, value: string) => {
    setFormData(prev => {
      const newClasses = [...(prev.assignedClasses || [])];
      newClasses[index] = { ...newClasses[index], [field]: value };
      // Auto-update semester when year changes
      if (field === 'year') {
        newClasses[index].semester = SEMESTERS_BY_YEAR[value][0];
      }
      return { ...prev, assignedClasses: newClasses };
    });
  };

  const availableRoles = () => {
    if (currentUser?.role === 'superadmin') return [{ value: 'college_admin', label: 'College Admin' }];
    if (currentUser?.role === 'college_admin') return [
      { value: 'hod', label: 'HOD' },
      { value: 'teacher', label: 'Teacher' }
    ];
    if (currentUser?.role === 'hod') return [{ value: 'teacher', label: 'Teacher' }];
    return [];
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col"
        >
          <div className="flex justify-between items-center p-6 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {staff ? 'Edit Staff Account' : 'Add New Staff'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto">
            <form id="staff-form" onSubmit={handleSubmit} className="space-y-5">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Username */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Username {staff && <span className="text-gray-400 font-normal">(Cannot change)</span>}
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!staff}
                    value={formData.username || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white disabled:opacity-50"
                  />
                </div>

                {/* Password */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Password {staff && <span className="text-gray-400 font-normal">(Leave blank to keep current)</span>}
                  </label>
                  <input
                    type="password"
                    required={!staff}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                {/* Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={formData.email || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  />
                </div>

                {/* Role */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select
                    value={formData.role || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                    disabled={!!staff && staff.id === 'super-admin-1'}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                  >
                    {availableRoles().map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>

                {/* Active Status */}
                <div className="flex items-center mt-7">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive ?? true}
                      disabled={!!staff && staff.id === 'super-admin-1'}
                      onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 dark:peer-focus:ring-indigo-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-indigo-600"></div>
                    <span className="ml-3 text-sm font-medium text-gray-900 dark:text-gray-300">Account Active</span>
                  </label>
                </div>

                {/* Department (For HOD and Teacher) */}
                {(formData.role === 'hod' || formData.role === 'teacher') && (
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      required
                      disabled={currentUser?.role === 'hod'}
                      value={formData.department || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, department: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white disabled:opacity-50"
                      placeholder="e.g. Computer Science"
                    />
                  </div>
                )}
              </div>

              {/* College Details (Only for Super Admin creating College Admin) */}
              {!staff && formData.role === 'college_admin' && (
                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-4">College Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        College Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                        placeholder="e.g. Vertex Institute"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        College Code <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={collegeCode}
                        onChange={(e) => setCollegeCode(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                        placeholder="e.g. VIT"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        College Logo URL (Optional)
                      </label>
                      <input
                        type="url"
                        value={collegeLogo}
                        onChange={(e) => setCollegeLogo(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-white"
                        placeholder="https://example.com/logo.png"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Assigned Classes (Only for Teachers) */}
              {formData.role === 'teacher' && (
                <div className="mt-6 border-t border-gray-100 dark:border-gray-700 pt-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">Assigned Classes</h3>
                    <Button type="button" size="sm" variant="outline" onClick={handleAddClass} icon={<FiPlus />}>
                      Add Class
                    </Button>
                  </div>
                  
                  {(!formData.assignedClasses || formData.assignedClasses.length === 0) ? (
                    <p className="text-sm text-gray-500 text-center py-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-600">
                      No classes assigned yet. Click "Add Class" to assign one.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {formData.assignedClasses.map((ac, idx) => (
                        <div key={idx} className="flex flex-wrap md:flex-nowrap gap-3 items-center bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                          <select
                            value={ac.year}
                            onChange={(e) => handleClassChange(idx, 'year', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none"
                          >
                            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                          </select>
                          <select
                            value={ac.branch}
                            onChange={(e) => handleClassChange(idx, 'branch', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none"
                          >
                            {BRANCHES.map(b => <option key={b} value={b}>{b}</option>)}
                          </select>
                          <select
                            value={ac.semester}
                            onChange={(e) => handleClassChange(idx, 'semester', e.target.value)}
                            className="flex-1 px-3 py-1.5 text-sm bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg outline-none"
                          >
                            {SEMESTERS_BY_YEAR[ac.year]?.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          
                          <button
                            type="button"
                            onClick={() => handleRemoveClass(idx)}
                            className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          >
                            <FiTrash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-800/50">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" form="staff-form" variant="primary">
              {staff ? 'Save Changes' : 'Create Staff'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
