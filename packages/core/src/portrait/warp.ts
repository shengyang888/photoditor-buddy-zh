import type { DisplacementField } from '../render/types';
import { LANDMARK, faceWidth, type FaceLandmarks } from './regions';
import type { LiquifyStroke, ReshapeSettings } from './types';

/** Resolution of the displacement field's longest edge. Bilinear GPU sampling hides the low resolution. */
export const FIELD_MAX_EDGE = 256;

/** Creates an all-zero displacement field sized for an image of the given aspect ratio. */
export function createField(imageWidth: number, imageHeight: number): DisplacementField {
  const scale = FIELD_MAX_EDGE / Math.max(imageWidth, imageHeight);
  const width = Math.max(2, Math.round(imageWidth * scale));
  const height = Math.max(2, Math.round(imageHeight * scale));
  return { width, height, data: new Float32Array(width * height * 2) };
}

/** Smooth falloff: 1 at the centre, 0 at `radius`, with a soft shoulder. */
function falloff(dist: number, radius: number): number {
  if (dist >= radius) return 0;
  const t = 1 - dist / radius;
  return t * t * (3 - 2 * t);
}

/**
 * Push: pixels inside `radius` of (cx, cy) appear moved by (dx, dy). Because the shader samples
 * source = dest + offset, the stored offset is the negative of the visual movement.
 * All coordinates are normalised (0..1); `aspect` corrects distances for non-square images.
 */
export function pushPoint(
  field: DisplacementField,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
  radius: number,
  aspect: number,
): void {
  const { width, height, data } = field;
  const x0 = Math.max(0, Math.floor((cx - radius) * width));
  const x1 = Math.min(width - 1, Math.ceil((cx + radius) * width));
  const y0 = Math.max(0, Math.floor((cy - radius / aspect) * height));
  const y1 = Math.min(height - 1, Math.ceil((cy + radius / aspect) * height));
  for (let y = y0; y <= y1; y++) {
    const py = (y + 0.5) / height;
    for (let x = x0; x <= x1; x++) {
      const px = (x + 0.5) / width;
      const d = Math.hypot(px - cx, (py - cy) * aspect);
      const w = falloff(d, radius);
      if (w <= 0) continue;
      const i = (y * width + x) * 2;
      data[i] = data[i]! - dx * w;
      data[i + 1] = data[i + 1]! - dy * w;
    }
  }
}

/**
 * Bulge (strength > 0) or pinch (strength < 0) around a point. Enlarging means sampling closer
 * to the centre, so offsets point inwards for a bulge.
 */
export function bulgePoint(
  field: DisplacementField,
  cx: number,
  cy: number,
  radius: number,
  strength: number,
  aspect: number,
): void {
  const { width, height, data } = field;
  const x0 = Math.max(0, Math.floor((cx - radius) * width));
  const x1 = Math.min(width - 1, Math.ceil((cx + radius) * width));
  const y0 = Math.max(0, Math.floor((cy - radius / aspect) * height));
  const y1 = Math.min(height - 1, Math.ceil((cy + radius / aspect) * height));
  for (let y = y0; y <= y1; y++) {
    const py = (y + 0.5) / height;
    for (let x = x0; x <= x1; x++) {
      const px = (x + 0.5) / width;
      const vx = px - cx;
      const vy = (py - cy) * aspect;
      const d = Math.hypot(vx, vy);
      const w = falloff(d, radius);
      if (w <= 0) continue;
      const k = -strength * w;
      const i = (y * width + x) * 2;
      data[i] = data[i]! + vx * k;
      data[i + 1] = data[i + 1]! + (vy * k) / aspect;
    }
  }
}

/**
 * Builds the displacement field for the reshape sliders on every detected face, then applies
 * the liquify strokes on top. Returns null when nothing would change (saves a GPU pass).
 */
