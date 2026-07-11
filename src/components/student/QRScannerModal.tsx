import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiXCircle } from 'react-icons/fi';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { useToast } from '../../hooks/useToast';
import { qrSessionsDB, attendanceDB } from '../../services/db';
import { studentAuthService } from '../../services/auth';
import { today } from '../../utils/dateUtils';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const toast = useToast();
  const [scanned, setScanned] = useState(false);
  const student = studentAuthService.getCurrentStudent();

  useEffect(() => {
    if (!isOpen) {
      setScanned(false);
      return;
    }

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 } },
      false
    );

    scanner.render(
      async (decodedText) => {
        if (scanned) return;
        setScanned(true);
        scanner.pause(true);
        
        try {
          console.log(`[QR SCANNER] Scanned decodedText: "${decodedText}"`);
          let session = qrSessionsDB.getById(decodedText.trim());
          console.log(`[QR SCANNER] Local session lookup result:`, session);
          
          if (!session) {
            console.log(`[QR SCANNER] Session not found locally. Fetching from cloud...`);
            // Check cloud if not found locally (since admin might have just created it on another device)
            session = await qrSessionsDB.fetchSessionFromCloud(decodedText.trim()) || undefined;
            console.log(`[QR SCANNER] Cloud session lookup result:`, session);
          }

          if (!session) {
            const reason = 'Invalid QR Code (Session not found or token mismatch)';
            console.error(`[QR SCANNER] Rejected: ${reason}`);
            toast.error(reason);
            setTimeout(() => { scanner.resume(); setScanned(false); }, 3000);
            return;
          }

          console.log(`[QR SCANNER] Checking expiration. Session expires at: ${session.expiresAt}, Current time: ${new Date().toISOString()}`);
          if (new Date() > new Date(session.expiresAt)) {
            const reason = 'This QR Code has expired. Please ask the Admin to generate a new one.';
            console.error(`[QR SCANNER] Rejected: ${reason}`);
            toast.error(reason);
            setTimeout(() => { scanner.resume(); setScanned(false); }, 3000);
            return;
          }

          if (!student) {
             console.error(`[QR SCANNER] Rejected: Student session mismatch (Not logged in)`);
             return;
          }

          // Ensure we have the most up-to-date student data from the database
          let currentStudent = await studentAuthService.getFreshCurrentStudent() || student;

          // Check student match
          console.log(`[QR SCANNER] Checking student match. Student branch: "${currentStudent.branch}", Session branch: "${session.branch}". Student semester: "${currentStudent.semester}", Session semester: "${session.semester}".`);
          if (currentStudent.branch !== session.branch || currentStudent.semester !== session.semester) {
            const reason = `Mismatch: QR is for ${session.branch} - ${session.semester}, but you are ${currentStudent.branch} - ${currentStudent.semester}`;
            console.error(`[QR SCANNER] Rejected: ${reason}`);
            toast.error(reason);
            setTimeout(() => { scanner.resume(); setScanned(false); }, 4000);
            return;
          }

          const sessionSubject = `${session.year}|${session.branch}|${session.semester}`;
          console.log(`[QR SCANNER] Checking duplicates for session subject: ${sessionSubject}, lecture: ${session.lectureNumber}`);

          // Check duplicate
          const existing = attendanceDB.getBySession(session.date, sessionSubject, session.lectureNumber);
          const alreadyMarked = existing.find(r => r.rollNumber === student.rollNumber);
          if (alreadyMarked) {
            const reason = 'You have already marked attendance for this session.';
            console.error(`[QR SCANNER] Rejected: ${reason}`);
            toast.warning(reason);
            setTimeout(onClose, 2000);
            return;
          }

          console.log(`[QR SCANNER] All checks passed. Marking attendance...`);
          // Mark present
          attendanceDB.saveSession([{
            studentId: student.id,
            rollNumber: student.rollNumber,
            studentName: student.name,
            date: session.date,
            subject: sessionSubject,
            faculty: session.createdBy,
            lectureNumber: session.lectureNumber,
            status: 'present',
            remarks: 'QR Scanned',
            year: currentStudent.year,
            branch: currentStudent.branch,
            semesterNum: currentStudent.semester
          }]);

          console.log(`[QR SCANNER] Attendance successfully marked for ${student.name}`);
          toast.success('Attendance marked successfully!');
          setTimeout(onClose, 1500);

        } catch (error) {
          console.error(`[QR SCANNER] Unexpected Error:`, error);
          toast.error(`Failed to process QR Code: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setTimeout(() => { scanner.resume(); setScanned(false); }, 3000);
        }
      },
      (error) => {
        // ignore errors (mostly scanning failures)
      }
    );

    return () => {
      scanner.clear().catch(console.error);
    };
  }, [isOpen, scanned, toast, student, onClose]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-md relative text-center"
        >
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <FiXCircle className="w-5 h-5" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">Scan QR</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Point your camera at the teacher's QR code to mark your attendance.</p>
          
          <div id="qr-reader" className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-indigo-500/30"></div>
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
