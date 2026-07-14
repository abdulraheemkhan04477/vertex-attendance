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

  // Refs to avoid stale closures in scanner callback without triggering re-runs
  const latestStudent = useRef(student);
  const latestToast = useRef(toast);
  const latestOnClose = useRef(onClose);
  const latestScanned = useRef(scanned);

  useEffect(() => {
    latestStudent.current = student;
    latestToast.current = toast;
    latestOnClose.current = onClose;
    latestScanned.current = scanned;
  }, [student, toast, onClose, scanned]);

  const handleClose = async () => {
    if (qrRef.current && qrRef.current.isScanning) {
      try {
        await qrRef.current.stop();
        qrRef.current.clear();
      } catch (err) {
        console.error("Error stopping scanner on close", err);
      }
      qrRef.current = null;
    }
    latestOnClose.current();
  };

  useEffect(() => {
    let mounted = true;

    if (!isOpen) {
      setScanned(false);
      setCameraError(null);
      // Cleanup happens naturally via useEffect return, but if closed externally:
      if (qrRef.current && qrRef.current.isScanning) {
        try {
          qrRef.current.stop().then(() => {
            if (qrRef.current) qrRef.current.clear();
            qrRef.current = null;
          }).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      }
      return;
    }

    const startScanner = async () => {
      try {
        // Slight delay to ensure AnimatePresence has mounted the DOM element
        await new Promise(r => setTimeout(r, 150));
        
        const cameras = await Html5Qrcode.getCameras();
        if (!cameras || cameras.length === 0) {
          throw { name: 'NotFoundError', message: 'No camera devices found.' };
        }

        if (!mounted || !document.getElementById("qr-reader")) return;

        const html5QrCode = new Html5Qrcode("qr-reader");
        qrRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            if (latestScanned.current) return;
            setScanned(true);
            
            try {
              try { html5QrCode.pause(true); } catch (e) { console.warn('QR Pause failed:', e); }

              let payload: any;
              try {
                payload = JSON.parse(decodedText.trim());
              } catch (e) {
                payload = { id: decodedText.trim() };
              }

              const sessionId = payload.id;
              let session = qrSessionsDB.getById(sessionId);
              
              if (!session) {
                session = await qrSessionsDB.fetchSessionFromCloud(sessionId) || undefined;
              }

              if (!session) {
                latestToast.current.error('Invalid QR Code (Session not found or token mismatch)');
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
                return;
              }

              // Cross-validate payload against DB session
              if (
                payload.id !== session.id || 
                (payload.year && payload.year !== session.year) ||
                (payload.branch && payload.branch !== session.branch)
              ) {
                latestToast.current.error('QR Session Mismatch (Data inconsistency)');
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
                return;
              }

              if (new Date() > new Date(session.expiresAt)) {
                latestToast.current.error('This QR Code has expired. Please ask the Admin to generate a new one.');
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 3000);
                return;
              }

              if (!latestStudent.current) {
                latestToast.current.error('Session error: Student not found locally. Please re-login.');
                setTimeout(() => { if(mounted) { try { html5QrCode.resume(); } catch(e){} setScanned(false); } }, 3000);
                return;
              }

              let currentStudent = await studentAuthService.getFreshCurrentStudent() || latestStudent.current;

              // Security Check: Enforce exact academic context matching
              if (currentStudent.year !== session.year || currentStudent.branch !== session.branch || currentStudent.semester !== session.semester) {
                latestToast.current.error(`Mismatch: QR is for ${session.year} ${session.branch} - ${session.semester}, but you are ${currentStudent.year} ${currentStudent.branch} - ${currentStudent.semester}`);
                setTimeout(() => { if(mounted) { html5QrCode.resume(); setScanned(false); } }, 4000);
                return;
              }

              const sessionSubject = `${session.year}|${session.branch}|${session.semester}`;

              const existing = attendanceDB.getBySession(session.date, sessionSubject, session.lectureNumber);
              const alreadyMarked = existing.find(r => r.rollNumber === latestStudent.current!.rollNumber);
              if (alreadyMarked) {
                latestToast.current.warning('You have already marked attendance for this session.');
                setTimeout(handleClose, 2000);
                return;
              }

              attendanceDB.saveSession([{
                studentId: currentStudent.id,
                rollNumber: currentStudent.rollNumber,
                studentName: currentStudent.name,
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

              window.dispatchEvent(new Event('local-storage'));

              latestToast.current.success('Attendance marked successfully!');
              setTimeout(handleClose, 1500);

            } catch (error) {
              latestToast.current.error(`Failed to process QR Code: ${error instanceof Error ? error.message : 'Unknown error'}`);
              setTimeout(() => { if(mounted) { try { html5QrCode.resume(); } catch(e){} setScanned(false); } }, 3000);
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
        try {
          qrRef.current.stop().then(() => {
            if (qrRef.current) qrRef.current.clear();
            qrRef.current = null;
          }).catch(console.error);
        } catch (e) {
          console.error(e);
        }
      } else if (qrRef.current) {
        qrRef.current.clear();
        qrRef.current = null;
      }
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 md:p-10 w-full max-w-md relative text-center"
          >
            <button 
              onClick={handleClose}
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
              <div id="qr-reader" className="mx-auto w-full max-w-sm rounded-xl overflow-hidden border-2 border-indigo-500/30 min-h-[250px] relative">
              </div>
            )}
            
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
