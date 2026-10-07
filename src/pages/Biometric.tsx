import { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCpu,
  FiSearch,
  FiUsers,
  FiCamera,
  FiShield,
  FiAlertCircle,
  FiPlus,
  FiRefreshCw,
  FiHardDrive,
  FiInfo,
  FiUserCheck,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { studentsDB, faceEnrollmentDB, fingerprintEnrollmentDB } from '../services/db';
import { useToast } from '../hooks/useToast';
import { useStore } from '../store/useStore';
import { isSameDepartment } from '../utils/departmentUtils';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { BRANCHES } from '../types';
import type { Student, FaceEnrollment, FaceEnrollmentStatus, FingerprintEnrollment } from '../types';

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0] || '')
    .join('')
    .toUpperCase();
}

const AVATAR_COLORS = [
  'from-indigo-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-600',
  'from-violet-500 to-indigo-600',
];

export default function Biometric() {
  const toast = useToast();
  const { currentUser } = useStore();
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Listen to local-storage changes
  useEffect(() => {
    const handleStorage = () => setRefreshTrigger((prev) => prev + 1);
    window.addEventListener('local-storage', handleStorage);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('local-storage', handleStorage);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // 1. SCOPED STUDENTS BY USER ROLE & BRANCH SCOPE (Req 10, 11 & 12)
  const scopedStudents = useMemo(() => {
    let list = studentsDB.getAll();
    if (currentUser && currentUser.role !== 'superadmin') {
      const userDept = currentUser.department;
      if (userDept) {
        list = list.filter((s) =>
          isSameDepartment(s.branch || s.department, userDept)
        );
      }
    }
    return list.sort((a, b) =>
      a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true })
    );
  }, [currentUser, refreshTrigger]);

  // 2. FACE ENROLLMENTS MAP
  const faceEnrollmentsMap = useMemo(() => {
    const map = new Map<string, FaceEnrollment>();
    const list = faceEnrollmentDB.getAll();
    list.forEach((e) => {
      map.set(e.rollNumber, e);
      map.set(e.studentId, e);
    });
    return map;
  }, [refreshTrigger]);

  // 3. FINGERPRINT ENROLLMENTS MAP (Req 9 & 10)
  const fingerprintEnrollmentsMap = useMemo(() => {
    const map = new Map<string, FingerprintEnrollment>();
    const list = fingerprintEnrollmentDB.getAll();
    list.forEach((e) => {
      map.set(e.rollNumber, e);
      if (e.studentId) map.set(e.studentId, e);
    });
    return map;
  }, [refreshTrigger]);

  // UI state
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'face' | 'fingerprint'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('all');
  const [selectedSemester, setSelectedSemester] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [biometricFilter, setBiometricFilter] = useState<
    'all' | 'face_enrolled' | 'pending_approval' | 'rejected' | 'not_enrolled'
  >('all');

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reviewEnrollment, setReviewEnrollment] = useState<FaceEnrollment | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');
  const [isAddDeviceModalOpen, setIsAddDeviceModalOpen] = useState(false);
  const [isSetupModalOpen, setIsSetupModalOpen] = useState(false);

  // Future device UI state
  const [newDeviceName, setNewDeviceName] = useState('');
  const [newDeviceType, setNewDeviceType] = useState('ESP32-CAM (Face)');

  // Derived Statistics (Data-accurate from DB for authorized scope)
  const pendingEnrollments = useMemo(() => {
    return scopedStudents
      .map((s) => faceEnrollmentsMap.get(s.rollNumber))
      .filter((e): e is FaceEnrollment => !!e && e.status === 'pending');
  }, [scopedStudents, faceEnrollmentsMap]);

  const approvedCount = useMemo(() => {
    return scopedStudents.filter(
      (s) => faceEnrollmentsMap.get(s.rollNumber)?.status === 'approved'
    ).length;
  }, [scopedStudents, faceEnrollmentsMap]);

  // Fingerprint Enrolled Students Count (Req 9 & 10)
  const fingerprintApprovedCount = useMemo(() => {
    return scopedStudents.filter((s) => {
      const fp = fingerprintEnrollmentsMap.get(s.rollNumber);
      return fp && (fp.status === 'enrolled' || fp.status === 'approved');
    }).length;
  }, [scopedStudents, fingerprintEnrollmentsMap]);

  const pendingCount = pendingEnrollments.length;
  const notEnrolledCount = scopedStudents.length - approvedCount - pendingCount;

  // Filter students based on UI controls
  const filteredStudents = useMemo(() => {
    return scopedStudents.filter((student) => {
      const enrollment = faceEnrollmentsMap.get(student.rollNumber);
      const status: FaceEnrollmentStatus = enrollment?.status || 'not_enrolled';

      // Tab filter
      if (activeTab === 'pending' && status !== 'pending') return false;
      if (activeTab === 'face' && status !== 'approved') return false;
      if (activeTab === 'fingerprint') {
        const fp = fingerprintEnrollmentsMap.get(student.rollNumber);
        const isFpEnrolled = fp && (fp.status === 'enrolled' || fp.status === 'approved');
        if (!isFpEnrolled) return false;
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = student.name.toLowerCase().includes(q);
        const matchesRoll = student.rollNumber.toLowerCase().includes(q);
        if (!matchesName && !matchesRoll) return false;
      }

      // Academic Year Filter
      if (selectedYear !== 'all' && student.year !== selectedYear) return false;

      // Branch Filter
      if (selectedBranch !== 'all') {
        const b = student.branch || student.department || '';
        if (b.toLowerCase() !== selectedBranch.toLowerCase()) return false;
      }

      // Semester Filter
      if (selectedSemester !== 'all' && student.semester !== selectedSemester) return false;

      // Biometric Status Filter
      if (biometricFilter === 'face_enrolled' && status !== 'approved') return false;
      if (biometricFilter === 'pending_approval' && status !== 'pending') return false;
      if (biometricFilter === 'rejected' && status !== 'rejected') return false;
      if (biometricFilter === 'not_enrolled' && status !== 'not_enrolled') return false;

      return true;
    });
  }, [
    scopedStudents,
    faceEnrollmentsMap,
    fingerprintEnrollmentsMap,
    activeTab,
    searchQuery,
    selectedYear,
    selectedBranch,
    selectedSemester,
    biometricFilter,
  ]);

  // Admin Permission Handlers (Req 1)
  const handleGrantPermission = (student: Student) => {
    const granterName = currentUser?.name || currentUser?.username || 'Admin';
    faceEnrollmentDB.grantPermission(student, granterName);
    toast.success(`Face enrollment permission granted to ${student.name}.`);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRevokePermission = (studentRoll: string) => {
    faceEnrollmentDB.revokePermission(studentRoll);
    toast.info(`Face enrollment permission revoked.`);
    setRefreshTrigger((prev) => prev + 1);
  };

  // Admin Approval handlers
  const handleApproveEnrollment = (enrollmentId: string) => {
    const approverName = currentUser?.name || 'Admin';
    faceEnrollmentDB.approve(enrollmentId, approverName);
    toast.success('Face enrollment approved successfully!');
    setReviewEnrollment(null);
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleRejectEnrollment = (enrollmentId: string) => {
    const reason = rejectionReasonInput.trim() || 'Face enrollment could not be verified.';
    faceEnrollmentDB.reject(enrollmentId, reason);
    toast.error('Face enrollment rejected.');
    setReviewEnrollment(null);
    setRejectionReasonInput('');
    setRefreshTrigger((prev) => prev + 1);
  };

  const handleResetEnrollment = (studentRoll: string) => {
    const existing = faceEnrollmentDB.getByRollNumber(studentRoll);
    if (existing) {
      faceEnrollmentDB.delete(existing.id);
      toast.info(`Face enrollment reset for roll number ${studentRoll}.`);
      setSelectedStudent(null);
      setRefreshTrigger((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ─── PAGE HEADER ─────────────────────────────────────────────── */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-100 dark:border-gray-700 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <FiCpu className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Biometric Attendance Management
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Manage student face enrollment approvals & device configurations
                {currentUser?.department && (
                  <span className="font-semibold text-indigo-600 dark:text-indigo-400 ml-1">
                    ({currentUser.department} Scope)
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex flex-wrap items-center gap-2">
          {pendingCount > 0 && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
              <FiClock className="w-3.5 h-3.5" />
              {pendingCount} Pending Approvals
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setRefreshTrigger((prev) => prev + 1)}
            icon={<FiRefreshCw className="w-3.5 h-3.5" />}
          >
            Refresh
          </Button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsSetupModalOpen(true)}
            icon={<FiPlus className="w-3.5 h-3.5" />}
          >
            Enrollment Guide
          </Button>
        </div>
      </div>

      {/* ─── TOP SUMMARY CARDS ────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Scoped Students */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
            <FiUsers className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {scopedStudents.length}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Total Students
            </p>
          </div>
        </motion.div>

        {/* Approved Face Enrollments */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center flex-shrink-0">
            <FiCamera className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {approvedCount}
              </p>
              <span className="text-xs font-semibold text-emerald-600">
                {scopedStudents.length > 0
                  ? Math.round((approvedCount / scopedStudents.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Face Enrolled Students
            </p>
          </div>
        </motion.div>

        {/* Fingerprint Enrolled Students (Req 9) */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
            <FiCpu className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-black text-gray-900 dark:text-white">
                {fingerprintApprovedCount}
              </p>
              <span className="text-xs font-semibold text-purple-600">
                {scopedStudents.length > 0
                  ? Math.round((fingerprintApprovedCount / scopedStudents.length) * 100)
                  : 0}
                %
              </span>
            </div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Fingerprint Enrolled Students
            </p>
          </div>
        </motion.div>

        {/* Pending Approvals */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-amber-100 dark:border-amber-800/40 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 flex items-center justify-center flex-shrink-0">
            <FiClock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {pendingCount}
            </p>
            <p className="text-xs font-medium text-amber-600 dark:text-amber-400 font-bold">
              Pending Approvals
            </p>
          </div>
        </motion.div>

        {/* Not Enrolled */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-4"
        >
          <div className="w-12 h-12 rounded-xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-black text-gray-900 dark:text-white">
              {notEnrolledCount}
            </p>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Not Enrolled
            </p>
          </div>
        </motion.div>
      </div>

      {/* ─── PENDING FACE ENROLLMENTS SECTION (REQ 10, 11 & 14) ──────── */}
      {pendingCount > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-900/10 rounded-2xl p-5 border border-amber-200 dark:border-amber-800 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiClock className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                Pending Face Enrollments ({pendingCount})
              </h3>
            </div>
            <span className="text-xs text-amber-800 dark:text-amber-300 font-medium">
              Review and approve student self-enrollments before face attendance becomes active.
            </span>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-amber-200 dark:border-amber-800 shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-amber-100/50 dark:bg-amber-900/40 border-b border-amber-200 dark:border-amber-800 font-bold uppercase text-amber-900 dark:text-amber-200">
                    <th className="py-3 px-4">Student</th>
                    <th className="py-3 px-4">Roll No</th>
                    <th className="py-3 px-4">Branch</th>
                    <th className="py-3 px-4">Semester</th>
                    <th className="py-3 px-4">Submitted At</th>
                    <th className="py-3 px-4 text-center">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-amber-100 dark:divide-amber-800/30">
                  {pendingEnrollments.map((enr) => (
                    <tr key={enr.id} className="hover:bg-amber-50/60 transition-colors">
                      <td className="py-3 px-4 font-semibold text-gray-900 dark:text-white">
                        {enr.studentName}
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-gray-700 dark:text-gray-300">
                        {enr.rollNumber}
                      </td>
                      <td className="py-3 px-4 font-medium">{enr.branch}</td>
                      <td className="py-3 px-4 font-medium">{enr.semester}</td>
                      <td className="py-3 px-4 text-gray-500 font-mono">
                        {new Date(enr.submittedAt).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Pending Approval
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => {
                            setReviewEnrollment(enr);
                            setRejectionReasonInput('');
                          }}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
                        >
                          Review & Approve
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── TABS & CONTROLS ─────────────────────────────────────────── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-700 pb-3">
          {/* Method Tabs */}
          <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800/80 p-1 rounded-xl">
            {[
              { id: 'all' as const, label: 'All Students', icon: <FiUsers className="w-4 h-4" /> },
              {
                id: 'pending' as const,
                label: `Pending (${pendingCount})`,
                icon: <FiClock className="w-4 h-4 text-amber-500" />,
              },
              {
                id: 'face' as const,
                label: `Approved Face (${approvedCount})`,
                icon: <FiCamera className="w-4 h-4" />,
              },
              { id: 'fingerprint' as const, label: `Fingerprint (${fingerprintApprovedCount})`, icon: <FiCpu className="w-4 h-4" /> },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${isActive
                      ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              );
            })}
          </div>

          <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
            Showing <strong className="text-gray-800 dark:text-white">{filteredStudents.length}</strong> of{' '}
            {scopedStudents.length} students
          </span>
        </div>

        {/* Search & Filters toolbar (Sizing updated to match standard filter components - Req 8) */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-100 dark:border-gray-700 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 lg:col-span-2">
              <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search student by name or roll number"
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium shadow-sm"
              />
            </div>

            {/* Academic Year Filter */}
            <div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium shadow-sm"
              >
                <option value="all">All Years</option>
                <option value="1st Year">1st Year</option>
                <option value="2nd Year">2nd Year</option>
                <option value="3rd Year">3rd Year</option>
                <option value="4th Year">4th Year</option>
              </select>
            </div>

            {/* Branch Filter */}
            <div>
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium shadow-sm"
              >
                <option value="all">All Branches</option>
                {BRANCHES.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            {/* Biometric Status Filter */}
            <div>
              <select
                value={biometricFilter}
                onChange={(e) => setBiometricFilter(e.target.value as any)}
                className="w-full px-3.5 py-2.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white font-medium shadow-sm"
              >
                <option value="all">Biometric Status: All</option>
                <option value="face_enrolled">Face Approved</option>
                <option value="pending_approval">Pending Approval</option>
                <option value="rejected">Rejected</option>
                <option value="not_enrolled">Not Enrolled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ─── STUDENT LIST / TABLE ────────────────────────────────────── */}
      {filteredStudents.length > 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-100 dark:border-gray-700 text-xs uppercase font-semibold text-gray-500 dark:text-gray-400">
                  <th className="py-3.5 px-4">Student</th>
                  <th className="py-3.5 px-4">Roll No</th>
                  <th className="py-3.5 px-4">Branch</th>
                  <th className="py-3.5 px-4">Semester</th>
                  <th className="py-3.5 px-4 text-center">Face Status</th>
                  <th className="py-3.5 px-4 text-center">Fingerprint</th>
                  <th className="py-3.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-xs">
                {filteredStudents.map((student, idx) => {
                  const avatarGradient =
                    AVATAR_COLORS[(parseInt(student.id) || idx) % AVATAR_COLORS.length];
                  const enrollment = faceEnrollmentDB.getByRollNumber(student.rollNumber);
                  const status: FaceEnrollmentStatus = enrollment?.status || 'not_enrolled';
                  const fp = fingerprintEnrollmentsMap.get(student.rollNumber);
                  const isFpEnrolled = fp && (fp.status === 'enrolled' || fp.status === 'approved');

                  return (
                    <tr
                      key={student.id || student.rollNumber}
                      className="hover:bg-gray-50/80 dark:hover:bg-gray-700/40 transition-colors"
                    >
                      {/* Student Info */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl bg-gradient-to-br ${avatarGradient} text-white font-bold flex items-center justify-center flex-shrink-0 text-xs shadow-sm`}
                          >
                            {getInitials(student.name)}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 dark:text-white leading-tight">
                              {student.name}
                            </p>
                            <p className="text-[11px] text-gray-400 font-mono">
                              {student.email || `id: ${student.rollNumber}`}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Roll No */}
                      <td className="py-3 px-4 font-mono font-medium text-gray-700 dark:text-gray-300">
                        {student.rollNumber}
                      </td>

                      {/* Branch */}
                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {student.branch || student.department || 'N/A'}
                      </td>

                      {/* Semester */}
                      <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                        {student.semester || 'N/A'}
                      </td>

                      {/* Face Enrollment Status */}
                      <td className="py-3 px-4 text-center">
                        {status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <FiCheckCircle className="w-3 h-3" /> Approved
                          </span>
                        )}
                        {status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                            <FiClock className="w-3 h-3" /> Pending Approval
                          </span>
                        )}
                        {status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            <FiXCircle className="w-3 h-3" /> Rejected
                          </span>
                        )}
                        {status === 'not_enrolled' && (
                          enrollment?.permissionGranted ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
                              Permission Granted
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200">
                              Permission Locked
                            </span>
                          )
                        )}
                      </td>

                      {/* Fingerprint Enrollment */}
                      <td className="py-3 px-4 text-center">
                        {isFpEnrolled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-300">
                            <FiCheckCircle className="w-3 h-3" /> Enrolled
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-gray-100 dark:bg-gray-700 text-gray-500 border border-gray-200">
                            Not Enrolled
                          </span>
                        )}
                      </td>

                      {/* Action */}
                      <td className="py-3 px-4 text-right space-x-2">
                        {!enrollment?.permissionGranted && (
                          <button
                            onClick={() => handleGrantPermission(student)}
                            className="px-2.5 py-1.5 rounded-lg font-bold text-xs bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 transition-colors"
                            title="Grant Face Enrollment Permission"
                          >
                            Grant Permission
                          </button>
                        )}
                        {status === 'pending' && enrollment && (
                          <button
                            onClick={() => {
                              setReviewEnrollment(enrollment);
                              setRejectionReasonInput('');
                            }}
                            className="px-3 py-1.5 rounded-lg font-bold text-xs bg-amber-500 text-white hover:bg-amber-600 transition-colors shadow-sm"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedStudent(student)}
                          className="px-3 py-1.5 rounded-lg font-semibold text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 transition-colors"
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* ─── EMPTY STATE ────────────────────────────────────────────── */
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-12 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
            <FiCpu className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-1">
            No student enrollment records match criteria
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mx-auto mb-6 leading-relaxed">
            Adjust search keywords or filters above to view biometric enrollment statuses.
          </p>
        </div>
      )}

      {/* ─── ADMIN REVIEW ENROLLMENT MODAL (REQ 14 & 15) ───────────── */}
      <Modal
        isOpen={!!reviewEnrollment}
        onClose={() => setReviewEnrollment(null)}
        title="Face Enrollment Review"
        size="md"
      >
        {reviewEnrollment && (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800">
              <div className="w-12 h-12 rounded-xl bg-amber-500 text-white font-bold flex items-center justify-center text-sm">
                {getInitials(reviewEnrollment.studentName)}
              </div>
              <div>
                <h4 className="font-bold text-gray-900 dark:text-white">
                  {reviewEnrollment.studentName}
                </h4>
                <p className="text-xs font-mono text-gray-500">
                  Roll: {reviewEnrollment.rollNumber} | Branch: {reviewEnrollment.branch} | Semester: {reviewEnrollment.semester}
                </p>
              </div>
            </div>

            <div className="space-y-2 text-xs text-gray-700 dark:text-gray-300">
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="font-semibold text-gray-400">Submitted At:</span>
                <span className="font-mono">
                  {new Date(reviewEnrollment.submittedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100 dark:border-gray-700">
                <span className="font-semibold text-gray-400">Current Status:</span>
                <span className="font-bold text-amber-600 uppercase">Pending Approval</span>
              </div>
            </div>

            {/* Sample Images Preview */}
            {reviewEnrollment.sampleImages && reviewEnrollment.sampleImages.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Captured Face Samples ({reviewEnrollment.sampleImages.length})
                </h5>
                <div className="grid grid-cols-4 gap-2">
                  {reviewEnrollment.sampleImages.map((img, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black"
                    >
                      <img src={img} alt={`Sample ${i + 1}`} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rejection reason prompt */}
            <div className="space-y-1">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                Reason for rejection (Optional if rejecting):
              </label>
              <input
                type="text"
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="e.g. Poor image quality, Face not clearly visible"
                className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setReviewEnrollment(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRejectEnrollment(reviewEnrollment.id)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold"
                icon={<FiX className="w-4 h-4" />}
              >
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApproveEnrollment(reviewEnrollment.id)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                icon={<FiCheck className="w-4 h-4" />}
              >
                Approve Enrollment
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* ─── MODAL: MANAGE STUDENT BIOMETRIC PROFILE ─────────────────── */}
      <Modal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        title="Student Biometric Profile"
        size="md"
      >
        {selectedStudent && (() => {
          const enr = faceEnrollmentDB.getByRollNumber(selectedStudent.rollNumber);
          const status = enr?.status || 'not_enrolled';

          return (
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl">
                <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center text-sm">
                  {getInitials(selectedStudent.name)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white">
                    {selectedStudent.name}
                  </h4>
                  <p className="text-xs font-mono text-gray-400">
                    Roll: {selectedStudent.rollNumber} | Branch: {selectedStudent.branch || selectedStudent.department}
                  </p>
                </div>
              </div>

              {/* Admin Face Enrollment Permission Control (Req 1) */}
              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Admin Face Enrollment Permission
                </h5>

                <div className="p-4 bg-indigo-50/60 dark:bg-indigo-900/20 rounded-xl border border-indigo-100 dark:border-indigo-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <FiShield className="w-6 h-6 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        Face Enrollment Permission
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {enr?.permissionGranted
                          ? `Granted by ${enr.permissionGrantedBy || 'Admin'} on ${new Date(enr.permissionGrantedAt || '').toLocaleDateString()}`
                          : 'Permission not granted yet. Student cannot enroll face until granted.'}
                      </p>
                    </div>
                  </div>

                  {enr?.permissionGranted ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleRevokePermission(selectedStudent.rollNumber)}
                      className="bg-rose-50 text-rose-600 hover:bg-rose-100 border-rose-200 font-bold text-xs"
                      icon={<FiXCircle className="w-3.5 h-3.5" />}
                    >
                      Revoke Permission
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleGrantPermission(selectedStudent)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs"
                      icon={<FiCheckCircle className="w-3.5 h-3.5" />}
                    >
                      Grant Permission
                    </Button>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <h5 className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                  Face Enrollment Status
                </h5>

                <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <FiCamera className="w-6 h-6 text-indigo-600" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                        Face Recognition System
                      </p>
                      <p className="text-[11px] text-gray-400">
                        {status === 'approved'
                          ? `Approved by ${enr?.approvedBy || 'Admin'} on ${new Date(enr?.approvedAt || '').toLocaleDateString()}`
                          : status === 'pending'
                            ? 'Waiting for Admin approval'
                            : status === 'rejected'
                              ? `Rejected: ${enr?.rejectionReason || 'Reason not specified'}`
                              : 'Student has not submitted face enrollment yet'}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold ${status === 'approved'
                        ? 'bg-emerald-100 text-emerald-800'
                        : status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : status === 'rejected'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-gray-100 text-gray-500'
                      }`}
                  >
                    {status === 'approved'
                      ? 'Approved'
                      : status === 'pending'
                        ? 'Pending'
                        : status === 'rejected'
                          ? 'Rejected'
                          : 'Not Enrolled'}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-2">
                {enr && (
                  <button
                    onClick={() => handleResetEnrollment(selectedStudent.rollNumber)}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline"
                  >
                    Reset Enrollment
                  </button>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedStudent(null)}
                  >
                    Close
                  </Button>
                  {status === 'pending' && enr && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => {
                        setSelectedStudent(null);
                        setReviewEnrollment(enr);
                      }}
                    >
                      Review & Approve
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* ─── MODAL: ADD DEVICE ───────────────────────────────────────── */}
      <Modal
        isOpen={isAddDeviceModalOpen}
        onClose={() => setIsAddDeviceModalOpen(false)}
        title="Add Biometric Hardware Device"
        size="md"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            toast.success('Hardware device saved (UI Config).');
            setIsAddDeviceModalOpen(false);
          }}
          className="p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Device Name
            </label>
            <input
              type="text"
              required
              value={newDeviceName}
              onChange={(e) => setNewDeviceName(e.target.value)}
              placeholder="e.g. Main Gate Camera / Fingerprint Scanner"
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Device Model
            </label>
            <select
              value={newDeviceType}
              onChange={(e) => setNewDeviceType(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
            >
              <option value="Laptop / Desktop Camera (Built-in)">Laptop / Desktop Camera (Built-in)</option>
              <option value="Mobile Camera (Built-in)">Mobile Camera (Built-in)</option>
              <option value="ESP32-CAM (External)">ESP32-CAM (External Hardware)</option>
              <option value="R307 Fingerprint Module">R307 Optical Fingerprint</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => setIsAddDeviceModalOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Device
            </Button>
          </div>
        </form>
      </Modal>

      {/* ─── MODAL: ENROLLMENT SETUP GUIDE ───────────────────────────── */}
      <Modal
        isOpen={isSetupModalOpen}
        onClose={() => setIsSetupModalOpen(false)}
        title="Face Enrollment Workflow Guide"
        size="md"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400">
            <FiShield className="w-8 h-8" />
            <div>
              <h4 className="font-bold text-gray-900 dark:text-white">
                Face System Architecture
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Laptop/Desktop/Mobile Camera Face Attendance
              </p>
            </div>
          </div>

          <div className="space-y-2 text-xs text-gray-600 dark:text-gray-300">
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">1. Student Self-Enrollment:</span>
              <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                Student opens Face Attendance in their Student Panel, captures 4 guided face samples, and submits enrollment. Status becomes <strong>Pending</strong>.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">2. Admin / HOD Approval:</span>
              <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                Admin or HOD reviews pending submissions for their branch and clicks <strong>Approve</strong>.
              </p>
            </div>

            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="font-bold text-indigo-600 dark:text-indigo-400">3. Live Face Attendance:</span>
              <p className="mt-0.5 text-gray-500 dark:text-gray-400">
                Approved student scans their face on camera, passes the <strong>Eye Blink Liveness Challenge</strong>, matches face vectors, and attendance is saved.
              </p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsSetupModalOpen(false)}
            >
              Got it
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
