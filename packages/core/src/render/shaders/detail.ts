import { GLSL_COMMON } from './common';

/**
 * Detail pass: sharpen (unsharp mask), clarity and structure (local contrast at two scales),
 * dehaze (dark-channel estimate from the large blur) and denoise (edge-aware blend).
 * Requires the original plus two blurred copies (small ≈ 1.5px, large ≈ 3% of width).
 */
export const DETAIL_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_blurSmall;
uniform sampler2D u_blurLarge;
uniform float u_sharpen, u_clarity, u_structure, u_dehaze, u_denoise;
${GLSL_COMMON}
void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 c = src.rgb;
  vec3 small = texture(u_blurSmall, v_uv).rgb;
  vec3 large = texture(u_blurLarge, v_uv).rgb;

  // Denoise: move towards the small blur where the local difference is tiny (flat areas).
  if (u_denoise > 0.0) {
    float diff = length(c - small);
    float flatness = 1.0 - smoothstep(0.0, 0.08 + 0.12 * u_denoise, diff);
    c = mix(c, small, flatness * u_denoise);
  }
  // Sharpen: unsharp mask with the small blur.
  c += (c - small) * u_sharpen * 2.0;
  // Structure: fine local contrast (small blur) weighted towards midtones.
  float lm = luma(c);
  float mid = 1.0 - abs(lm * 2.0 - 1.0);
  c += (c - small) * u_structure * 1.5 * mid;
  // Clarity: coarse local contrast (large blur), midtone weighted, softens when negative.
  c += (c - large) * u_clarity * 1.2 * (0.4 + 0.6 * mid);
  // Dehaze: subtract an estimate of the veil (min channel of the large blur).
  if (abs(u_dehaze) > 1e-4) {
    float veil = min(min(large.r, large.g), large.b);
    if (u_dehaze > 0.0) {
      float k = u_dehaze * 0.6 * veil;
      c = (c - k) / max(1.0 - k, 0.2);
      c = (c - 0.5) * (1.0 + u_dehaze * 0.25) + 0.5;
    } else {
      c = mix(c, vec3(0.78), -u_dehaze * 0.35);
    }
  }
  fragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;
