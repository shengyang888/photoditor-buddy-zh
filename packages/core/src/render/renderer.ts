import { HSL_BANDS } from '../adjustments/defaults';
import { buildCurveTable, isIdentityCurve } from '../adjustments/curves';
import type { Adjustments } from '../adjustments/types';
import { EFFECT_IDS } from './shaders/effects';
import { findEffect } from '../effects/catalog';
import type { Lut3D } from '../lut/cube';
import {
  bindTextureUnit,
  createCurveTexture,
  createDisplacementTexture,
  createGl,
  createLut3dTexture,
  createProgram,
  createRenderTarget,
  createTexture,
  deleteRenderTarget,
  drawFullscreen,
  uploadTexture,
  updateCurveTexture,
  type RenderTarget,
  type TextureSource,
} from './gl';
import { BLUR_FRAGMENT } from './shaders/blur';
import { COLOR_FRAGMENT } from './shaders/color';
import { COPY_FRAGMENT, VERTEX_SHADER } from './shaders/common';
import { DETAIL_FRAGMENT } from './shaders/detail';
import { EFFECTS_FRAGMENT } from './shaders/effects';
import { SKIN_FRAGMENT, WARP_FRAGMENT } from './shaders/portrait';
import type { RenderState } from './types';

/** Effects whose shader reads the pre-blurred texture. */
const BLUR_EFFECTS = new Set<string>(['blur', 'bloom', 'glow', 'vignetteBlur']);

/**
 * GPU renderer for a single image. Feed it a source (`setSource`) and a `RenderState`
 * (`render`) and it draws the fully processed image onto its canvas.
 *
 * Pass order: warp → skin/makeup → detail → colour → effects → present.
 * The same class is used for the on-screen preview and, at full resolution, for export.
 */
export class Renderer {
  readonly gl: WebGL2RenderingContext;
  readonly canvas: HTMLCanvasElement | OffscreenCanvas;
  readonly maxTextureSize: number;

  private programs: Record<
    'copy' | 'color' | 'blur' | 'detail' | 'effects' | 'warp' | 'skin',
    WebGLProgram
  >;
  private sourceTexture: WebGLTexture;
  private width = 0;
  private height = 0;
  private targets: RenderTarget[] = [];
  private halfTargets: RenderTarget[] = [];
  private curveTexture: WebGLTexture;
  private identityLut: WebGLTexture;
  private lutCache = new WeakMap<Lut3D, WebGLTexture>();
  private maskTexture: WebGLTexture;
  private makeupTexture: WebGLTexture;
  private displacementTexture: WebGLTexture | null = null;
  private maskVersion = -1;
  private makeupVersion = -1;
  private displacementVersion = -1;
  private curveKey = '';
  private disposed = false;

