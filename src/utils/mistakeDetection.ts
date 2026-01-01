import { type PoseLandmark, LANDMARK_INDEX } from '../types/pose.types';

export type MistakeType = 'ARM_TUCK' | 'HANDS_TIGHT' | 'CHIN_DOWN' | 'SHOULDER_RELAX' | 'BEND_KNEES';

export interface Mistake {
  type: MistakeType;
  message: string;
  severity: 'warning' | 'error';
  shouldAlert?: boolean;
}

// Track mistake persistence across frames
class MistakeTracker {
  private counters: Map<string, number> = new Map();
  private readonly ALERT_THRESHOLD = 30; // frames 

  track(detectedMistakes: string[]): Set<string> {
    const shouldAlert = new Set<string>();

    // Increment counters for detected mistakes
    for (const mistake of detectedMistakes) {
      const count = (this.counters.get(mistake) || 0) + 1;
      this.counters.set(mistake, count);

      // Trigger alert if threshold reached
      if (count === this.ALERT_THRESHOLD) {
        shouldAlert.add(mistake);
      }
    }

    // Decrement counters for mistakes not detected this frame
    for (const [mistake, count] of this.counters.entries()) {
      if (!detectedMistakes.includes(mistake)) {
        const newCount = Math.max(0, count - 1);
        if (newCount === 0) {
          this.counters.delete(mistake);
        } else {
          this.counters.set(mistake, newCount);
        }
      }
    }

    return shouldAlert;
  }

  reset() {
    this.counters.clear();
  }
}

// Export singleton instance
export const mistakeTracker = new MistakeTracker();

// Helper function to detect if a punch is being thrown
function isPunching(
  shoulder: PoseLandmark, 
  elbow: PoseLandmark, 
  wrist: PoseLandmark,
  shoulderWidth: number
): boolean {
  // Calculate arm extension
  const armLength = Math.hypot(wrist.x - shoulder.x, wrist.y - shoulder.y);
  
  // Check if arm is extended (elbow angle close to straight)
  const shoulderToElbow = { x: elbow.x - shoulder.x, y: elbow.y - shoulder.y };
  const elbowToWrist = { x: wrist.x - elbow.x, y: wrist.y - elbow.y };
  
  // Calculate angle at elbow using dot product
  const dotProduct = shoulderToElbow.x * elbowToWrist.x + shoulderToElbow.y * elbowToWrist.y;
  const mag1 = Math.sqrt(shoulderToElbow.x ** 2 + shoulderToElbow.y ** 2);
  const mag2 = Math.sqrt(elbowToWrist.x ** 2 + elbowToWrist.y ** 2);
  const angle = Math.acos(dotProduct / (mag1 * mag2)) * (180 / Math.PI);
  
  // Arm is extended if elbow angle is SMALL
  return angle < 30 && armLength > shoulderWidth * 0.8;

}

