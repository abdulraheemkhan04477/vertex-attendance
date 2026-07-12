import { useMemo, useState, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import {
  FiUser, FiCheckCircle, FiXCircle, FiClock, FiCalendar, FiTrendingUp,
  FiEdit2, FiSave, FiX, FiCamera,
} from 'react-icons/fi';
import { Modal } from '../ui/Modal';
import { Badge } from '../ui/Badge';
import { ProgressBar } from '../ui/ProgressBar';
import type { Student, AttendanceRecord } from '../../types';
import { attendanceService } from '../../services/attendanceService';
import { studentsDB } from '../../services/db';
import { useToast } from '../../hooks/useToast';
import { formatDate } from '../../utils/dateUtils';

interface StudentProfileProps {
  student: Student | null;
  isOpen: boolean;
  onClose: () => void;
  isAdmin?: boolean;
  onSave?: () => void;
}

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function getMonthlyChartData(records: AttendanceRecord[]) {
  const monthMap = new Map<string, { present: number; absent: number; late: number; leave: number }>();
  records.forEach((r) => {
    const month = r.date.substring(0, 7);
    if (!monthMap.has(month)) monthMap.set(month, { present: 0, absent: 0, late: 0, leave: 0 });
    monthMap.get(month)![r.status]++;
  });
  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month: new Date(month + '-01').toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      ...d,
    }));
}

const INPUT_CLS =
  'w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-400 dark:text-white transition-colors';

