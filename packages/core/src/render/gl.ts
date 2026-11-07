/**
 * Small WebGL2 helper layer. Keeps the renderer readable by hiding boilerplate:
 * context creation, shader compilation, textures and framebuffers.
 */

/** Any source `texImage2D` accepts in browsers we target. */
export type TextureSource =
  ImageBitmap | HTMLCanvasElement | HTMLImageElement | OffscreenCanvas | ImageData;

/** A texture together with its framebuffer so passes can render into it. */
export interface RenderTarget {
  texture: WebGLTexture;
  framebuffer: WebGLFramebuffer;
  width: number;
  height: number;
}

/** Creates a WebGL2 context or throws a clear error when the browser cannot provide one. */
export function createGl(canvas: HTMLCanvasElement | OffscreenCanvas): WebGL2RenderingContext {
  const gl = canvas.getContext('webgl2', {
    premultipliedAlpha: false,
    preserveDrawingBuffer: true,
    antialias: false,
    alpha: true,
    powerPreference: 'high-performance',
  }) as WebGL2RenderingContext | null;
  if (!gl) {
    throw new Error(
      'WebGL2 is not available. Please update your browser or enable hardware acceleration.',
    );
  }
  // A canvas whose context was released earlier (React StrictMode remounts, hot reload) hands back
  // the same lost context; restore it so rendering works again.
  if (gl.isContextLost()) gl.getExtension('WEBGL_lose_context')?.restoreContext();
  return gl;
}

/** Compiles one shader stage and reports the compiler log on failure. */
function compileShader(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader.');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader) ?? 'unknown error';
    gl.deleteShader(shader);
    throw new Error(`Shader compile error: ${log}`);
  }
  return shader;
}

/** Links a vertex + fragment shader pair into a program. */
export function createProgram(
  gl: WebGL2RenderingContext,
  vertexSource: string,
  fragmentSource: string,
): WebGLProgram {
  const program = gl.createProgram();
  if (!program) throw new Error('Could not create program.');
  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(program) ?? 'unknown error';
    gl.deleteProgram(program);
    throw new Error(`Program link error: ${log}`);
  }
  return program;
}

/** Creates an empty RGBA8 texture with linear filtering and clamped edges. */
export function createTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  nearest = false,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create texture.');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, nearest ? gl.NEAREST : gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
  return texture;
}

/** Uploads an image-like source into an existing texture (replacing its contents and size). */
export function uploadTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  source: TextureSource,
  flipY = true,
): void {
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, flipY);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, source);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
}

/** Creates a render target (texture + framebuffer) of the given size. */
export function createRenderTarget(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
): RenderTarget {
  const texture = createTexture(gl, width, height);
  const framebuffer = gl.createFramebuffer();
  if (!framebuffer) throw new Error('Could not create framebuffer.');
  gl.bindFramebuffer(gl.FRAMEBUFFER, framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);
  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  if (status !== gl.FRAMEBUFFER_COMPLETE) throw new Error('Framebuffer is incomplete.');
  return { texture, framebuffer, width, height };
}

/** Frees a render target's GPU resources. */
export function deleteRenderTarget(gl: WebGL2RenderingContext, target: RenderTarget): void {
  gl.deleteTexture(target.texture);
  gl.deleteFramebuffer(target.framebuffer);
}

/**
 * Uploads a 3D LUT as a `TEXTURE_3D` (RGB float data, linear filtering).
 * Trilinear sampling in the shader then gives smooth colour grading.
 */
export function createLut3dTexture(
  gl: WebGL2RenderingContext,
  size: number,
  data: Float32Array,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create LUT texture.');
  gl.bindTexture(gl.TEXTURE_3D, texture);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE);
  // RGB8 keeps memory small; LUT precision of 8 bits per channel is standard for .cube previews.
  const bytes = new Uint8Array(size * size * size * 3);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = Math.round(Math.min(1, Math.max(0, data[i] ?? 0)) * 255);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RGB8, size, size, size, 0, gl.RGB, gl.UNSIGNED_BYTE, bytes);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  return texture;
}

/** Uploads a 256×1 RGBA8 table (one curve per channel) used for tone curves. */
export function createCurveTexture(gl: WebGL2RenderingContext): WebGLTexture {
  const texture = createTexture(gl, 256, 1);
  return texture;
}

/** Writes four 256-entry tables into the curve texture: R, G, B channel curves and a spare in A. */
export function updateCurveTexture(
  gl: WebGL2RenderingContext,
  texture: WebGLTexture,
  r: Uint8Array,
  g: Uint8Array,
  b: Uint8Array,
): void {
  const pixels = new Uint8Array(256 * 4);
  for (let i = 0; i < 256; i++) {
    pixels[i * 4] = r[i]!;
    pixels[i * 4 + 1] = g[i]!;
    pixels[i * 4 + 2] = b[i]!;
    pixels[i * 4 + 3] = 255;
  }
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, 256, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
}

/** Uploads a two-channel float displacement field (uv offsets) as an RG16F texture. */
export function createDisplacementTexture(
  gl: WebGL2RenderingContext,
  width: number,
  height: number,
  data: Float32Array,
): WebGLTexture {
  const texture = gl.createTexture();
  if (!texture) throw new Error('Could not create displacement texture.');
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RG16F, width, height, 0, gl.RG, gl.FLOAT, data);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 4);
  return texture;
}

/** Draws a full-screen triangle. The vertex shader derives positions from `gl_VertexID`. */
export function drawFullscreen(gl: WebGL2RenderingContext): void {
  gl.drawArrays(gl.TRIANGLES, 0, 3);
}

/** Binds a texture to a texture unit and points the sampler uniform at it. */
export function bindTextureUnit(
  gl: WebGL2RenderingContext,
  program: WebGLProgram,
  name: string,
  texture: WebGLTexture,
  unit: number,
  target: number = gl.TEXTURE_2D,
): void {
  gl.activeTexture(gl.TEXTURE0 + unit);
  gl.bindTexture(target, texture);
  gl.uniform1i(gl.getUniformLocation(program, name), unit);
}