export function detectMistakes(landmarks: PoseLandmark[], trackPersistence = true): Mistake[] {
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

  // Detect if either hand is punching
  const leftPunching = isPunching(leftShoulder, leftElbow, leftWrist, shoulderWidth);
  const rightPunching = isPunching(rightShoulder, rightElbow, rightWrist, shoulderWidth);

  // Track detected mistake keys for persistence
  const detectedKeys: string[] = [];

  // 1. Arm Tuck (Elbows flared) - Only check non-punching arm(s)
  if (!leftPunching && !rightPunching) {
    // In stance, check both elbows
    const elbowWidth = Math.hypot(leftElbow.x - rightElbow.x, leftElbow.y - rightElbow.y);
    if (elbowWidth > shoulderWidth * 1.6) { 
       detectedKeys.push('ARM_TUCK');
    }
  }
  
  // When punching, only check the non-punching elbow (never check punching arm elbow)
  if (!leftPunching && rightPunching) {
    // Left arm is NOT punching, check its elbow
    const leftElbowDist = Math.abs(leftElbow.x - leftShoulder.x);
    if (leftElbowDist > shoulderWidth * 0.4) {
      detectedKeys.push('ARM_TUCK_PUNCH');
    }
  }
  if (leftPunching && !rightPunching) {
    // Right arm is NOT punching, check its elbow
    const rightElbowDist = Math.abs(rightElbow.x - rightShoulder.x);
    if (rightElbowDist > shoulderWidth * 0.4) {
      detectedKeys.push('ARM_TUCK_PUNCH');
    }
  }

  // 2. Hands Tight (Guard up) - Only check non-punching hand(s)
  if (!leftPunching) {
    // Check left hand
    if (leftWrist.y > leftShoulder.y + 0.01) {
      detectedKeys.push('HANDS_TIGHT_LEFT');
    } else {
      const distL = Math.hypot(leftWrist.x - nose.x, leftWrist.y - nose.y);
      if (distL > shoulderWidth * 1.2) {
        detectedKeys.push('HANDS_TIGHT_LEFT');
      }
    }
  }

  if (!rightPunching) {
    // Check right hand
    if (rightWrist.y > rightShoulder.y + 0.01) {
      detectedKeys.push('HANDS_TIGHT_RIGHT');
    } else {
      const distR = Math.hypot(rightWrist.x - nose.x, rightWrist.y - nose.y);
      if (distR > shoulderWidth * 1.2) {
        detectedKeys.push('HANDS_TIGHT_RIGHT');
      }
    }
  }

  // 3. Chin Down - Always check regardless of punching
  const avgEarY = (leftEar.y + rightEar.y) / 2;
  const chinTuckThreshold = shoulderWidth * 0.111;
  
  if (nose.y < avgEarY + chinTuckThreshold) {
      detectedKeys.push('CHIN_DOWN');
  }

  // 4. Bend Knees - Only check if lower body is visible
  const minVisibility = 0.5;
  const lowerBodyVisible = 
    (leftHip.visibility ?? 1) > minVisibility &&
    (rightHip.visibility ?? 1) > minVisibility &&
    (leftKnee.visibility ?? 1) > minVisibility &&
    (rightKnee.visibility ?? 1) > minVisibility &&
    (leftAnkle.visibility ?? 1) > minVisibility &&
    (rightAnkle.visibility ?? 1) > minVisibility;

  if (lowerBodyVisible) {
    const leftKneeAngle = calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = calculateAngle(rightHip, rightKnee, rightAnkle);
    
    if (leftKneeAngle > 178.5 || rightKneeAngle > 178.5) {
      detectedKeys.push('BEND_KNEES');
    }
  }

  // Track persistence and determine which should alert
  const shouldAlertKeys = trackPersistence 
    ? mistakeTracker.track(detectedKeys)
    : new Set(detectedKeys);

  // Build mistake objects with alert flags
  const mistakeConfig: Record<string, { type: MistakeType, message: string, severity: 'warning' | 'error' }> = {
    'ARM_TUCK': { type: 'ARM_TUCK', message: 'Tuck your elbows in!', severity: 'warning' },
    'ARM_TUCK_PUNCH': { type: 'ARM_TUCK', message: 'Keep your guard elbow in!', severity: 'warning' },
    'HANDS_TIGHT_LEFT': { type: 'HANDS_TIGHT', message: leftPunching ? 'Keep left hand up!' : 'Keep your left hand up!', severity: 'error' },
    'HANDS_TIGHT_RIGHT': { type: 'HANDS_TIGHT', message: rightPunching ? 'Keep right hand up!' : 'Keep your right hand up!', severity: 'error' },
    'CHIN_DOWN': { type: 'CHIN_DOWN', message: 'Chin down!', severity: 'warning' },
    'BEND_KNEES': { type: 'BEND_KNEES', message: 'Bend your knees!', severity: 'warning' }
  };

  for (const key of detectedKeys) {
    const config = mistakeConfig[key];
    if (config) {
      mistakes.push({
        type: config.type,
        message: config.message,
        severity: config.severity,
        shouldAlert: shouldAlertKeys.has(key)
      });
    }
  }

  return mistakes;
}