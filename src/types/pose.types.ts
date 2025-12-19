/**
 * MediaPipe Pose Landmark indices
 * Coordinates are normalized [0, 1] relative to video dimensions
 */
export interface PoseLandmark {
  x: number; // Normalized x coordinate (0-1)
  y: number; // Normalized y coordinate (0-1)
  z: number; // Depth relative to hips (not used for 2D drawing)
  visibility?: number; // Confidence score (0-1)
}

export interface PoseResults {
  poseLandmarks?: PoseLandmark[];
}

// Key landmark indices for labeling
export const LANDMARK_INDEX = {
  NOSE: 0,
  LEFT_SHOULDER: 11,
  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,
  RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,
  RIGHT_WRIST: 16,
  LEFT_HIP: 23,
  RIGHT_HIP: 24,
} as const;

export type LandmarkIndex = typeof LANDMARK_INDEX[keyof typeof LANDMARK_INDEX];

export const LABELED_LANDMARKS: Record<number, string> = {
  [LANDMARK_INDEX.NOSE]: 'Nose',
  [LANDMARK_INDEX.LEFT_SHOULDER]: 'L Shoulder',
  [LANDMARK_INDEX.RIGHT_SHOULDER]: 'R Shoulder',
  [LANDMARK_INDEX.LEFT_ELBOW]: 'L Elbow',
  [LANDMARK_INDEX.RIGHT_ELBOW]: 'R Elbow',
  [LANDMARK_INDEX.LEFT_WRIST]: 'L Wrist',
  [LANDMARK_INDEX.RIGHT_WRIST]: 'R Wrist',
  [LANDMARK_INDEX.LEFT_HIP]: 'L Hip',
  [LANDMARK_INDEX.RIGHT_HIP]: 'R Hip',
};