export function buildReshapeField(
  faces: FaceLandmarks[],
  reshape: ReshapeSettings,
  liquify: LiquifyStroke[],
  imageWidth: number,
  imageHeight: number,
): DisplacementField | null {
  const anyReshape = Object.values(reshape).some((v) => v !== 0);
  if ((!anyReshape || faces.length === 0) && liquify.length === 0) return null;
  const field = createField(imageWidth, imageHeight);
  const aspect = imageWidth / imageHeight;
  const pt = (face: FaceLandmarks, idx: number): { x: number; y: number } => {
    const p = face.points[idx];
    return p ? { x: p.x, y: p.y } : { x: 0.5, y: 0.5 };
  };

  for (const face of faces) {
    const fw = faceWidth(face);
    const s = (v: number): number => v / 100;
    const nose = pt(face, LANDMARK.noseTip);
    const chin = pt(face, LANDMARK.chin);
    const between = pt(face, LANDMARK.betweenEyes);
    const centreX = nose.x;

    if (reshape.faceSlim) {
      const k = s(reshape.faceSlim) * fw * 0.11;
      for (const idx of [LANDMARK.leftCheek, LANDMARK.leftJaw]) {
        const p = pt(face, idx);
        pushPoint(field, p.x, p.y, (centreX - p.x > 0 ? 1 : -1) * k, 0, fw * 0.4, aspect);
      }
      for (const idx of [LANDMARK.rightCheek, LANDMARK.rightJaw]) {
        const p = pt(face, idx);
        pushPoint(field, p.x, p.y, (centreX - p.x > 0 ? 1 : -1) * k, 0, fw * 0.4, aspect);
      }
    }
    if (reshape.jaw) {
      const k = s(reshape.jaw) * fw * 0.08;
      const l = pt(face, LANDMARK.leftJaw);
      const r = pt(face, LANDMARK.rightJaw);
      pushPoint(field, l.x, l.y, k, (k * 0.3) / aspect, fw * 0.24, aspect);
      pushPoint(field, r.x, r.y, -k, (k * 0.3) / aspect, fw * 0.24, aspect);
    }
    if (reshape.chin) {
      const k = s(reshape.chin) * fw * 0.14;
      pushPoint(field, chin.x, chin.y, 0, k / aspect, fw * 0.35, aspect);
    }
    if (reshape.forehead) {
      const top = pt(face, LANDMARK.forehead);
      const k = s(reshape.forehead) * fw * 0.14;
      pushPoint(field, top.x, top.y, 0, -k / aspect, fw * 0.45, aspect);
    }
    if (reshape.headSize) {
      const centre = { x: (between.x + chin.x) / 2, y: (between.y + chin.y) / 2 };
      bulgePoint(field, centre.x, centre.y, fw * 1.1, -s(reshape.headSize) * 0.2, aspect);
    }
    if (reshape.noseWidth) {
      const k = s(reshape.noseWidth) * fw * 0.06;
      const l = pt(face, LANDMARK.noseLeft);
      const r = pt(face, LANDMARK.noseRight);
      pushPoint(field, l.x, l.y, k, 0, fw * 0.14, aspect);
      pushPoint(field, r.x, r.y, -k, 0, fw * 0.14, aspect);
    }
    if (reshape.eyeSize) {
      for (const idx of [LANDMARK.leftIrisCenter, LANDMARK.rightIrisCenter]) {
        const p = pt(face, idx);
        bulgePoint(field, p.x, p.y, fw * 0.2, s(reshape.eyeSize) * 0.45, aspect);
      }
    }
    if (reshape.eyeDistance) {
      const k = s(reshape.eyeDistance) * fw * 0.07;
      const l = pt(face, LANDMARK.leftIrisCenter);
      const r = pt(face, LANDMARK.rightIrisCenter);
      pushPoint(field, l.x, l.y, -k, 0, fw * 0.22, aspect);
      pushPoint(field, r.x, r.y, k, 0, fw * 0.22, aspect);
    }
    if (reshape.eyeLift) {
      const k = s(reshape.eyeLift) * fw * 0.06;
      const l = pt(face, LANDMARK.leftEyeOuter);
      const r = pt(face, LANDMARK.rightEyeOuter);
      pushPoint(field, l.x, l.y, 0, -k / aspect, fw * 0.16, aspect);
      pushPoint(field, r.x, r.y, 0, -k / aspect, fw * 0.16, aspect);
    }
    if (reshape.mouthSize) {
      const c = {
        x: (pt(face, LANDMARK.upperLip).x + pt(face, LANDMARK.lowerLip).x) / 2,
        y: (pt(face, LANDMARK.upperLip).y + pt(face, LANDMARK.lowerLip).y) / 2,
      };
      bulgePoint(field, c.x, c.y, fw * 0.3, s(reshape.mouthSize) * 0.35, aspect);
    }
  }

  for (const stroke of liquify) applyLiquifyStroke(field, stroke, aspect);
  return field;
}

/** Applies one liquify stroke to the field (push along drag, bulge, pinch or restore-to-zero). */
export function applyLiquifyStroke(
  field: DisplacementField,
  stroke: LiquifyStroke,
  aspect: number,
): void {
  const pts = stroke.points;
  if (pts.length === 0) return;
  if (stroke.mode === 'restore') {
    const { width, height, data } = field;
    for (const p of pts) {
      const x0 = Math.max(0, Math.floor((p.x - stroke.radius) * width));
      const x1 = Math.min(width - 1, Math.ceil((p.x + stroke.radius) * width));
      const y0 = Math.max(0, Math.floor((p.y - stroke.radius / aspect) * height));
      const y1 = Math.min(height - 1, Math.ceil((p.y + stroke.radius / aspect) * height));
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          const d = Math.hypot((x + 0.5) / width - p.x, ((y + 0.5) / height - p.y) * aspect);
          const w = falloff(d, stroke.radius) * stroke.strength;
          if (w <= 0) continue;
          const i = (y * width + x) * 2;
          data[i] = data[i]! * (1 - w);
          data[i + 1] = data[i + 1]! * (1 - w);
        }
      }
    }
    return;
  }
  if (stroke.mode === 'bulge' || stroke.mode === 'pinch') {
    const sign = stroke.mode === 'bulge' ? 1 : -1;
    for (const p of pts)
      bulgePoint(field, p.x, p.y, stroke.radius, sign * stroke.strength * 0.08, aspect);
    return;
  }
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    const dx = (b.x - a.x) * stroke.strength * 0.6;
    const dy = (b.y - a.y) * stroke.strength * 0.6;
    pushPoint(field, b.x, b.y, dx, dy, stroke.radius, aspect);
  }
}
