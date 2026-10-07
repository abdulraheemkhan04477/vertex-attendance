import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiCamera,
  FiCheckCircle,
  FiAlertCircle,
  FiClock,
  FiX,
  FiEye,
  FiShield,
  FiRefreshCw,
  FiUserCheck,
} from 'react-icons/fi';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { faceEnrollmentDB, generateId } from '../../services/db';
import { attendanceService } from '../../services/attendanceService';
import {
  validateFaceFrame,
  detectFaceLandmarksOnly,
  extractFaceDescriptor,
  computeEyeAspectRatio,
  matchFaceDescriptor,
  captureVideoFrameBase64,
  loadFaceModels,
} from '../../utils/faceRecognition';
import { useToast } from '../../hooks/useToast';
import type { Student, FaceEnrollment, AttendanceRecord } from '../../types';

interface FaceAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: Student;
  onAttendanceMarked?: () => void;
}

const ENROLLMENT_CAPTURES = [
  { step: 1, prompt: 'Look straight at the camera' },
  { step: 2, prompt: 'Turn your face slightly left' },
  { step: 3, prompt: 'Turn your face slightly right' },
  { step: 4, prompt: 'Look straight at the camera again' },
];

export function FaceAttendanceModal({
  isOpen,
  onClose,
  student,
  onAttendanceMarked,
}: FaceAttendanceModalProps) {
  const toast = useToast();

  // Current Enrollment Record & Today's Attendance Status
  const [enrollment, setEnrollment] = useState<FaceEnrollment | null>(null);
  const [todayAttStatus, setTodayAttStatus] = useState<
    'present' | 'absent' | 'late' | 'leave' | 'not_marked'
  >('not_marked');
  const [todayAttRecord, setTodayAttRecord] = useState<AttendanceRecord | null>(null);

  // Flow Modes: 'overview' | 'enroll' | 'attendance' | 'success'
  const [mode, setMode] = useState<'overview' | 'enroll' | 'attendance' | 'success'>('overview');

  // Camera & Video State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Enrollment State
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [capturedDescriptors, setCapturedDescriptors] = useState<number[][]>([]);
  const [capturedThumbnails, setCapturedThumbnails] = useState<string[]>([]);
  const [qualityMessage, setQualityMessage] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Attendance & Liveness State
  const [livenessStage, setLivenessStage] = useState<
    'detecting' | 'blink_challenge' | 'liveness_verified' | 'matching' | 'failed'
  >('detecting');
  const [attendanceMessage, setAttendanceMessage] = useState<string>('');
  const [attendanceResult, setAttendanceResult] = useState<AttendanceRecord | null>(null);

  // Refs for tracking animation frame state without closure trapping
  const animFrameRef = useRef<number | null>(null);
  const isSubscribedRef = useRef(false);
  const livenessStageRef = useRef<'detecting' | 'blink_challenge' | 'liveness_verified' | 'matching' | 'failed'>('detecting');
  const blinkStateRef = useRef<'open' | 'closed' | 'verified'>('open');
  const openEarBaselineRef = useRef<number>(0.28);
  const earFramesCountRef = useRef(0);
  const isMatchingRef = useRef(false);

  // Refresh current enrollment & today's attendance status from DB
  const refreshStatus = useCallback(() => {
    if (student?.rollNumber) {
      const rec = faceEnrollmentDB.getByRollNumber(student.rollNumber);
      setEnrollment(rec);

      const todayInfo = attendanceService.getTodayAttendanceStatus(student.rollNumber);
      setTodayAttStatus(todayInfo.status);
      setTodayAttRecord(todayInfo.record);
    }
  }, [student?.rollNumber]);

  useEffect(() => {
    if (isOpen) {
      refreshStatus();
      setMode('overview');
      setCameraError(null);
      setQualityMessage(null);
      setAttendanceMessage('');
      setAttendanceResult(null);
    } else {
      stopCamera();
    }
  }, [isOpen, refreshStatus]);

  // Stop camera stream cleanly
  const stopCamera = useCallback(() => {
    isSubscribedRef.current = false;
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    console.log('[Face Attendance] Camera stopped.');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Start Camera Stream
  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      console.log('[Face Attendance] Initializing camera and face recognition models...');
      await loadFaceModels();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setCameraActive(true);
          console.log('[Face Attendance] Camera stream initialized successfully.');
        };
      }
    } catch (err: any) {
      console.error('[Face Attendance] Camera access error:', err);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Camera permission is required for Face Attendance.'
          : 'Could not access device camera. Please check your camera settings.'
      );
      setCameraActive(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ENROLLMENT FLOW
  // ─────────────────────────────────────────────────────────────────────────────
  const startEnrollmentFlow = async () => {
    if (!enrollment?.permissionGranted) {
      toast.error('Face enrollment permission has not been granted by Admin.');
      return;
    }
    setMode('enroll');
    setCurrentStepIndex(0);
    setCapturedDescriptors([]);
    setCapturedThumbnails([]);
    setQualityMessage('Position your face inside the guide...');
    await startCamera();
  };

  const handleCaptureNextSample = async () => {
    if (!videoRef.current || isCapturing) return;
    setIsCapturing(true);
    setQualityMessage('Validating face quality...');

    try {
      const val = await validateFaceFrame(videoRef.current);
      if (!val.isValid || !val.detection) {
        setQualityMessage(val.message || 'Invalid face capture. Try again.');
        setIsCapturing(false);
        return;
      }

      const descriptor = Array.from(val.detection.descriptor);
      const thumbnail = captureVideoFrameBase64(videoRef.current, 160, 120);

      const nextDesc = [...capturedDescriptors, descriptor];
      const nextThumbs = [...capturedThumbnails, thumbnail];

      setCapturedDescriptors(nextDesc);
      setCapturedThumbnails(nextThumbs);

      if (nextDesc.length >= ENROLLMENT_CAPTURES.length) {
        const newEnrollment: FaceEnrollment = {
          id: enrollment?.id || generateId(),
          studentId: student.id,
          rollNumber: student.rollNumber,
          studentName: student.name,
          branch: student.branch || student.department || 'General',
          semester: student.semester || 'Sem 1',
          year: student.year || '1st Year',
          status: 'pending',
          descriptors: nextDesc,
          sampleImages: nextThumbs,
          submittedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        faceEnrollmentDB.save(newEnrollment);
        setEnrollment(newEnrollment);
        stopCamera();

        toast.success('Face enrollment submitted! Pending Admin/HOD verification.');
        setMode('overview');
      } else {
        setCurrentStepIndex((prev) => prev + 1);
        setQualityMessage(
          `Captured sample ${nextDesc.length} of ${ENROLLMENT_CAPTURES.length}! Ready for step ${nextDesc.length + 1}.`
        );
      }
    } catch (err) {
      console.error('[Face Attendance] Enrollment capture error:', err);
      setQualityMessage('Capture failed. Please try again.');
    } finally {
      setIsCapturing(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // ATTENDANCE & EYE BLINK LIVENESS FLOW
  // ─────────────────────────────────────────────────────────────────────────────
  const startAttendanceFlow = async () => {
    if (!enrollment || enrollment.status !== 'approved') {
      toast.error('Your face enrollment has not been approved yet.');
      return;
    }

    setMode('attendance');
    setLivenessStage('detecting');
    livenessStageRef.current = 'detecting';
    blinkStateRef.current = 'open';
    openEarBaselineRef.current = 0.28;
    earFramesCountRef.current = 0;
    isMatchingRef.current = false;
    setAttendanceMessage('Opening camera & initializing face detector...');
    await startCamera();
  };

  // Perform face matching & update attendance
  const processFaceMatchAndUpdate = async (liveDescriptor: Float32Array) => {
    if (isMatchingRef.current) return;
    isMatchingRef.current = true;

    setLivenessStage('matching');
    livenessStageRef.current = 'matching';

    console.log(`[Face Attendance] Matching live face embedding against approved enrollment...`);

    if (!enrollment || !enrollment.descriptors || enrollment.descriptors.length === 0) {
      console.warn('[Face Attendance] No enrolled descriptors found.');
      setAttendanceMessage('No enrolled face template found.');
      setLivenessStage('failed');
      livenessStageRef.current = 'failed';
      isMatchingRef.current = false;
      return;
    }

    const { isMatch, distance } = matchFaceDescriptor(liveDescriptor, enrollment.descriptors);
    console.log(`[Face Attendance] Face descriptor match result: isMatch=${isMatch}, distance=${distance.toFixed(4)}`);

    if (!isMatch) {
      console.warn('[Face Attendance] Face match failed. Distance above threshold.');
      setAttendanceMessage('Liveness verified, but your face could not be verified.');
      setLivenessStage('failed');
      livenessStageRef.current = 'failed';
      isMatchingRef.current = false;
      return;
    }

    console.log(`[Face Attendance] Face match successful for student ${student.name}.`);

    // Match Success! Perform Database Attendance Update (Absent -> Present)
    try {
      console.log(`[Face Attendance] Updating attendance record in database...`);
      const rec = attendanceService.markFaceAttendance(student);
      
      console.log(`[Face Attendance] Attendance update verified! Status: ${rec.status}`);
      setAttendanceResult(rec);
      setTodayAttStatus('present');
      setTodayAttRecord(rec);

      stopCamera();
      setMode('success');
      toast.success('Attendance marked successfully as Present!');

      if (onAttendanceMarked) onAttendanceMarked();
    } catch (err: any) {
      console.error('[Face Attendance] Database attendance update failed:', err);
      setAttendanceMessage(err.message || 'Attendance could not be updated.');
      setLivenessStage('failed');
      livenessStageRef.current = 'failed';
      isMatchingRef.current = false;
    }
  };

  // Direct trigger for verification (Manual backup button or verified blink)
  const triggerVerificationDirectly = async () => {
    if (!videoRef.current || isMatchingRef.current) return;
    setLivenessStage('liveness_verified');
    livenessStageRef.current = 'liveness_verified';
    setAttendanceMessage('✓ Liveness Verified! Extracting face & matching...');

    try {
      const liveDescriptor = await extractFaceDescriptor(videoRef.current);
      if (!liveDescriptor) {
        setAttendanceMessage('No face detected for matching. Position face in camera.');
        setLivenessStage('failed');
        livenessStageRef.current = 'failed';
        return;
      }
      await processFaceMatchAndUpdate(liveDescriptor);
    } catch (err) {
      console.error('Direct verification error:', err);
      setAttendanceMessage('Verification error. Please try again.');
      setLivenessStage('failed');
      livenessStageRef.current = 'failed';
    }
  };

  // High-FPS continuous frame loop for liveness blink challenge
  useEffect(() => {
    if (mode !== 'attendance' || !cameraActive || !videoRef.current) return;

    isSubscribedRef.current = true;
    console.log('[Face Attendance] High-FPS Liveness frame loop started.');

    const processFrame = async () => {
      if (!isSubscribedRef.current || !videoRef.current) return;

      const currentStage = livenessStageRef.current as string;
      if (currentStage === 'matching' || currentStage === 'failed' || currentStage === 'liveness_verified') {
        return;
      }

      try {
        // Fast detection without heavy 128-d descriptor calculation per frame!
        const res = await detectFaceLandmarksOnly(videoRef.current);
        if (!res || !res.landmarks) {
          if (livenessStageRef.current === 'detecting') {
            setAttendanceMessage('Position your face inside the camera guide...');
          }
          if (isSubscribedRef.current) {
            animFrameRef.current = requestAnimationFrame(processFrame);
          }
          return;
        }

        const { avgEAR } = computeEyeAspectRatio(res.landmarks);

        // Stage 1: Face Detected -> Prompt for Eye Blink
        if (livenessStageRef.current === 'detecting') {
          console.log('[Face Attendance] Face detected. High-FPS Eye blink challenge active.');
          livenessStageRef.current = 'blink_challenge';
          setLivenessStage('blink_challenge');
          setAttendanceMessage('Face detected! Look at camera and blink once to verify liveness.');
          openEarBaselineRef.current = Math.max(avgEAR, 0.24);
          earFramesCountRef.current = 1;
        }

        // Stage 2: Adaptively Detect Eye Blink
        if (livenessStageRef.current === 'blink_challenge') {
          // Update baseline open EAR during open state
          if (blinkStateRef.current === 'open') {
            if (avgEAR > openEarBaselineRef.current) {
              openEarBaselineRef.current = avgEAR;
            }
          }

          const closedThreshold = Math.min(openEarBaselineRef.current * 0.78, 0.22);
          const openThreshold = Math.min(openEarBaselineRef.current * 0.88, 0.24);

          if (avgEAR < closedThreshold) {
            blinkStateRef.current = 'closed';
          } else if (avgEAR > openThreshold && blinkStateRef.current === 'closed') {
            // Blink verified!
            console.log(`[Face Attendance] Eye blink detected (EAR: ${avgEAR.toFixed(3)}). Liveness verified!`);
            blinkStateRef.current = 'verified';
            livenessStageRef.current = 'liveness_verified';
            setLivenessStage('liveness_verified');
            setAttendanceMessage('✓ Liveness Verified! Matching face...');

            // Extract descriptor once and match
            const liveDescriptor = await extractFaceDescriptor(videoRef.current);
            if (liveDescriptor && isSubscribedRef.current) {
              await processFaceMatchAndUpdate(liveDescriptor);
            } else if (isSubscribedRef.current) {
              setAttendanceMessage('Face descriptor extraction failed. Position face clearly.');
              setLivenessStage('failed');
              livenessStageRef.current = 'failed';
            }
            return;
          }
        }
      } catch (err) {
        console.error('[Face Attendance] Liveness frame loop error:', err);
      }

      const stage = livenessStageRef.current as string;
      if (isSubscribedRef.current && stage !== 'liveness_verified' && stage !== 'matching') {
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    animFrameRef.current = requestAnimationFrame(processFrame);

    return () => {
      isSubscribedRef.current = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [mode, cameraActive]);

  const handleModalClose = () => {
    stopCamera();
    onClose();
  };

  const status = enrollment?.status || 'not_enrolled';

  return (
    <Modal isOpen={isOpen} onClose={handleModalClose} title="Face Attendance System" size="lg">
      <div className="p-6 space-y-6">
        {/* ─────────────────────────────────────────────────────────────────────────────
            HEADER & TOP-RIGHT ATTENDANCE STATUS BADGE (REQ 3 & 16)
           ───────────────────────────────────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              <FiCamera className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-white">
                {student.name}
              </h3>
              <p className="text-xs text-gray-500 font-mono">
                Roll: {student.rollNumber} | {student.branch || student.department} • {student.year}
              </p>
            </div>
          </div>

          {/* TOP-RIGHT ATTENDANCE STATUS BADGE */}
          <div className="w-full sm:w-auto flex justify-end">
            {todayAttStatus === 'present' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
                <FiCheckCircle className="w-4 h-4 text-emerald-600" />
                Attendance already marked as Present
              </span>
            )}
            {todayAttStatus === 'absent' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm animate-pulse">
                <FiAlertCircle className="w-4 h-4 text-amber-600" />
                You are already marked as Absent
              </span>
            )}
            {todayAttStatus === 'not_marked' && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                <FiClock className="w-3.5 h-3.5 text-gray-400" />
                Attendance not marked yet
              </span>
            )}
            {(todayAttStatus === 'late' || todayAttStatus === 'leave') && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                <FiClock className="w-4 h-4" />
                Marked as {todayAttStatus.toUpperCase()}
              </span>
            )}
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODE: OVERVIEW (CARD STATES 1 to 4)
           ───────────────────────────────────────────────────────────────────────────── */}
        {mode === 'overview' && (
          <div className="space-y-6">
            {/* STATE 1: NOT ENROLLED */}
            {status === 'not_enrolled' && (
              !enrollment?.permissionGranted ? (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto">
                    <FiShield className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Face Enrollment Locked
                    </h4>
                    <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 mt-2">
                      Face enrollment permission has not been granted by Admin.
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-md mx-auto">
                      Please contact your HOD or Admin to obtain explicit permission before registering your face.
                    </p>
                  </div>
                  <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                    🔒 Camera and face sample capture remain locked until permission is granted by Admin.
                  </div>
                </div>
              ) : (
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 text-center space-y-4">
                  <div className="w-16 h-16 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center mx-auto">
                    <FiAlertCircle className="w-8 h-8" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Face Attendance
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Permission granted! Please complete face self-enrollment to enable face recognition attendance.
                    </p>
                  </div>
                  <Button
                    variant="primary"
                    onClick={startEnrollmentFlow}
                    icon={<FiCamera className="w-4 h-4" />}
                    className="px-6 py-2.5 shadow-md font-bold"
                  >
                    Enroll My Face
                  </Button>
                </div>
              )
            )}

            {/* STATE 2: PENDING APPROVAL */}
            {status === 'pending' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-amber-200 dark:border-amber-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center mx-auto animate-pulse">
                  <FiClock className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 mb-2">
                    Pending Approval
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    Face Attendance
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 max-w-md mx-auto">
                    Your face enrollment is waiting for approval. Please wait for Admin/HOD verification before scanning.
                  </p>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium">
                  🔒 Face Scan is currently blocked until Admin/HOD approves your submission.
                </div>
              </div>
            )}

            {/* STATE 3: APPROVED */}
            {status === 'approved' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center mx-auto">
                  <FiCheckCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 mb-2">
                    ✓ Enrollment Approved
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    Face Attendance
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {todayAttStatus === 'present'
                      ? 'Your attendance has already been verified and marked as Present for today.'
                      : todayAttStatus === 'absent'
                      ? 'You are currently marked as Absent. Scan face to update your attendance to Present.'
                      : 'Face verification is ready. Click below to scan face.'}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button
                    variant="primary"
                    onClick={startAttendanceFlow}
                    disabled={todayAttStatus === 'present'}
                    icon={<FiUserCheck className="w-4 h-4" />}
                    className={`px-8 py-3 font-bold text-sm w-full sm:w-auto shadow-lg ${
                      todayAttStatus === 'present'
                        ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    }`}
                  >
                    {todayAttStatus === 'present' ? 'Already Present' : 'Scan Face'}
                  </Button>
                  <button
                    onClick={startEnrollmentFlow}
                    className="text-xs font-semibold text-gray-500 hover:text-indigo-600 underline"
                  >
                    Re-enroll Face
                  </button>
                </div>
              </div>
            )}

            {/* STATE 4: REJECTED */}
            {status === 'rejected' && (
              <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-rose-200 dark:border-rose-800 text-center space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-rose-100 dark:bg-rose-900/40 text-rose-600 flex items-center justify-center mx-auto">
                  <FiAlertCircle className="w-8 h-8" />
                </div>
                <div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 mb-2">
                    Enrollment Rejected
                  </span>
                  <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                    Face Enrollment
                  </h4>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    Your enrollment was not approved by Admin/HOD.
                  </p>
                  {enrollment?.rejectionReason && (
                    <div className="mt-3 p-3 bg-rose-50 dark:bg-rose-900/20 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-medium">
                      <strong>Reason:</strong> {enrollment.rejectionReason}
                    </div>
                  )}
                </div>
                <Button
                  variant="primary"
                  onClick={startEnrollmentFlow}
                  icon={<FiRefreshCw className="w-4 h-4" />}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white shadow-md font-bold"
                >
                  Re-enroll Face
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODE: ENROLLMENT (GUIDED 4 CAPTURES)
           ───────────────────────────────────────────────────────────────────────────── */}
        {mode === 'enroll' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-xl">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Step {currentStepIndex + 1} of {ENROLLMENT_CAPTURES.length}
                </p>
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  {ENROLLMENT_CAPTURES[currentStepIndex]?.prompt}
                </h4>
              </div>
              <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-200">
                Samples: {capturedDescriptors.length} / 4
              </span>
            </div>

            {/* Video preview container */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <div className="w-56 h-64 border-2 border-dashed border-indigo-400 rounded-3xl shadow-2xl flex items-center justify-center">
                  <span className="text-[11px] font-semibold text-white/80 bg-black/40 px-3 py-1 rounded-full backdrop-blur-sm">
                    Position Face Inside
                  </span>
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center p-4 text-center text-white space-y-2">
                  <FiAlertCircle className="w-10 h-10 text-rose-500" />
                  <p className="text-sm font-semibold">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Quality Status Message */}
            {qualityMessage && (
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-center text-xs font-semibold text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {qualityMessage}
              </div>
            )}

            {/* Controls */}
            <div className="flex justify-between items-center pt-2">
              <Button variant="secondary" size="sm" onClick={() => setMode('overview')}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCaptureNextSample}
                loading={isCapturing}
                disabled={!cameraActive || isCapturing}
                icon={<FiCamera className="w-4 h-4" />}
                className="px-6 font-bold"
              >
                {capturedDescriptors.length === ENROLLMENT_CAPTURES.length - 1
                  ? 'Finalize Enrollment'
                  : 'Capture Sample'}
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODE: ATTENDANCE (SCAN & EYE BLINK LIVENESS)
           ───────────────────────────────────────────────────────────────────────────── */}
        {mode === 'attendance' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-indigo-50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2">
                <FiEye className="w-5 h-5 text-indigo-600 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold uppercase text-indigo-600 dark:text-indigo-400">
                    Live Face Verification
                  </h4>
                  <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                    Blink once or click button below to mark attendance
                  </p>
                </div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  livenessStage === 'liveness_verified' || livenessStage === 'matching'
                    ? 'bg-emerald-100 text-emerald-800'
                    : livenessStage === 'failed'
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {livenessStage === 'liveness_verified' || livenessStage === 'matching'
                  ? '✓ Verified'
                  : livenessStage === 'failed'
                  ? 'Failed'
                  : 'Blink Challenge'}
              </span>
            </div>

            {/* Video Feed */}
            <div className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden flex items-center justify-center">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover transform -scale-x-100"
              />

              {/* Eye Blink Guide Overlay */}
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div
                  className={`w-60 h-64 border-4 rounded-3xl transition-all duration-300 flex items-center justify-center ${
                    livenessStage === 'liveness_verified' || livenessStage === 'matching'
                      ? 'border-emerald-500 bg-emerald-500/10'
                      : livenessStage === 'failed'
                      ? 'border-rose-500 bg-rose-500/10'
                      : 'border-amber-400 bg-amber-400/10'
                  }`}
                >
                  {(livenessStage === 'liveness_verified' || livenessStage === 'matching') && (
                    <FiCheckCircle className="w-16 h-16 text-emerald-400 animate-bounce" />
                  )}
                </div>
              </div>

              {cameraError && (
                <div className="absolute inset-0 bg-gray-900/90 flex flex-col items-center justify-center p-4 text-center text-white space-y-2">
                  <FiAlertCircle className="w-10 h-10 text-rose-500" />
                  <p className="text-sm font-semibold">{cameraError}</p>
                </div>
              )}
            </div>

            {/* Message Banner */}
            <div
              className={`p-3 rounded-xl text-center text-xs font-bold ${
                livenessStage === 'liveness_verified' || livenessStage === 'matching'
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : livenessStage === 'failed'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-amber-50 text-amber-800 border border-amber-200'
              }`}
            >
              {attendanceMessage || 'Position face and blink once to verify liveness.'}
            </div>

            {/* Action buttons with Manual Verification Backup */}
            <div className="flex justify-between items-center pt-2 gap-2">
              <Button variant="secondary" size="sm" onClick={() => setMode('overview')}>
                Back
              </Button>

              <Button
                variant="primary"
                size="sm"
                onClick={triggerVerificationDirectly}
                disabled={livenessStage === 'matching' || livenessStage === 'liveness_verified'}
                icon={<FiUserCheck className="w-4 h-4" />}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4"
              >
                Verify & Mark Attendance
              </Button>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────────────────────
            MODE: SUCCESS CARD (REQ 4, 14, 17)
           ───────────────────────────────────────────────────────────────────────────── */}
        {mode === 'success' && attendanceResult && (
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-emerald-200 dark:border-emerald-800 text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-md">
              <FiCheckCircle className="w-12 h-12" />
            </div>

            <div>
              <span className="px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 uppercase tracking-wider">
                ✓ Attendance Marked Successfully
              </span>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mt-3">
                {attendanceResult.studentName}
              </h3>
              <p className="text-xs text-gray-500 font-mono mt-0.5">
                Roll Number: {attendanceResult.rollNumber}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 text-left grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[10px]">Method</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">Face Recognition</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[10px]">Status</p>
                <p className="font-bold text-emerald-600">Present</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[10px]">Date</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">{attendanceResult.date}</p>
              </div>
              <div>
                <p className="text-gray-400 font-semibold uppercase text-[10px]">Time</p>
                <p className="font-bold text-gray-800 dark:text-gray-200">
                  {new Date(attendanceResult.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              </div>
            </div>

            <Button
              variant="primary"
              onClick={handleModalClose}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
            >
              Done
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
