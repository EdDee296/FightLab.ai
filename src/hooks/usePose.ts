import { useEffect, useRef, useState } from 'react';
import { Pose } from '@mediapipe/pose';
import { Camera } from '@mediapipe/camera_utils';
import type { PoseResults } from '../types/pose.types';
import { drawPoseLandmarks } from '../utils/drawingUtils';

interface UsePoseReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isLoading: boolean;
  error: string | null;
  isPoseDetected: boolean;
}

/**
 * Hook to initialize MediaPipe Pose and process webcam feed
 */
export function usePose(): UsePoseReturn {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const poseRef = useRef<Pose | null>(null);
  const cameraRef = useRef<Camera | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isPoseDetected, setIsPoseDetected] = useState(false);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const videoElement = videoRef.current;
    const canvasElement = canvasRef.current;

    // Initialize MediaPipe Pose
    const pose = new Pose({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
      },
    });

    pose.setOptions({
      modelComplexity: 1, // 0, 1, or 2 (higher = more accurate, slower)
      smoothLandmarks: true,
      enableSegmentation: false,
      smoothSegmentation: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    pose.onResults((results: PoseResults) => {
      const ctx = canvasElement.getContext('2d');
      if (!ctx) return;

      setIsPoseDetected(!!results.poseLandmarks);

      if (results.poseLandmarks) {
        drawPoseLandmarks(ctx, results.poseLandmarks, 640, 480);
      } else {
        ctx.clearRect(0, 0, 640, 480);
      }
    });

    poseRef.current = pose;

    // Initialize camera
    const camera = new Camera(videoElement, {
      onFrame: async () => {
        if (poseRef.current) {
          await poseRef.current.send({ image: videoElement });
        }
      },
      width: 640,
      height: 480,
    });

    cameraRef.current = camera;

    camera
      .start()
      .then(() => {
        setIsLoading(false);
      })
      .catch((err) => {
        setError(`Failed to start camera: ${err.message}`);
        setIsLoading(false);
      });

    // Cleanup
    return () => {
      camera.stop();
      pose.close();
    };
  }, []);

  return {
    videoRef,
    canvasRef,
    isLoading,
    error,
    isPoseDetected,
  };
}
