import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;

export async function loadFaceModels(modelUrl: string = '/models'): Promise<void> {
  if (modelsLoaded) return;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    try {
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(modelUrl),
        faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68Net.loadFromUri(modelUrl),
        faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
        faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
      ]);
      modelsLoaded = true;
      console.log('[Face Recognition] All faceapi models loaded successfully.');
    } catch (err) {
      console.warn('Primary model load issue, attempting fallback load:', err);
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(modelUrl),
          faceapi.nets.faceLandmark68TinyNet.loadFromUri(modelUrl),
          faceapi.nets.faceRecognitionNet.loadFromUri(modelUrl),
        ]);
        modelsLoaded = true;
      } catch (fallbackErr) {
        console.error('Failed to load faceapi models:', fallbackErr);
        throw fallbackErr;
      }
    }
  })();

  return loadingPromise;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
  detection?: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>;
}

/** Full validation with descriptors for sample capture */
export async function validateFaceFrame(
  video: HTMLVideoElement
): Promise<ValidationResult> {
  await loadFaceModels();

  if (!video || video.paused || video.ended || video.readyState < 2) {
    return { isValid: false, message: 'Camera stream not ready.' };
  }

  let detections: faceapi.WithFaceDescriptor<faceapi.WithFaceLandmarks<{ detection: faceapi.FaceDetection }>>[] = [];

  try {
    detections = await faceapi
      .detectAllFaces(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.45 }))
      .withFaceLandmarks()
      .withFaceDescriptors();
  } catch (_e) {
    try {
      detections = await faceapi
        .detectAllFaces(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.35 }))
        .withFaceLandmarks(true)
        .withFaceDescriptors();
    } catch (err) {
      return { isValid: false, message: 'Face detection error.' };
    }
  }

  if (!detections || detections.length === 0) {
    return {
      isValid: false,
      message: 'No face detected. Please position your face inside the guide.',
    };
  }

  if (detections.length > 1) {
    return {
      isValid: false,
      message: 'Multiple faces detected. Only one person should be visible.',
    };
  }

  const detection = detections[0];
  const box = detection.detection.box;
  const width = video.videoWidth || 640;
  const height = video.videoHeight || 480;

  const minWidth = width * 0.12;
  const minHeight = height * 0.12;
  if (box.width < minWidth || box.height < minHeight) {
    return {
      isValid: false,
      message: 'Face is too far away. Please move closer to the camera.',
    };
  }

  return {
    isValid: true,
    detection,
  };
}

/** Ultra-fast single-face landmark detector for high-FPS liveness loop */
export async function detectFaceLandmarksOnly(
  video: HTMLVideoElement
): Promise<{ detection: faceapi.FaceDetection; landmarks: faceapi.FaceLandmarks68 } | null> {
  await loadFaceModels();
  if (!video || video.paused || video.ended || video.readyState < 2) return null;

  try {
    const res = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.3 }))
      .withFaceLandmarks(true);

    if (res) return res;
  } catch (_e) {
    // Fallback SSD
  }

  try {
    const res = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks();
    return res || null;
  } catch (_e) {
    return null;
  }
}

/** Extract 128-d descriptor vector ONCE after liveness is confirmed */
export async function extractFaceDescriptor(
  video: HTMLVideoElement
): Promise<Float32Array | null> {
  await loadFaceModels();
  if (!video || video.paused || video.ended || video.readyState < 2) return null;

  try {
    const res = await faceapi
      .detectSingleFace(video, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.4 }))
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (res?.descriptor) return res.descriptor;
  } catch (_e) {
    // Fallback tiny
  }

  try {
    const res = await faceapi
      .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.3 }))
      .withFaceLandmarks(true)
      .withFaceDescriptor();

    return res?.descriptor || null;
  } catch (_e) {
    return null;
  }
}

function distance(p1: faceapi.Point, p2: faceapi.Point): number {
  return Math.sqrt(Math.pow(p1.x - p2.x, 2) + Math.pow(p1.y - p2.y, 2));
}

export function computeEyeAspectRatio(landmarks: faceapi.FaceLandmarks68): { leftEAR: number; rightEAR: number; avgEAR: number } {
  const points = landmarks.positions;

  // Left eye
  const p36 = points[36];
  const p37 = points[37];
  const p38 = points[38];
  const p39 = points[39];
  const p40 = points[40];
  const p41 = points[41];

  const leftVertical1 = distance(p37, p41);
  const leftVertical2 = distance(p38, p40);
  const leftHorizontal = distance(p36, p39);
  const leftEAR = (leftVertical1 + leftVertical2) / (2.0 * (leftHorizontal || 1));

  // Right eye
  const p42 = points[42];
  const p43 = points[43];
  const p44 = points[44];
  const p45 = points[45];
  const p46 = points[46];
  const p47 = points[47];

  const rightVertical1 = distance(p43, p47);
  const rightVertical2 = distance(p44, p46);
  const rightHorizontal = distance(p42, p45);
  const rightEAR = (rightVertical1 + rightVertical2) / (2.0 * (rightHorizontal || 1));

  const avgEAR = (leftEAR + rightEAR) / 2.0;

  return { leftEAR, rightEAR, avgEAR };
}

export function matchFaceDescriptor(
  candidateDescriptor: Float32Array | number[],
  enrolledDescriptors: number[][]
): { isMatch: boolean; distance: number } {
  if (!enrolledDescriptors || enrolledDescriptors.length === 0) {
    return { isMatch: false, distance: 1.0 };
  }

  let minDistance = Infinity;
  for (const enrolled of enrolledDescriptors) {
    const dist = faceapi.euclideanDistance(
      new Float32Array(candidateDescriptor),
      new Float32Array(enrolled)
    );
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  const MATCH_THRESHOLD = 0.60;
  return {
    isMatch: minDistance <= MATCH_THRESHOLD,
    distance: minDistance,
  };
}

export function captureVideoFrameBase64(video: HTMLVideoElement, width = 320, height = 240): string {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.drawImage(video, 0, 0, width, height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }
  return '';
}
