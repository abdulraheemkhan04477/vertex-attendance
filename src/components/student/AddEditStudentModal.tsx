import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiSave, FiCamera } from 'react-icons/fi';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { studentsDB } from '../../services/db';
import type { Student } from '../../types';
import { YEARS, BRANCHES, SEMESTERS_BY_YEAR } from '../../types';

interface AddEditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student | null; // null means Add, otherwise Edit
  onSave: () => void;
}

const DEFAULT_FORM = {
  name: '',
  rollNumber: '',
  year: YEARS[0] as string,
  branch: BRANCHES[0] as string,
  semester: '',
  email: '',
  phone: '',
  gender: 'Other',
  dob: '',
  address: '',
  guardianName: '',
  guardianPhone: '',
  fatherName: '',
  motherName: '',
  profilePhoto: '',
  password: '',
  enrollmentYear: new Date().getFullYear().toString(),
  section: 'A',
  department: 'B.Tech Programs',
};

export function AddEditStudentModal({ isOpen, onClose, student, onSave }: AddEditStudentModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (student) {
      setForm({
        ...DEFAULT_FORM,
        ...student,
        fatherName: student.fatherName ?? '',
        motherName: student.motherName ?? '',
        gender: student.gender ?? 'Other',
        profilePhoto: student.profilePhoto ?? '',
      });
    } else {
      setForm(DEFAULT_FORM);
    }
  }, [student, isOpen]);

  // Update semester when year changes if the current semester is no longer valid
  useEffect(() => {
    if (form.year) {
      const sems = SEMESTERS_BY_YEAR[form.year];
      if (sems && sems.length > 0) {
        setForm(prev => {
          if (!prev.semester || !sems.includes(prev.semester)) {
            return { ...prev, semester: sems[0] };
          }
          return prev;
        });
      }
    }
  }, [form.year]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.rollNumber || !form.year || !form.branch || !form.semester) {
      toast.error('Please fill all required fields');
      return;
    }

    setSaving(true);
    
    // Check for duplicate roll number if adding new
    if (!student) {
      const existing = studentsDB.getByRollNumber(form.rollNumber);
      if (existing) {
        toast.error('Student with this roll number already exists');
        setSaving(false);
        return;
      }
    }

    await new Promise(r => setTimeout(r, 400)); // fake delay
    
    const finalForm = { ...form };
    if (!finalForm.password) {
      finalForm.password = finalForm.rollNumber;
    }

    if (student) {
      studentsDB.update(student.id, finalForm);
      toast.success('Student updated successfully');
    } else {
      studentsDB.add(finalForm);
      toast.success('Student added successfully');
    }

    setSaving(false);
    onSave();
    onClose();
  };

  const availableSemesters = form.year ? SEMESTERS_BY_YEAR[form.year] || [] : [];

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
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
        >
          <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white">
              {student ? 'Edit Student' : 'Add New Student'}
            </h2>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto flex-1">
            <form id="student-form" onSubmit={handleSubmit} className="space-y-6">
              
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
                      {form.name ? form.name.charAt(0).toUpperCase() : '?'}
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
                  <p className="text-xs text-gray-400 mt-0.5">Click the camera icon to upload. Max 2 MB.</p>
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
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Academic Info */}
                <div className="space-y-4 md:col-span-2">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Academic Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Full Name *</label>
                      <input
                        required
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        placeholder="John Doe"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Roll Number *</label>
                      <input
                        required
                        type="text"
                        value={form.rollNumber}
                        onChange={(e) => setForm({ ...form, rollNumber: e.target.value })}
                        disabled={!!student} // cannot edit roll number of existing
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white disabled:opacity-50"
                        placeholder="1234567890"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year *</label>
                      <select
                        required
                        value={form.year}
                        onChange={(e) => setForm({ ...form, year: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                      >
                        {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch *</label>
                      <select
                        required
                        value={form.branch}
                        onChange={(e) => setForm({ ...form, branch: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                      >
                        {BRANCHES.map((b) => <option key={b} value={b}>{b}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Semester *</label>
                      <select
                        required
                        value={form.semester}
                        onChange={(e) => setForm({ ...form, semester: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                      >
                        {availableSemesters.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Section</label>
                      <input
                        type="text"
                        value={form.section}
                        onChange={(e) => setForm({ ...form, section: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        placeholder="A, B, C"
                      />
                    </div>
                  </div>
                </div>

                {/* Personal Info */}
                <div className="space-y-4 md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Personal Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Guardian Name</label>
                      <input
                        type="text"
                        value={form.guardianName}
                        onChange={(e) => setForm({ ...form, guardianName: e.target.value })}
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
                        placeholder="Father's full name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mother's Name</label>
                      <input
                        type="text"
                        value={form.motherName}
                        onChange={(e) => setForm({ ...form, motherName: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        placeholder="Mother's full name"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
                      <textarea
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white"
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

              </div>
            </form>
          </div>

          <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 flex-shrink-0 bg-gray-50 dark:bg-gray-800/50">
            <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button variant="primary" icon={<FiSave />} form="student-form" type="submit" loading={saving}>
              {student ? 'Save Changes' : 'Add Student'}
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
