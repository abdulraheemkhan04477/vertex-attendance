import { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiXCircle, FiCameraOff } from 'react-icons/fi';
import { Html5Qrcode } from 'html5-qrcode';
import { useToast } from '../../hooks/useToast';
import { qrSessionsDB, attendanceDB } from '../../services/db';
import { studentAuthService } from '../../services/auth';

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QRScannerModal({ isOpen, onClose }: QRScannerModalProps) {
  const toast = useToast();
  const [scanned, setScanned] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const student = studentAuthService.getCurrentStudent();
  const qrRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    let mounted = true;

    if (!isOpen) {
      setScanned(false);
      setCameraError(null);
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().then(() => {
          if (qrRef.current) {
            qrRef.current.clear();
            qrRef.current = null;
          }
        }).catch(console.error);
      }
      return;
    }

    const startScanner = async () => {
      try {
        // Explicitly check for camera permissions and devices first
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw { name: 'NotFoundError', message: 'No camera devices found.' };
        }

        if (!mounted) return;

        const html5QrCode = new Html5Qrcode("qr-reader");
        qrRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (scanned) return;
            setScanned(true);
            html5QrCode.pause(true);
            
            try {
              let session = qrSessionsDB.getById(decodedText.trim());
              
              if (!session) {
                session = await qrSessionsDB.fetchSessionFromCloud(decodedText.trim()) || undefined;
              }

              if (!session) {
                const reason = 'Invalid QR Code (Session not found or token mismatch)';
                toast.error(reason);
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
                return;
              }

              if (new Date() > new Date(session.expiresAt)) {
                const reason = 'This QR Code has expired. Please ask the Admin to generate a new one.';
                toast.error(reason);
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
                return;
              }

              if (!student) return;

              let currentStudent = await studentAuthService.getFreshCurrentStudent() || student;

              // Security Check: Enforce exact academic context matching
              if (currentStudent.year !== session.year || currentStudent.branch !== session.branch || currentStudent.semester !== session.semester) {
                const reason = `Mismatch: QR is for ${session.year} ${session.branch} - ${session.semester}, but you are ${currentStudent.year} ${currentStudent.branch} - ${currentStudent.semester}`;
                toast.error(reason);
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 4000);
                return;
              }

              const sessionSubject = `${session.year}|${session.branch}|${session.semester}`;

              const existing = attendanceDB.getBySession(session.date, sessionSubject, session.lectureNumber);
              const alreadyMarked = existing.find(r => r.rollNumber === student.rollNumber);
              if (alreadyMarked) {
                toast.warning('You have already marked attendance for this session.');
                setTimeout(onClose, 2000);
                return;
              }

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

              toast.success('Attendance marked successfully!');
              setTimeout(onClose, 1500);

            } catch (error) {
              toast.error(`Failed to process QR Code: ${error instanceof Error ? error.message : 'Unknown error'}`);
              setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
            }
          },
          () => {
            // Ignore scan failures (usually just framing issues)
          }
        );
      } catch (err: any) {
        if (!mounted) return;
        console.error("[QR Scanner Error]", err);
        const errName = err.name || (typeof err === 'string' ? err : 'UnknownError');
        
        if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCameraError('Camera access denied. Please grant permissions in your browser settings.');
        } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCameraError('No camera found on this device.');
        } else if (errName === 'NotReadableError' || errName === 'TrackStartError') {
          setCameraError('Camera is already in use by another tab or application.');
        } else if (errName === 'OverconstrainedError' || errName === 'ConstraintNotSatisfiedError') {
          setCameraError('Camera requirements not met. Trying switching to a different device.');
        } else {
          setCameraError(`Camera Error: ${err.message || errName || 'Unknown initialization error'}`);
        }
      }
    };

    startScanner();

    return () => {
      mounted = false;
      if (qrRef.current && qrRef.current.isScanning) {
        qrRef.current.stop().then(() => {
          if (qrRef.current) {
            qrRef.current.clear();
            qrRef.current = null;
          }
        }).catch(console.error);
      } else if (qrRef.current) {
        qrRef.current.clear();
        qrRef.current = null;
      }
    };
  }, [isOpen, toast, student, onClose]);

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
          
          {cameraError ? (
            <div className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-red-500/30 bg-red-50 dark:bg-red-900/20 p-6 flex flex-col items-center justify-center min-h-[250px]">
              <FiCameraOff className="w-12 h-12 text-red-500 mb-4" />
              <p className="text-red-600 dark:text-red-400 font-medium text-sm">
                {cameraError}
              </p>
            </div>
          ) : (
            <div id="qr-reader" className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-indigo-500/30 min-h-[250px]"></div>
          )}
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
