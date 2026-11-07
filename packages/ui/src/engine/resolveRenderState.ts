import {
  buildMakeupOverlay,
  buildPortraitMask,
  buildRecipeLut,
  buildReshapeField,
  findFilter,
  stackPreset,
  type Adjustments,
  type DisplacementField,
  type FaceLandmarks,
  type Lut3D,
  type PortraitRenderInput,
  type RenderState,
} from '@photoditor-buddy/core';
import type { EditSnapshot } from '../store/types';

/** Effective adjustments = user sliders + active filter offsets. */
export function effectiveAdjustments(snapshot: EditSnapshot): Adjustments {
  if (!snapshot.filter) return snapshot.adjustments;
  const filter = findFilter(snapshot.filter.id);
  if (!filter) return snapshot.adjustments;
  return stackPreset(snapshot.adjustments, filter.preset, snapshot.filter.intensity / 100);
}

/** Resolves which LUT (if any) the frame uses and at which strength. */
export function resolveLut(snapshot: EditSnapshot): { lut: Lut3D | null; intensity: number } {
  if (snapshot.adjustments.lut.id === 'user' && snapshot.userLut) {
    return { lut: snapshot.userLut, intensity: snapshot.adjustments.lut.intensity };
  }
  if (snapshot.filter) {
    const filter = findFilter(snapshot.filter.id);
    if (filter?.lut)
      return { lut: buildRecipeLut(filter.lut), intensity: snapshot.filter.intensity };
  }
  return { lut: null, intensity: 0 };
}

/**
 * Caches the expensive portrait inputs (masks, makeup, displacement) between frames.
 * Keys are cheap JSON strings of the settings that affect each artefact.
 */
class PortraitCache {
  private maskKey = '';
  private mask: ImageData | null = null;
  private maskVersion = 0;
  private makeupKey = '';
  private makeup: ImageData | null = null;
  private makeupVersion = 0;
  private fieldKey = '';
  private field: DisplacementField | null = null;
  private fieldVersion = 0;
  private facesRef: FaceLandmarks[] | null = null;

  resolve(snapshot: EditSnapshot, faces: FaceLandmarks[] | null): PortraitRenderInput | null {
    const p = snapshot.portrait;
    const width = snapshot.source.preview.width;
    const height = snapshot.source.preview.height;
    const facesChanged = faces !== this.facesRef;
    this.facesRef = faces;
    const skinActive =
      faces && faces.length > 0 && (p.skin.smooth || p.skin.whiten || p.skin.teeth || p.skin.eyes);
    const blemishActive = p.blemishSpots.length > 0;
    const makeupActive =
      faces && faces.length > 0 && Object.values(p.makeup).some((m) => m.opacity > 0);

    if (skinActive || blemishActive) {
      const key = `${width}x${height}|${faces?.length ?? 0}|${JSON.stringify(p.blemishSpots)}`;
      if (key !== this.maskKey || facesChanged) {
        this.mask = buildPortraitMask(faces ?? [], width, height, p.blemishSpots);
        this.maskKey = key;
        this.maskVersion++;
      }
    } else {
      this.mask = null;
      this.maskKey = '';
    }

    if (makeupActive) {
      const key = `${width}x${height}|${JSON.stringify(p.makeup)}`;
      if (key !== this.makeupKey || facesChanged) {
        this.makeup = buildMakeupOverlay(faces ?? [], width, height, p.makeup);
        this.makeupKey = key;
        this.makeupVersion++;
      }
    } else {
      this.makeup = null;
      this.makeupKey = '';
    }

    const fieldKey = `${width}x${height}|${JSON.stringify(p.reshape)}|${p.liquify.length}|${p.liquify.reduce((n, s) => n + s.points.length, 0)}`;
    if (fieldKey !== this.fieldKey || facesChanged) {
      this.field = buildReshapeField(faces ?? [], p.reshape, p.liquify, width, height);
      this.fieldKey = fieldKey;
      this.fieldVersion++;
    }

    if (!this.mask && !this.makeup && !this.field) return null;
    return {
      mask: this.mask,
      maskVersion: this.maskVersion,
      makeup: this.makeup,
      makeupVersion: this.makeupVersion,
      displacement: this.field,
      displacementVersion: this.fieldVersion,
      smooth: p.skin.smooth / 100,
      whiten: p.skin.whiten / 100,
      teeth: p.skin.teeth / 100,
      eyes: p.skin.eyes / 100,
      blemish: p.skin.blemish / 100,
    };
  }
}

const portraitCache = new PortraitCache();

/** Builds the complete `RenderState` for the current snapshot. */
export function resolveRenderState(
  snapshot: EditSnapshot,
  faces: FaceLandmarks[] | null,
): RenderState {
  const adjustments = effectiveAdjustments(snapshot);
  const { lut, intensity } = resolveLut(snapshot);
  const withLut: Adjustments = lut
    ? { ...adjustments, lut: { id: adjustments.lut.id, intensity } }
    : adjustments;
  return {
    adjustments: withLut,
    lut,
    effect: snapshot.effect,
    portrait: portraitCache.resolve(snapshot, faces),
  };
}
