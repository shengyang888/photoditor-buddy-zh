import { create } from 'zustand';
import type { BrushKind, CropRect, GeometryEdit, MosaicStyle } from '@photoditor-buddy/core';

/** Beauty sub-modes; some need pointer interaction on the canvas. */
export type BeautyMode = 'skin' | 'reshape' | 'makeup' | 'liquify' | 'blemish';

/** Crop tool working state (not yet applied to the image). */
export interface CropDraft extends GeometryEdit {
  presetId: string;
  perspectiveV: number;
  perspectiveH: number;
  crop: CropRect;
}

/**
 * Transient UI state that never enters undo history: brush settings, the AI mask being painted,
 * the crop draft and the viewport zoom/pan.
 */
export interface InteractionState {
  brushSize: number;
  brushColor: string;
  brushKind: BrushKind;
  brushOpacity: number;
  mosaicStyle: MosaicStyle;
  mosaicBlock: number;
  liquifyMode: 'push' | 'bulge' | 'pinch' | 'restore';
  liquifyStrength: number;
  liquifyRadius: number;
  beautyMode: BeautyMode;
  aiMask: HTMLCanvasElement | null;
  aiMaskVersion: number;
  aiMaskPainting: boolean;
  cropDraft: CropDraft | null;
  zoom: number;
  pan: { x: number; y: number };
  set: (patch: Partial<Omit<InteractionState, 'set' | 'bumpMask' | 'resetView'>>) => void;
  bumpMask: () => void;
  resetView: () => void;
}

export const useInteractionStore = create<InteractionState>((set) => ({
  brushSize: 0.03,
  brushColor: '#f43f5e',
  brushKind: 'pen',
  brushOpacity: 1,
  mosaicStyle: 'pixel',
  mosaicBlock: 0.02,
  liquifyMode: 'push',
  liquifyStrength: 0.5,
  liquifyRadius: 0.08,
  beautyMode: 'skin',
  aiMask: null,
  aiMaskVersion: 0,
  aiMaskPainting: false,
  cropDraft: null,
  zoom: 1,
  pan: { x: 0, y: 0 },
  set: (patch) => set(patch),
  bumpMask: () => set((s) => ({ aiMaskVersion: s.aiMaskVersion + 1 })),
  resetView: () => set({ zoom: 1, pan: { x: 0, y: 0 } }),
}));
