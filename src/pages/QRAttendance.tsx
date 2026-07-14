import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { FiZap, FiRefreshCw, FiXCircle } from 'react-icons/fi';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { today } from '../utils/dateUtils';
import { useStore } from '../store/useStore';
import { QRCodeSVG } from 'qrcode.react';
import { studentsDB, qrSessionsDB, usersDB } from '../services/db';

export default function QRAttendance() {
  const toast = useToast();
  const { settings, currentUser } = useStore();

  const [date, setDate] = useState(today());
  const [year, setYear] = useState('');
  const [branch, setBranch] = useState('');
  const [semester, setSemester] = useState('');
  const [lectureNumber, setLectureNumber] = useState(1);

  // Dynamically compute options from existing students AND teachers in the current college
  const allStudents = useMemo(() => studentsDB.getAll(), []);
  const allTeachers = useMemo(() => usersDB.getAll().filter(u => u.role === 'teacher' && u.assignedClasses), []);

  const combinedClasses = useMemo(() => {
    const studentClasses = allStudents.map(s => ({ year: s.year, branch: s.branch, semester: s.semester }));
    const teacherClassesList = allTeachers.flatMap(t => t.assignedClasses || []);
    return [...studentClasses, ...teacherClassesList];
  }, [allStudents, allTeachers]);

  const collegeYears = useMemo(() => [...new Set(combinedClasses.map(c => c.year))].filter(Boolean).sort(), [combinedClasses]);
  const collegeBranches = useMemo(() => [...new Set(combinedClasses.filter(c => c.year === year).map(c => c.branch))].filter(Boolean).sort(), [combinedClasses, year]);
  const collegeSemesters = useMemo(() => [...new Set(combinedClasses.filter(c => c.year === year && c.branch === branch).map(c => c.semester))].filter(Boolean).sort(), [combinedClasses, year, branch]);

  // Filter based on teacher's assigned classes
  const teacherClasses = currentUser?.role === 'teacher' ? currentUser.assignedClasses || [] : [];
  
  const allowedYears = currentUser?.role === 'teacher' 
    ? [...new Set(teacherClasses.map(c => c.year))].filter(Boolean).sort()
    : collegeYears;
    
  const allowedBranches = currentUser?.role === 'teacher' 
    ? [...new Set(teacherClasses.filter(c => c.year === year).map(c => c.branch))].filter(Boolean).sort()
    : collegeBranches;
    
  const allowedSemesters = currentUser?.role === 'teacher' 
    ? [...new Set(teacherClasses.filter(c => c.year === year && c.branch === branch).map(c => c.semester))].filter(Boolean).sort()
    : collegeSemesters;

  const fullSubject = useMemo(() => {
    if (!year || !branch || !semester) return '';
    return `${year}|${branch}|${semester}`;
  }, [year, branch, semester]);

  useEffect(() => {
    if (allowedYears.length === 1 && !year) setYear(allowedYears[0]);
  }, [allowedYears, year]);

  useEffect(() => {
    if (year && allowedBranches.length === 1 && !branch) setBranch(allowedBranches[0]);
    if (year && currentUser?.role !== 'teacher') setSemester(''); // Reset for admins
  }, [year, branch, allowedBranches, currentUser?.role]);

  useEffect(() => {
    if (branch && allowedSemesters.length === 1 && !semester) setSemester(allowedSemesters[0]);
  }, [branch, semester, allowedSemesters]);

  const [qrSessionId, setQrSessionId] = useState<string | null>(null);

  const handleGenerateQR = useCallback(async () => {
    if (!fullSubject) { toast.error('Please select Year, Branch, and Semester first'); return; }
    const sessionId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString(); // 5 mins
    const session = {
      id: sessionId,
      teacherId: currentUser?.id || '',
      year,
      branch,
      semester,
      subject: fullSubject,
      lectureNumber,
      date,
      timestamp: new Date().toISOString(),
      expiresAt,
      createdBy: settings.facultyName
    };
    qrSessionsDB.add(session);
    setQrSessionId(JSON.stringify(session));
    toast.success('QR Code generated. It will expire in 5 minutes.');
  }, [fullSubject, branch, semester, lectureNumber, date, settings.facultyName, toast, year, currentUser]);

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
          <FiZap className="text-purple-600" />
          Generate QR Attendance
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Create a 5-minute temporary QR code for students to scan.
        </p>
      </motion.div>

      {/* Session Config */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm p-6">
        <h3 className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide mb-4">Academic Session</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Year</label>
            <select
              value={year}
              onChange={(e) => { setYear(e.target.value); setBranch(''); setSemester(''); }}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:text-white"
            >
              <option value="">Select Year...</option>
              {allowedYears.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Branch</label>
            <select
              value={branch}
              onChange={(e) => { setBranch(e.target.value); setSemester(''); }}
              disabled={!year}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:text-white disabled:opacity-50"
            >
              <option value="">Select Branch...</option>
              {allowedBranches.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Semester</label>
            <select
              value={semester}
              onChange={(e) => setSemester(e.target.value)}
              disabled={!year}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:text-white disabled:opacity-50"
            >
              <option value="">Select Sem...</option>
              {allowedSemesters.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Lecture</label>
            <select
              value={lectureNumber}
              onChange={(e) => setLectureNumber(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-400 dark:text-white"
            >
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>L-{n}</option>)}
            </select>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <Button onClick={handleGenerateQR} className="bg-purple-600 hover:bg-purple-700 text-white shadow-lg" size="lg" icon={<FiZap />}>
            Generate QR Code
          </Button>
        </div>
      </div>

      {/* QR Code Display */}
      {qrSessionId && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl p-8 text-center border border-gray-100 dark:border-gray-700 relative"
        >
          <button 
            onClick={() => setQrSessionId(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiXCircle className="w-5 h-5" />
          </button>
          
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Scan to Check-in</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 max-w-sm mx-auto">
            Students can use the 'Scan QR' button in their portal to mark attendance. This code expires in 5 minutes.
          </p>
          
          <div className="bg-white p-6 rounded-3xl shadow-inner inline-block mx-auto border-4 border-gray-50 dark:border-gray-900">
            <QRCodeSVG value={qrSessionId} size={280} level="H" includeMargin={true} />
          </div>
          
          <div className="mt-8 flex items-center justify-center gap-2">
            <Button onClick={handleGenerateQR} variant="outline" size="sm" icon={<FiRefreshCw />}>
              Regenerate
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
