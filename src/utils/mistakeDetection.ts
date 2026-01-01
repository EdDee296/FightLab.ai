import { type PoseLandmark, LANDMARK_INDEX } from '../types/pose.types';

export type MistakeType = 'ARM_TUCK' | 'HANDS_TIGHT' | 'CHIN_DOWN' | 'SHOULDER_RELAX' | 'BACK_FOOT_UP';

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
  const leftHeel = get(LANDMARK_INDEX.LEFT_HEEL);
  const rightHeel = get(LANDMARK_INDEX.RIGHT_HEEL);
  const leftToe = get(LANDMARK_INDEX.LEFT_FOOT_INDEX);
  const rightToe = get(LANDMARK_INDEX.RIGHT_FOOT_INDEX);

  // Calculate shoulder width for normalization
  const shoulderWidth = Math.hypot(leftShoulder.x - rightShoulder.x, leftShoulder.y - rightShoulder.y);

  // 1. Arm Tuck (Elbows flared)
  // Check if elbows are too far apart relative to shoulders
  const elbowWidth = Math.hypot(leftElbow.x - rightElbow.x, leftElbow.y - rightElbow.y);
  
  // If elbows are significantly wider than shoulders, they are flared
  if (elbowWidth > shoulderWidth * 1.6) { 
     mistakes.push({ type: 'ARM_TUCK', message: 'Tuck your elbows in!', severity: 'warning' });
  }

  // 2. Hands Tight (Guard up)
  // Check if hands are too low (below shoulders)
  if (leftWrist.y > leftShoulder.y || rightWrist.y > rightShoulder.y) {
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
  const chinTuckThreshold = shoulderWidth * 0.13; // Nose should be at least this much below ears
  
  if (nose.y < avgEarY + chinTuckThreshold) {
      mistakes.push({ type: 'CHIN_DOWN', message: 'Chin down!', severity: 'warning' });
  }

  // 4. Shoulder Relax
  // Check distance between shoulders and ears
  const distLeftShoulderEar = Math.hypot(leftShoulder.x - leftEar.x, leftShoulder.y - leftEar.y);
  const distRightShoulderEar = Math.hypot(rightShoulder.x - rightEar.x, rightShoulder.y - rightEar.y);
  const avgShoulderEarDist = (distLeftShoulderEar + distRightShoulderEar) / 2;
  
  // If shoulders are too close to ears, they are shrugged
  if (avgShoulderEarDist < shoulderWidth * 0.25) {
      mistakes.push({ type: 'SHOULDER_RELAX', message: 'Relax your shoulders!', severity: 'warning' });
  }

  // 5. Up on the back foot
  // Check if at least one heel is raised (Heel Y < Toe Y)
  // We use a small threshold to account for noise/flat shoes
  const leftHeelRaised = leftHeel.y < leftToe.y;
  const rightHeelRaised = rightHeel.y < rightToe.y;

  if (!leftHeelRaised && !rightHeelRaised) {
      mistakes.push({ type: 'BACK_FOOT_UP', message: 'Stay on your toes (back foot)!', severity: 'warning' });
  }

  return mistakes;
}
