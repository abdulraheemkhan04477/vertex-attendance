import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave, FiCamera } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { studentsDB } from '../../services/db';
import type { Student } from '../../types';

interface StudentProfileEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onSave: () => void;
}

export function StudentProfileEditModal({ isOpen, onClose, student, onSave }: StudentProfileEditModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  
  const [form, setForm] = useState({
    email: '',
    phone: '',
    gender: 'Other',
    dob: '',
    fatherName: '',
    guardianName: '',
    address: '',
    profilePhoto: '',
  });

  useEffect(() => {
    if (student) {
      setForm({
        email: student.email || '',
        phone: student.phone || '',
        gender: student.gender || 'Other',
        dob: student.dob || '',
        fatherName: student.fatherName || '',
        guardianName: student.guardianName || '',
        address: student.address || '',
        profilePhoto: student.profilePhoto || '',
      });
    }
  }, [student, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    
    // Simulate network delay
    await new Promise(r => setTimeout(r, 400)); 

    studentsDB.update(student.id, {
      ...form
    });

    toast.success('Profile updated successfully');
    setSaving(false);
    onSave();
    onClose();
  };

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Photo must be under 2 MB');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({ ...prev, profilePhoto: reader.result as string }));
    };
    reader.readAsDataURL(file);
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg relative z-10 overflow-hidden flex flex-col"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Profile</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <form id="edit-profile-form" onSubmit={handleSubmit} className="space-y-6">
              
              {/* Profile Photo */}
              <div className="flex items-center gap-4">
                <div className="relative flex-shrink-0">
                  {form.profilePhoto ? (
                    <img
                      src={form.profilePhoto}
                      alt="Profile"
                      className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 dark:ring-indigo-700"
                    />
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white text-xl font-bold">
                      {student.name ? student.name.charAt(0).toUpperCase() : '?'}
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow"
                    title="Upload photo"
                  >
                    <FiCamera className="w-3 h-3" />
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoChange}
                  />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</p>
                  <p className="text-xs text-gray-400 mt-0.5">Max size 2 MB.</p>
                  {form.profilePhoto && (
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, profilePhoto: '' }))}
                      className="text-xs text-red-500 hover:text-red-600 mt-1"
                    >
                      Remove photo
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Gender</label>
                  <select
                    value={form.gender}
                    onChange={(e) => setForm({ ...form, gender: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={form.dob}
                    onChange={(e) => setForm({ ...form, dob: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Father's Name</label>
                  <input
                    type="text"
                    value={form.fatherName}
                    onChange={(e) => setForm({ ...form, fatherName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Guardian Name</label>
                  <input
                    type="text"
                    value={form.guardianName}
                    onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
                  <textarea
                    value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white resize-none"
                  />
                </div>
              </div>
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" icon={<FiSave />} form="edit-profile-form" type="submit" loading={saving}>
              Save Profile
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
