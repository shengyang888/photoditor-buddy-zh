import type {
  Adjustments,
  EffectSettings,
  FaceLandmarks,
  Lut3D,
  OverlayLayer,
  PortraitSettings,
} from '@photoditor-buddy/core';
import type { AiSettings } from '@photoditor-buddy/ai';
import type { EmbedConfig } from '@photoditor-buddy/sdk';

/** Tools shown in the tool rail / dock. */
export type ToolId =
  | 'adjust'
  | 'filters'
  | 'crop'
  | 'effects'
  | 'beauty'
  | 'ai'
  | 'text'
  | 'stickers'
  | 'frames'
  | 'doodle'
  | 'mosaic'
  | 'watermark'
  | 'layers';

/** Top-level screens. */
export type Screen = 'home' | 'editor' | 'collage' | 'batch';

/** The image being edited: full resolution for export plus a capped preview for the screen. */
export interface SourceImage {
  full: HTMLCanvasElement;
  preview: HTMLCanvasElement;
  fileName: string;
  mimeType: string;
}

/** Active filter reference and its strength (0..100). */
export interface ActiveFilter {
  id: string;
  intensity: number;
}

/** One undoable editor state. Treated as immutable: create a new object for every change. */
export interface EditSnapshot {
  source: SourceImage;
  adjustments: Adjustments;
  filter: ActiveFilter | null;
  effect: EffectSettings | null;
  overlays: OverlayLayer[];
  portrait: PortraitSettings;
  /** A user-imported .cube LUT (applied when `adjustments.lut.id === 'user'`). */
  userLut: Lut3D | null;
}

export interface Toast {
  id: number;
  kind: 'info' | 'success' | 'error';
  message: string;
}

export interface BusyState {
  message: string;
  progress?: number;
  /** Cancels the running operation when provided. */
  cancel?: () => void;
}

export type FacesStatus = 'idle' | 'loading' | 'ready' | 'none' | 'error';

/** Everything the editor needs; see `editorStore.ts` for the actions. */
export interface EditorData {
  screen: Screen;
  activeTool: ToolId | null;
  snapshot: EditSnapshot | null;
  canUndo: boolean;
  canRedo: boolean;
  selectedLayerId: string | null;
  faces: FaceLandmarks[] | null;
  facesStatus: FacesStatus;
  compare: boolean;
  busy: BusyState | null;
  toasts: Toast[];
  aiSettings: AiSettings;
  embed: EmbedConfig | null;
  settingsOpen: boolean;
  exportHandler:
    | ((result: {
        blob: Blob;
        fileName: string;
        width: number;
        height: number;
      }) => Promise<boolean> | boolean)
    | null;
  lookTemplate: Pick<EditSnapshot, 'adjustments' | 'filter' | 'effect'> | null;
}