  constructor(canvas: HTMLCanvasElement | OffscreenCanvas) {
    this.canvas = canvas;
    const gl = createGl(canvas);
    this.gl = gl;
    this.maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) as number;
    this.programs = {
      copy: createProgram(gl, VERTEX_SHADER, COPY_FRAGMENT),
      color: createProgram(gl, VERTEX_SHADER, COLOR_FRAGMENT),
      blur: createProgram(gl, VERTEX_SHADER, BLUR_FRAGMENT),
      detail: createProgram(gl, VERTEX_SHADER, DETAIL_FRAGMENT),
      effects: createProgram(gl, VERTEX_SHADER, EFFECTS_FRAGMENT),
      warp: createProgram(gl, VERTEX_SHADER, WARP_FRAGMENT),
      skin: createProgram(gl, VERTEX_SHADER, SKIN_FRAGMENT),
    };
    this.sourceTexture = createTexture(gl, 1, 1);
    this.maskTexture = createTexture(gl, 1, 1);
    this.makeupTexture = createTexture(gl, 1, 1);
    this.curveTexture = createCurveTexture(gl);
    this.identityLut = createLut3dTexture(
      gl,
      2,
      new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 1, 1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1]),
    );
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
  }

  /** Current source size in pixels. */
  get size(): { width: number; height: number } {
    return { width: this.width, height: this.height };
  }

  /**
   * Uploads a new source image. The canvas is resized to match. Sources larger than the GPU
   * limit must be downscaled by the caller (see `fitWithin`).
   */
  setSource(source: TextureSource): void {
    this.assertAlive();
    const { gl } = this;
    const width = source.width;
    const height = source.height;
    if (width > this.maxTextureSize || height > this.maxTextureSize) {
      throw new Error(`Image is larger than this device supports (${this.maxTextureSize}px).`);
    }
    uploadTexture(gl, this.sourceTexture, source, true);
    if (width !== this.width || height !== this.height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width;
      this.canvas.height = height;
      this.allocateTargets();
    }
  }

  /** Renders `state` into the canvas. Safe to call on every animation frame. */
  render(state: RenderState): void {
    this.assertAlive();
    if (this.width === 0) return;
    const { gl } = this;
    gl.viewport(0, 0, this.width, this.height);
    let current = this.sourceTexture;
    let ping = 0;
    const next = (): RenderTarget => {
      const target = this.targets[ping % 2]!;
      ping++;
      return target;
    };

    // 1. Warp (reshape + liquify).
    const portrait = state.portrait;
    if (portrait?.displacement) {
      this.syncDisplacement(portrait.displacement, portrait.displacementVersion);
      const out = next();
      this.begin(this.programs.warp, out);
      bindTextureUnit(gl, this.programs.warp, 'u_image', current, 0);
      bindTextureUnit(gl, this.programs.warp, 'u_displacement', this.displacementTexture!, 1);
      drawFullscreen(gl);
      current = out.texture;
    }

    // 2. Skin, teeth, eyes and makeup.
    if (portrait && (portrait.mask || portrait.makeup)) {
      if (portrait.mask)
        this.syncTexture(this.maskTexture, portrait.mask, portrait.maskVersion, 'mask');
      if (portrait.makeup)
        this.syncTexture(this.makeupTexture, portrait.makeup, portrait.makeupVersion, 'makeup');
      const out = next();
      const p = this.programs.skin;
      this.begin(p, out);
      bindTextureUnit(gl, p, 'u_image', current, 0);
      bindTextureUnit(gl, p, 'u_mask', this.maskTexture, 1);
      bindTextureUnit(gl, p, 'u_makeup', this.makeupTexture, 2);
      gl.uniform2f(this.loc(p, 'u_size'), this.width, this.height);
      gl.uniform1f(this.loc(p, 'u_smooth'), portrait.smooth);
      gl.uniform1f(this.loc(p, 'u_whiten'), portrait.whiten);
      gl.uniform1f(this.loc(p, 'u_teeth'), portrait.teeth);
      gl.uniform1f(this.loc(p, 'u_eyes'), portrait.eyes);
      gl.uniform1f(this.loc(p, 'u_blemish'), portrait.blemish);
      gl.uniform1f(this.loc(p, 'u_useMask'), portrait.mask ? 1 : 0);
      gl.uniform1f(this.loc(p, 'u_useMakeup'), portrait.makeup ? 1 : 0);
      drawFullscreen(gl);
      current = out.texture;
    }

    // 3. Detail (sharpen, clarity, structure, dehaze, denoise).
    const a = state.adjustments;
    if (a.sharpen || a.clarity || a.structure || a.dehaze || a.denoise) {
      const small = this.blur(current, 1.5, false);
      const large = this.blur(current, Math.max(3, this.width * 0.025), true);
      const out = next();
      const p = this.programs.detail;
      this.begin(p, out);
      bindTextureUnit(gl, p, 'u_image', current, 0);
      bindTextureUnit(gl, p, 'u_blurSmall', small.texture, 1);
      bindTextureUnit(gl, p, 'u_blurLarge', large.texture, 2);
      gl.uniform1f(this.loc(p, 'u_sharpen'), a.sharpen / 100);
      gl.uniform1f(this.loc(p, 'u_clarity'), a.clarity / 100);
      gl.uniform1f(this.loc(p, 'u_structure'), a.structure / 100);
      gl.uniform1f(this.loc(p, 'u_dehaze'), a.dehaze / 100);
      gl.uniform1f(this.loc(p, 'u_denoise'), a.denoise / 100);
      drawFullscreen(gl);
      current = out.texture;
    }

    // 4. Colour grading.
    {
      const out = next();
      this.runColorPass(current, out, a, state.lut);
      current = out.texture;
    }

    // 5. Effects, grain and vignette.
    {
      const effect = state.effect;
      const def = effect ? findEffect(effect.id) : undefined;
      let blurTex = current;
      if (effect && def && BLUR_EFFECTS.has(effect.id)) {
        const radius =
          effect.id === 'blur' ? 2 + (effect.amount / 100) * this.width * 0.03 : this.width * 0.02;
        blurTex = this.blur(current, radius, true).texture;
      }
      const out = next();
      const p = this.programs.effects;
      this.begin(p, out);
      bindTextureUnit(gl, p, 'u_image', current, 0);
      bindTextureUnit(gl, p, 'u_blur', blurTex, 1);
      gl.uniform2f(this.loc(p, 'u_size'), this.width, this.height);
      gl.uniform1f(this.loc(p, 'u_grain'), a.grain / 100);
      gl.uniform1f(this.loc(p, 'u_grainSize'), a.grainSize / 100);
      gl.uniform1f(this.loc(p, 'u_vignette'), a.vignette / 100);
      gl.uniform1f(this.loc(p, 'u_vignetteFeather'), a.vignetteFeather / 100);
      gl.uniform1i(this.loc(p, 'u_effect'), effect && def ? EFFECT_IDS[effect.id] : 0);
      gl.uniform1f(this.loc(p, 'u_amount'), effect ? effect.amount / 100 : 0);
      gl.uniform1f(this.loc(p, 'u_param'), effect ? effect.param / 100 : 0);
      gl.uniform2f(this.loc(p, 'u_center'), effect?.centerX ?? 0.5, 1 - (effect?.centerY ?? 0.5));
      gl.uniform1f(this.loc(p, 'u_angle'), ((effect?.angle ?? 0) * Math.PI) / 180);
      gl.uniform1i(
        this.loc(p, 'u_shape'),
        effect ? (effect.shape === 'radial' ? 1 : effect.shape === 'linear' ? 2 : 0) : 0,
      );
      gl.uniform1f(this.loc(p, 'u_seed'), 7.31);
      drawFullscreen(gl);
      current = out.texture;
    }

    // 6. Present. Sources are uploaded bottom-up (UNPACK_FLIP_Y) and the default framebuffer is
    //    bottom-up too, so the image is already upright: no flip.
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.width, this.height);
    gl.useProgram(this.programs.copy);
    bindTextureUnit(gl, this.programs.copy, 'u_image', current, 0);
    gl.uniform1f(this.loc(this.programs.copy, 'u_flip'), 0);
    drawFullscreen(gl);
  }

  /** Copies the last rendered frame into a fresh Canvas 2D element (for overlay compositing/export). */
  snapshot(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    canvas.width = this.width;
    canvas.height = this.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D is not available.');
    ctx.drawImage(this.canvas as CanvasImageSource, 0, 0);
    return canvas;
  }

  /**
   * Releases all GPU resources. The instance cannot be used afterwards.
   * `releaseContext` (default true) also drops the WebGL context so short-lived renderers
   * (export, thumbnails) free GPU memory immediately; pass false for a canvas that stays on screen.
   */
  dispose(releaseContext = true): void {
    if (this.disposed) return;
    const { gl } = this;
    for (const t of [...this.targets, ...this.halfTargets]) deleteRenderTarget(gl, t);
    for (const p of Object.values(this.programs)) gl.deleteProgram(p);
    gl.deleteTexture(this.sourceTexture);
    gl.deleteTexture(this.maskTexture);
    gl.deleteTexture(this.makeupTexture);
    gl.deleteTexture(this.curveTexture);
    gl.deleteTexture(this.identityLut);
    if (this.displacementTexture) gl.deleteTexture(this.displacementTexture);
    if (releaseContext) gl.getExtension('WEBGL_lose_context')?.loseContext();
    this.disposed = true;
  }

  // ---------------------------------------------------------------- internals

  private assertAlive(): void {
    if (this.disposed) throw new Error('Renderer has been disposed.');
  }

  private loc(program: WebGLProgram, name: string): WebGLUniformLocation | null {
    return this.gl.getUniformLocation(program, name);
  }

  private begin(program: WebGLProgram, target: RenderTarget): void {
    const { gl } = this;
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
    gl.viewport(0, 0, target.width, target.height);
    gl.useProgram(program);
  }

  private allocateTargets(): void {
    const { gl } = this;
    for (const t of [...this.targets, ...this.halfTargets]) deleteRenderTarget(gl, t);
    this.targets = [0, 1, 2, 3].map(() => createRenderTarget(gl, this.width, this.height));
    const hw = Math.max(1, Math.round(this.width / 2));
    const hh = Math.max(1, Math.round(this.height / 2));
    this.halfTargets = [0, 1].map(() => createRenderTarget(gl, hw, hh));
  }

  /**
   * Gaussian blur of `texture` with the given radius (pixels at full resolution).
   * Large radii run at half resolution (`half = true`) which is visually identical for blur and far cheaper.
   */
  private blur(texture: WebGLTexture, radius: number, half: boolean): RenderTarget {
    const { gl } = this;
    const pool = half ? this.halfTargets : [this.targets[2]!, this.targets[3]!];
    const scale = half ? 0.5 : 1;
    const [tmp, out] = [pool[0]!, pool[1]!];
    const p = this.programs.blur;
    this.begin(p, tmp);
    bindTextureUnit(gl, p, 'u_image', texture, 0);
    gl.uniform2f(this.loc(p, 'u_direction'), 1 / tmp.width, 0);
    gl.uniform1f(this.loc(p, 'u_radius'), radius * scale);
    drawFullscreen(gl);
    this.begin(p, out);
    bindTextureUnit(gl, p, 'u_image', tmp.texture, 0);
    gl.uniform2f(this.loc(p, 'u_direction'), 0, 1 / out.height);
    gl.uniform1f(this.loc(p, 'u_radius'), radius * scale);
    drawFullscreen(gl);
    return out;
  }

  private runColorPass(
    input: WebGLTexture,
    out: RenderTarget,
    a: Adjustments,
    lut: Lut3D | null,
  ): void {
    const { gl } = this;
    const p = this.programs.color;
    this.begin(p, out);
    bindTextureUnit(gl, p, 'u_image', input, 0);
    // Curves: rebuild the 256-entry tables only when the curve points change.
    const useCurve = !(
      isIdentityCurve(a.curves.rgb) &&
      isIdentityCurve(a.curves.red) &&
      isIdentityCurve(a.curves.green) &&
      isIdentityCurve(a.curves.blue)
    );
    if (useCurve) {
      const key = JSON.stringify(a.curves);
      if (key !== this.curveKey) {
        const master = buildCurveTable(a.curves.rgb);
        const compose = (points: typeof a.curves.red): Uint8Array => {
          const table = buildCurveTable(points);
          const outTable = new Uint8Array(256);
          for (let i = 0; i < 256; i++) outTable[i] = table[master[i]!]!;
          return outTable;
        };
        updateCurveTexture(
          gl,
          this.curveTexture,
          compose(a.curves.red),
          compose(a.curves.green),
          compose(a.curves.blue),
        );
        this.curveKey = key;
      }
    }
    bindTextureUnit(gl, p, 'u_curve', this.curveTexture, 1);
    gl.uniform1f(this.loc(p, 'u_useCurve'), useCurve ? 1 : 0);
    // LUT.
    const lutTexture = lut ? this.lutTexture(lut) : this.identityLut;
    bindTextureUnit(gl, p, 'u_lut', lutTexture, 2, gl.TEXTURE_3D);
    gl.uniform1f(this.loc(p, 'u_lutSize'), lut ? lut.size : 2);
    gl.uniform1f(this.loc(p, 'u_lutIntensity'), lut ? a.lut.intensity / 100 : 0);
    // Scalars.
    const n = (v: number): number => v / 100;
    gl.uniform1f(this.loc(p, 'u_exposure'), n(a.exposure));
    gl.uniform1f(this.loc(p, 'u_brightness'), n(a.brightness));
    gl.uniform1f(this.loc(p, 'u_contrast'), n(a.contrast));
    gl.uniform1f(this.loc(p, 'u_highlights'), n(a.highlights));
    gl.uniform1f(this.loc(p, 'u_shadows'), n(a.shadows));
    gl.uniform1f(this.loc(p, 'u_whites'), n(a.whites));
    gl.uniform1f(this.loc(p, 'u_blacks'), n(a.blacks));
    gl.uniform1f(this.loc(p, 'u_temperature'), n(a.temperature));
    gl.uniform1f(this.loc(p, 'u_tint'), n(a.tint));
    gl.uniform1f(this.loc(p, 'u_saturation'), n(a.saturation));
    gl.uniform1f(this.loc(p, 'u_vibrance'), n(a.vibrance));
    gl.uniform1f(this.loc(p, 'u_hue'), n(a.hue));
    gl.uniform1f(this.loc(p, 'u_fade'), n(a.fade));
    // HSL bands.
    const hues = HSL_BANDS.map((b) => n(a.hsl[b].hue));
    const sats = HSL_BANDS.map((b) => n(a.hsl[b].saturation));
    const lums = HSL_BANDS.map((b) => n(a.hsl[b].luminance));
    const hslActive = [...hues, ...sats, ...lums].some((v) => v !== 0);
    gl.uniform1fv(this.loc(p, 'u_hslHue'), hues);
    gl.uniform1fv(this.loc(p, 'u_hslSat'), sats);
    gl.uniform1fv(this.loc(p, 'u_hslLum'), lums);
    gl.uniform1f(this.loc(p, 'u_hslActive'), hslActive ? 1 : 0);
    // Colour balance.
    const cb = a.colorBalance;
    gl.uniform3f(this.loc(p, 'u_cbShadows'), n(cb.shadows[0]), n(cb.shadows[1]), n(cb.shadows[2]));
    gl.uniform3f(
      this.loc(p, 'u_cbMidtones'),
      n(cb.midtones[0]),
      n(cb.midtones[1]),
      n(cb.midtones[2]),
    );
    gl.uniform3f(
      this.loc(p, 'u_cbHighlights'),
      n(cb.highlights[0]),
      n(cb.highlights[1]),
      n(cb.highlights[2]),
    );
    // Split toning.
    const st = a.splitToning;
    gl.uniform1f(this.loc(p, 'u_stHighlightHue'), st.highlightHue);
    gl.uniform1f(this.loc(p, 'u_stHighlightSat'), n(st.highlightSaturation));
    gl.uniform1f(this.loc(p, 'u_stShadowHue'), st.shadowHue);
    gl.uniform1f(this.loc(p, 'u_stShadowSat'), n(st.shadowSaturation));
    gl.uniform1f(this.loc(p, 'u_stBalance'), n(st.balance));
    drawFullscreen(gl);
  }

  private lutTexture(lut: Lut3D): WebGLTexture {
    let texture = this.lutCache.get(lut);
    if (!texture) {
      texture = createLut3dTexture(this.gl, lut.size, lut.data);
      this.lutCache.set(lut, texture);
    }
    return texture;
  }

  private syncTexture(
    texture: WebGLTexture,
    source: TextureSource,
    version: number,
    kind: 'mask' | 'makeup',
  ): void {
    const current = kind === 'mask' ? this.maskVersion : this.makeupVersion;
    if (current === version) return;
    uploadTexture(this.gl, texture, source, true);
    if (kind === 'mask') this.maskVersion = version;
    else this.makeupVersion = version;
  }

  private syncDisplacement(
    field: { width: number; height: number; data: Float32Array },
    version: number,
  ): void {
    if (this.displacementTexture && this.displacementVersion === version) return;
    if (this.displacementTexture) this.gl.deleteTexture(this.displacementTexture);
    // Displacement fields are authored top-down (image space) while textures are sampled bottom-up
    // after the source flip, so flip rows and negate the vertical component.
    const flipped = new Float32Array(field.data.length);
    const rowLen = field.width * 2;
    for (let y = 0; y < field.height; y++) {
      const src = (field.height - 1 - y) * rowLen;
      const dst = y * rowLen;
      for (let x = 0; x < rowLen; x += 2) {
        flipped[dst + x] = field.data[src + x]!;
        flipped[dst + x + 1] = -field.data[src + x + 1]!;
      }
    }
    this.displacementTexture = createDisplacementTexture(
      this.gl,
      field.width,
      field.height,
      flipped,
    );
    this.displacementVersion = version;
  }
}
