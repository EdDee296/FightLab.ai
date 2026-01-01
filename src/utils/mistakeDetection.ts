import { type PoseLandmark, LANDMARK_INDEX } from '../types/pose.types';

export type MistakeType = 'ARM_TUCK' | 'HANDS_TIGHT' | 'CHIN_DOWN' | 'SHOULDER_RELAX' | 'BEND_KNEES';

export interface Mistake {
  type: MistakeType;
  message: string;
  severity: 'warning' | 'error';
}

export function detectMistakes(landmarks: PoseLandmark[]): Mistake[] {
  const mistakes: Mistake[] = [];

  if (!landmarks || landmarks.length === 0) return mistakes;

  // Helper to get landmark
  const get = (index: number) => landmarks[index];

  const nose = get(LANDMARK_INDEX.NOSE);
  const leftEar = get(LANDMARK_INDEX.LEFT_EAR);
  const rightEar = get(LANDMARK_INDEX.RIGHT_EAR);
  const leftShoulder = get(LANDMARK_INDEX.LEFT_SHOULDER);
  const rightShoulder = get(LANDMARK_INDEX.RIGHT_SHOULDER);
  const leftElbow = get(LANDMARK_INDEX.LEFT_ELBOW);
  const rightElbow = get(LANDMARK_INDEX.RIGHT_ELBOW);
  const leftWrist = get(LANDMARK_INDEX.LEFT_WRIST);
  const rightWrist = get(LANDMARK_INDEX.RIGHT_WRIST);
  const leftHip = get(LANDMARK_INDEX.LEFT_HIP);
  const rightHip = get(LANDMARK_INDEX.RIGHT_HIP);
  const leftKnee = get(LANDMARK_INDEX.LEFT_KNEE);
  const rightKnee = get(LANDMARK_INDEX.RIGHT_KNEE);
  const leftAnkle = get(LANDMARK_INDEX.LEFT_ANKLE);
  const rightAnkle = get(LANDMARK_INDEX.RIGHT_ANKLE);

  // Calculate shoulder width for normalization
  const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);

  // Helper function to calculate angle between three points
  const calculateAngle = (a: PoseLandmark, b: PoseLandmark, c: PoseLandmark): number => {
    const radians = Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(a.y - b.y, a.x - b.x);
    let angle = Math.abs(radians * 180.0 / Math.PI);
    if (angle > 180.0) {
      angle = 360.0 - angle;
    }
    return angle;
  };

  // 1. Arm Tuck (Elbows flared)
  // Check if elbows are too far apart relative to shoulders
  const elbowWidth = Math.hypot(leftElbow.x - rightElbow.x, leftElbow.y - rightElbow.y);
  
  // If elbows are significantly wider than shoulders, they are flared
  if (elbowWidth > shoulderWidth * 1.6) { 
     mistakes.push({ type: 'ARM_TUCK', message: 'Tuck your elbows in!', severity: 'warning' });
  }

  // 2. Hands Tight (Guard up)
  // Check if hands are too low (below shoulders)
  if (leftWrist.y > leftShoulder.y + 0.01|| rightWrist.y > rightShoulder.y + 0.01) {
      mistakes.push({ type: 'HANDS_TIGHT', message: 'Keep your hands up!', severity: 'error' });
  } else {
      // Check if hands are too far from face
      const distL = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
      const distR = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);
      
      // If hands are far from nose, guard is wide/loose
      if (distL > shoulderWidth * 1.2 || distR > shoulderWidth * 1.2) {
           mistakes.push({ type: 'HANDS_TIGHT', message: 'Keep hands tight to face!', severity: 'warning' });
      }
  }

  // 3. Chin Down
  // Check nose position relative to ears
  // In boxing, chin should be tucked significantly down
  // Nose should be well below the ear line
  const avgEarY = (leftEar.y + rightEar.y) / 2;
  const chinTuckThreshold = shoulderWidth * 0.111; // Nose should be at least this much below ears
  
  if (nose.y < avgEarY + chinTuckThreshold) {
      mistakes.push({ type: 'CHIN_DOWN', message: 'Chin down!', severity: 'warning' });
  }

  // 5. Bend Knees
  // Check knee angles - should be bent for proper boxing stance
  // Angle is formed by hip -> knee -> ankle
  const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
  const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
  
  // If knees are too straight (angle close to 180), they need to bend
  // A good boxing stance has knees bent around 150-165 degrees
  if (leftKneeAngle > 178.5 || rightKneeAngle > 178.5) {
      mistakes.push({ type: 'BEND_KNEES', message: 'Bend your knees!', severity: 'warning' });
  }

  return mistakes;
}
