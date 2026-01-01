import type { PoseLandmark } from '../types/pose.types';
import { LABELED_LANDMARKS } from '../types/pose.types';
import { PoseLandmarker } from "@mediapipe/tasks-vision";
import type { Mistake } from './mistakeDetection';

const POSE_CONNECTIONS = PoseLandmarker.POSE_CONNECTIONS;


/**
 * Draws all pose landmarks and connections on canvas
 * Coordinates are converted from normalized [0,1] to canvas pixels
 */
export function drawPoseLandmarks(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  canvasWidth: number,
  canvasHeight: number,
  mistakes: Mistake[] = []
): void {
  if (!landmarks || landmarks.length === 0) return;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw connections first (behind landmarks)
  drawConnections(ctx, landmarks, canvasWidth, canvasHeight);

  // Draw landmarks
  drawLandmarkPoints(ctx, landmarks, canvasWidth, canvasHeight);

  // Draw labels for key joints
  drawLandmarkLabels(ctx, landmarks, canvasWidth, canvasHeight);

  // Draw mistake alerts
  drawMistakeAlerts(ctx, mistakes, canvasWidth, canvasHeight);
}

function drawConnections(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number
): void {
  ctx.strokeStyle = '#00FF00';
  ctx.lineWidth = 2;

  POSE_CONNECTIONS.forEach(({ start, end }) => {
    const startLandmark = landmarks[start];
    const endLandmark = landmarks[end];

    if (startLandmark && endLandmark) {
      ctx.beginPath();
      ctx.moveTo(startLandmark.x * width, startLandmark.y * height);
      ctx.lineTo(endLandmark.x * width, endLandmark.y * height);
      ctx.stroke();
    }
  });
}

function drawLandmarkPoints(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number
): void {
  landmarks.forEach((landmark, index) => {
    const x = landmark.x * width;
    const y = landmark.y * height;

    // Highlight labeled landmarks
    const isLabeled = index in LABELED_LANDMARKS;
    ctx.fillStyle = isLabeled ? '#FF0000' : '#0000FF';
    
    ctx.beginPath();
    ctx.arc(x, y, isLabeled ? 6 : 4, 0, 2 * Math.PI);
    ctx.fill();
  });
}

function drawLandmarkLabels(
  ctx: CanvasRenderingContext2D,
  landmarks: PoseLandmark[],
  width: number,
  height: number
): void {
  ctx.font = '12px monospace';
  ctx.fillStyle = '#FFFF00';
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 3;

  Object.entries(LABELED_LANDMARKS).forEach(([indexStr, label]) => {
    const index = parseInt(indexStr);
    const landmark = landmarks[index];

    if (landmark) {
      const x = landmark.x * width;
      const y = landmark.y * height;
      
      const text = `${label} (${landmark.x.toFixed(2)}, ${landmark.y.toFixed(2)})`;
      
      // Draw text with black outline for readability
      ctx.strokeText(text, x + 10, y - 10);
      ctx.fillText(text, x + 10, y - 10);
    }
  });
}

function drawMistakeAlerts(
  ctx: CanvasRenderingContext2D,
  mistakes: Mistake[],
  width: number,
  _height: number
): void {
  if (mistakes.length === 0) return;

  const padding = 16;
  const alertHeight = 40;
  const alertSpacing = 8;
  const borderRadius = 8;
  const startX = width - 250;
  let startY = padding;

  ctx.font = 'bold 16px sans-serif';
  ctx.textBaseline = 'middle';

  mistakes.forEach((mistake) => {
    const alertWidth = 230;

    // Draw rounded rectangle background
    ctx.fillStyle = mistake.severity === 'error' ? 'rgba(220, 38, 38, 0.9)' : 'rgba(217, 119, 6, 0.9)';
    ctx.beginPath();
    ctx.roundRect(startX, startY, alertWidth, alertHeight, borderRadius);
    ctx.fill();

    // Draw text
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(mistake.message, startX + padding, startY + alertHeight / 2);

    startY += alertHeight + alertSpacing;
  });
}
