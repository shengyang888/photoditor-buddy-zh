import type { FaceLandmarks } from './regions';

/** Where the MediaPipe WebAssembly bundle and face model are downloaded from on first use. */
export const MEDIAPIPE_WASM_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
export const FACE_LANDMARKER_MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task';

type FaceLandmarkerInstance = {
  detect: (image: ImageBitmap | HTMLCanvasElement | HTMLImageElement | ImageData) => {
    faceLandmarks: { x: number; y: number; z: number }[][];
  };
  close: () => void;
};

let landmarkerPromise: Promise<FaceLandmarkerInstance> | null = null;

/**
 * Lazily loads the MediaPipe Face Landmarker (≈3 MB model + wasm). The library is imported
 * dynamically so the editor bundle stays small for users who never open the Beauty tools.
 */
export async function loadFaceLandmarker(): Promise<FaceLandmarkerInstance> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import('@mediapipe/tasks-vision');
      const fileset = await vision.FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_URL);
      const landmarker = await vision.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: FACE_LANDMARKER_MODEL_URL, delegate: 'GPU' },
        runningMode: 'IMAGE',
        numFaces: 5,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });
      return landmarker as unknown as FaceLandmarkerInstance;
    })().catch((error: unknown) => {
      landmarkerPromise = null;
      throw new Error(
        `Could not load the face detector (${error instanceof Error ? error.message : String(error)}). Check your internet connection and try again.`,
      );
    });
  }
  return landmarkerPromise;
}

/**
 * Detects up to five faces in an image. Returns an empty array when no face is found
 * so callers can show a friendly "no face detected" message.
 */
export async function detectFaces(
  image: ImageBitmap | HTMLCanvasElement | HTMLImageElement,
): Promise<FaceLandmarks[]> {
  const landmarker = await loadFaceLandmarker();
  const result = landmarker.detect(image);
  return result.faceLandmarks.map((points) => ({ points }));
}
