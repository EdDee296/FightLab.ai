import { useEffect, useRef, useState } from 'react';
import { PoseLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { drawPoseLandmarks } from '../utils/drawingUtils';
import { detectMistakes, type Mistake } from '../utils/mistakeDetection';

interface UsePoseReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
  isPoseDetected: boolean;
  mistakes: Mistake[];
}

/**
 * Hook to initialize MediaPipe Pose and process webcam feed using new Tasks Vision API
 */
export function usePose(): UsePoseReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseLandmarkerRef = useRef<PoseLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPoseDetected, setIsPoseDetected] = useState(false);
  const [mistakes, setMistakes] = useState<Mistake[]>([]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;
    let stream: MediaStream | null = null;

    async function initializePose() {
      try {
        // Initialize MediaPipe Tasks Vision
        const vision = await FilesetResolver.forVisionTasks(
          'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
        );

        // Create PoseLandmarker
        const poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
            delegate: 'GPU',
          },
          runningMode: 'VIDEO',
          numPoses: 1,
          minPoseDetectionConfidence: 0.5,
          minPosePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        poseLandmarkerRef.current = poseLandmarker;

        // Get camera stream
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: 640, height: 480 },
          audio: false,
        });

        videoElement.srcObject = stream;

        // Wait for video to be ready before starting pose detection
        const onVideoReady = () => {
          setIsLoading(false);
          
          // Start processing frames
          const processFrame = () => {
            if (!videoElement.paused && !videoElement.ended && poseLandmarkerRef.current) {
              const startTimeMs = performance.now();
              const results = poseLandmarker.detectForVideo(videoElement, startTimeMs);

              const ctx = canvasElement.getContext('2d');
              if (ctx) {
                const hasPose = results.landmarks && results.landmarks.length > 0;
                setIsPoseDetected(hasPose);

                if (hasPose) {
                  const currentMistakes = detectMistakes(results.landmarks[0]);
                  setMistakes(currentMistakes);
                  drawPoseLandmarks(ctx, results.landmarks[0], 640, 480, currentMistakes);
                } else {
                  ctx.clearRect(0, 0, 640, 480);
                  setMistakes([]);
                }
              }

              animationFrameRef.current = requestAnimationFrame(processFrame);
            }
          };

          processFrame();
        };

        videoElement.addEventListener('loadeddata', onVideoReady, { once: true });
        videoElement.play();

      } catch (err: any) {
        setError(`Failed to initialize: ${err.message}`);
        setIsLoading(false);
      }
    }

    initializePose();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (poseLandmarkerRef.current) {
        poseLandmarkerRef.current.close();
      }
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    isPoseDetected,
    mistakes,
  };
}
