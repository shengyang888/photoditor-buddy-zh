/**
 * MediaPipe Face Landmarker index sets (478-point face mesh).
 * Indices follow the canonical face-mesh topology published by MediaPipe.
 */
export const FACE_OVAL = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 152, 148,
  176, 149, 150, 136, 172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
export const LIPS_OUTER = [
  61, 146, 91, 181, 84, 17, 314, 405, 321, 375, 291, 409, 270, 269, 267, 0, 37, 39, 40, 185,
];
export const LIPS_INNER = [
  78, 95, 88, 178, 87, 14, 317, 402, 318, 324, 308, 415, 310, 311, 312, 13, 82, 81, 80, 191,
];
export const LEFT_EYE = [
  33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246,
];
export const RIGHT_EYE = [
  263, 249, 390, 373, 374, 380, 381, 382, 362, 398, 384, 385, 386, 387, 388, 466,
];
export const LEFT_EYEBROW = [70, 63, 105, 66, 107, 55, 65, 52, 53, 46];
export const RIGHT_EYEBROW = [300, 293, 334, 296, 336, 285, 295, 282, 283, 276];
export const LEFT_IRIS = [468, 469, 470, 471, 472];
export const RIGHT_IRIS = [473, 474, 475, 476, 477];

/** Single landmark indices used by reshape. */
export const LANDMARK = {
  chin: 152,
  noseTip: 4,
  noseBridge: 6,
  noseLeft: 129,
  noseRight: 358,
  leftCheek: 234,
  rightCheek: 454,
  leftJaw: 172,
  rightJaw: 397,
  leftCheekbone: 50,
  rightCheekbone: 280,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftIrisCenter: 468,
  rightIrisCenter: 473,
  mouthLeft: 61,
  mouthRight: 291,
  upperLip: 13,
  lowerLip: 14,
  forehead: 10,
  betweenEyes: 168,
  leftEyeTop: 159,
  leftEyeBottom: 145,
  rightEyeTop: 386,
  rightEyeBottom: 374,
} as const;

/** A single detected face: 478 normalised (0..1) landmarks. */
export interface FaceLandmarks {
  points: { x: number; y: number; z: number }[];
}

/** Returns the polygon (normalised points) for an index list. */
export function polygon(
  face: FaceLandmarks,
  indices: readonly number[],
): { x: number; y: number }[] {
  return indices.map((i) => {
    const p = face.points[i];
    return p ? { x: p.x, y: p.y } : { x: 0, y: 0 };
  });
}

/** Centre of an index list. */
export function centroid(
  face: FaceLandmarks,
  indices: readonly number[],
): { x: number; y: number } {
  const pts = polygon(face, indices);
  const sum = pts.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / pts.length, y: sum.y / pts.length };
}

/** Approximate face size: distance between the cheek landmarks, in normalised units. */
export function faceWidth(face: FaceLandmarks): number {
  const l = face.points[LANDMARK.leftCheek];
  const r = face.points[LANDMARK.rightCheek];
  if (!l || !r) return 0.2;
  return Math.hypot(r.x - l.x, r.y - l.y);
}