export function StudentProfile({ student, isOpen, onClose, isAdmin = false, onSave }: StudentProfileProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats = useMemo(() => {
    if (!student) return null;
    return attendanceService.getStudentStats(student.rollNumber);
  }, [student]);

  const history = useMemo(() => {
    if (!student) return [];
    return attendanceService.getStudentHistory(student.rollNumber)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 20);
  }, [student]);

  const monthlyData = useMemo(() => getMonthlyChartData(
    student ? attendanceService.getStudentHistory(student.rollNumber) : [],
  ), [student]);

  // ── Edit state ──────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Partial<Student>>({});

  function startEdit() {
    if (!student) return;
    setForm({
      name: student.name,
      rollNumber: student.rollNumber,
      fatherName: student.fatherName ?? '',
      motherName: student.motherName ?? '',
      dob: student.dob,
      phone: student.phone,
      email: student.email,
      address: student.address,
      profilePhoto: student.profilePhoto ?? '',
    });
    setIsEditing(true);
  }

  function cancelEdit() {
    setIsEditing(false);
    setForm({});
  }

  async function handleSave() {
    if (!student) return;
    if (!form.name?.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    setSaving(true);
    await new Promise((r) => setTimeout(r, 300));
    studentsDB.update(student.id, form);
    setSaving(false);
    setIsEditing(false);
    toast.success('Profile saved successfully');
    onSave?.();
  }

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

  if (!student || !stats) return null;

  const isLow = stats.percentage < 75;
  const isAtRisk = stats.percentage >= 75 && stats.percentage < 85;

  // The displayed profile photo: in edit mode use form draft, otherwise student record
  const displayPhoto = isEditing ? (form.profilePhoto || '') : (student.profilePhoto || '');

  return (
    <Modal isOpen={isOpen} onClose={() => { cancelEdit(); onClose(); }} size="2xl">
      <div className="p-6">

        {/* ── Header ──────────────────────────────────────────────── */}
        <div className="flex items-start gap-4 mb-6">
          {/* Avatar / Photo */}
          <div className="relative flex-shrink-0">
            {displayPhoto ? (
              <img
                src={displayPhoto}
                alt={student.name}
                className="w-16 h-16 rounded-2xl object-cover ring-2 ring-indigo-200 dark:ring-indigo-700"
              />
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                {getInitials(isEditing ? (form.name ?? student.name) : student.name)}
              </div>
            )}
            {isEditing && (
              <>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 text-white rounded-full flex items-center justify-center hover:bg-indigo-700 transition-colors shadow"
                  title="Change photo"
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
              </>
            )}
          </div>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={form.name ?? ''}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className={INPUT_CLS + ' text-lg font-bold mb-1'}
                placeholder="Student Name"
              />
            ) : (
              <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">{student.name}</h2>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{student.rollNumber}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded-full">
                {student.semester}
              </span>
              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                {student.department}
              </span>
            </div>
          </div>

          {/* Attendance % + Edit button */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <div className={`text-3xl font-black ${isLow ? 'text-red-500' : isAtRisk ? 'text-yellow-500' : 'text-green-500'}`}>
              {stats.percentage}%
            </div>
            {isLow && <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">⚠ Low Attendance</span>}
            {isAtRisk && <span className="text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full font-medium">⚡ At Risk</span>}
            {isAdmin && !isEditing && (
              <button
                onClick={startEdit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow"
              >
                <FiEdit2 className="w-3 h-3" /> Edit Profile
              </button>
            )}
          </div>
        </div>

        {/* ── Edit Form ───────────────────────────────────────────── */}
        {isEditing && (
          <div className="mb-6 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-700/50 rounded-2xl">
            <h3 className="text-sm font-semibold text-indigo-700 dark:text-indigo-300 mb-4 flex items-center gap-2">
              <FiEdit2 className="w-4 h-4" /> Edit Profile Information
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

              {/* Roll Number — read-only */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Roll Number <span className="text-gray-400">(read-only)</span></label>
                <input
                  type="text"
                  value={student.rollNumber}
                  readOnly
                  className={INPUT_CLS + ' opacity-60 cursor-not-allowed'}
                />
              </div>

              {/* Father's Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Father's Name</label>
                <input
                  type="text"
                  value={form.fatherName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, fatherName: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Father's full name"
                />
              </div>

              {/* Guardian's Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Guardian's Name</label>
                <input
                  type="text"
                  value={form.guardianName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, guardianName: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Guardian's full name"
                />
              </div>

              {/* Mother's Name */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Mother's Name</label>
                <input
                  type="text"
                  value={form.motherName ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, motherName: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="Mother's full name"
                />
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date of Birth</label>
                <input
                  type="date"
                  value={form.dob ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, dob: e.target.value }))}
                  className={INPUT_CLS}
                />
              </div>

              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Phone</label>
                <input
                  type="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="+91 9876543210"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  className={INPUT_CLS}
                  placeholder="student@example.com"
                />
              </div>

              {/* Address — full width */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Address</label>
                <textarea
                  value={form.address ?? ''}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className={INPUT_CLS}
                  rows={2}
                  placeholder="Full address"
                />
              </div>
            </div>

            {/* Save / Cancel */}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={cancelEdit}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                <FiX className="w-4 h-4" /> Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-70 shadow"
              >
                {saving ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                ) : (
                  <FiSave className="w-4 h-4" />
                )}
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        )}

        {/* ── Profile Info (view mode) ─────────────────────────── */}
        {!isEditing && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            {[
              { label: "Father's Name", value: student.fatherName },
              { label: "Mother's Name", value: student.motherName },
              { label: "Guardian's Name", value: student.guardianName },
              { label: 'Date of Birth', value: student.dob },
              { label: 'Phone', value: student.phone },
              { label: 'Email', value: student.email },
              { label: 'Address', value: student.address },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 break-words">
                  {value || <span className="text-gray-400 italic">Not provided</span>}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── Progress Bar ─────────────────────────────────────── */}
        <div className="mb-6">
          <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Attendance Percentage</span>
            <span>{stats.percentage}% (Min: 75%)</span>
          </div>
          <ProgressBar value={stats.percentage} size="lg" showLabel={false} />
          <div className="flex justify-between text-xs mt-1">
            <span className="text-gray-400">0%</span>
            <span className="text-yellow-500 font-medium">75% Required</span>
            <span className="text-gray-400">100%</span>
          </div>
        </div>

        {/* ── Stats Grid ───────────────────────────────────────── */}
        <div className="grid grid-cols-5 gap-3 mb-6">
          {[
            { label: 'Total',   value: stats.total,   icon: <FiCalendar />,    color: 'text-gray-600 dark:text-gray-400',      bg: 'bg-gray-100 dark:bg-gray-700' },
            { label: 'Present', value: stats.present, icon: <FiCheckCircle />, color: 'text-green-600 dark:text-green-400',    bg: 'bg-green-100 dark:bg-green-900/30' },
            { label: 'Absent',  value: stats.absent,  icon: <FiXCircle />,     color: 'text-red-600 dark:text-red-400',        bg: 'bg-red-100 dark:bg-red-900/30' },
            { label: 'Late',    value: stats.late,    icon: <FiClock />,       color: 'text-yellow-600 dark:text-yellow-400',  bg: 'bg-yellow-100 dark:bg-yellow-900/30' },
            { label: 'Leave',   value: stats.leave,   icon: <FiUser />,        color: 'text-blue-600 dark:text-blue-400',      bg: 'bg-blue-100 dark:bg-blue-900/30' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 text-center ${s.bg}`}>
              <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
              <div className={`text-xs font-medium ${s.color} mt-0.5`}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* ── Monthly Chart ─────────────────────────────────────── */}
        {monthlyData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
              <FiTrendingUp /> Monthly Trend
            </h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12 }} />
                  <Bar dataKey="present" fill="#10b981" name="Present" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="absent"  fill="#ef4444" name="Absent"  radius={[2, 2, 0, 0]} />
                  <Bar dataKey="late"    fill="#f59e0b" name="Late"    radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* ── Recent History ────────────────────────────────────── */}
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Recent Attendance</h3>
          {history.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">No attendance records yet</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {history.map((r) => (
                <div key={r.id} className="flex items-center justify-between py-2 px-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div>
                    <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.subject.replace(/\|/g, ' • ')}</span>
                    <span className="text-xs text-gray-400 ml-2">Lec {r.lectureNumber}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-400">{formatDate(r.date)}</span>
                    <Badge variant={r.status} label={r.status} dot size="sm" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
}
