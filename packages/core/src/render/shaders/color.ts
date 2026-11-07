import { GLSL_COMMON } from './common';

/**
 * The main colour-grading shader. One pass applies every "Adjust" slider, the tone curves,
 * HSL bands, colour balance, split toning, the optional 3D LUT and fade.
 * All slider uniforms arrive normalised to -1..1 (or 0..1).
 */
export const COLOR_FRAGMENT = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_curve;
uniform sampler3D u_lut;
uniform float u_lutSize;
uniform float u_lutIntensity;
uniform float u_useCurve;

uniform float u_exposure, u_brightness, u_contrast, u_highlights, u_shadows, u_whites, u_blacks;
uniform float u_temperature, u_tint, u_saturation, u_vibrance, u_hue, u_fade;
uniform float u_hslHue[8];
uniform float u_hslSat[8];
uniform float u_hslLum[8];
uniform float u_hslActive;
uniform vec3 u_cbShadows, u_cbMidtones, u_cbHighlights;
uniform float u_stHighlightHue, u_stHighlightSat, u_stShadowHue, u_stShadowSat, u_stBalance;
${GLSL_COMMON}

const float BAND_HUES[8] = float[8](0.0, 30.0, 60.0, 120.0, 180.0, 240.0, 280.0, 320.0);

float bandWeight(float hueDeg, float centre) {
  float d = abs(mod(hueDeg - centre + 180.0, 360.0) - 180.0);
  // Smooth bell that reaches zero 40 degrees away; neighbouring bands overlap softly.
  return 1.0 - smoothstep(0.0, 40.0, d);
}

vec3 applyHsl(vec3 c) {
  vec3 hsl = rgb2hsl(c);
  float hueDeg = hsl.x * 360.0;
  float hueShift = 0.0; float satMul = 0.0; float lumShift = 0.0;
  for (int i = 0; i < 8; i++) {
    float w = bandWeight(hueDeg, BAND_HUES[i]) * hsl.y; // grey pixels are unaffected
    hueShift += u_hslHue[i] * 30.0 * w;
    satMul += u_hslSat[i] * w;
    lumShift += u_hslLum[i] * w;
  }
  hsl.x = fract(hsl.x + hueShift / 360.0);
  hsl.y = clamp(hsl.y * (1.0 + satMul), 0.0, 1.0);
  hsl.z = clamp(hsl.z + lumShift * 0.25 * (lumShift > 0.0 ? (1.0 - hsl.z) : hsl.z), 0.0, 1.0);
  return hsl2rgb(hsl);
}

vec3 tintColour(float hueDeg) { return hsl2rgb(vec3(hueDeg / 360.0, 1.0, 0.5)); }

void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 c = src.rgb;

  // Exposure: +-2 stops.
  c *= pow(2.0, u_exposure * 2.0);
  // White balance.
  c.r += u_temperature * 0.12; c.b -= u_temperature * 0.12;
  c.g -= u_tint * 0.10;
  // Black and white points.
  float blackPoint = -u_blacks * 0.12;
  float whitePoint = 1.0 - u_whites * 0.12;
  c = (c - blackPoint) / max(whitePoint - blackPoint, 0.05);
  c = clamp(c, 0.0, 1.0);
  // Highlights and shadows with luminance masks.
  float l = luma(c);
  float hl = smoothstep(0.35, 1.0, l);
  float sh = 1.0 - smoothstep(0.0, 0.65, l);
  c += u_shadows * 0.45 * sh * (u_shadows > 0.0 ? (1.0 - c) : c);
  c += u_highlights * 0.45 * hl * (u_highlights > 0.0 ? (1.0 - c) : c);
  c = clamp(c, 0.0, 1.0);
  // Brightness as gamma so extremes stay put.
  c = pow(c, vec3(1.0 / (1.0 + u_brightness * 0.7)));
  // Contrast around mid grey.
  c = (c - 0.5) * (1.0 + u_contrast * 0.9) + 0.5;
  c = clamp(c, 0.0, 1.0);
  // Tone curves (per-channel tables already include the RGB master curve).
  if (u_useCurve > 0.5) {
    c = vec3(texture(u_curve, vec2(c.r, 0.5)).r, texture(u_curve, vec2(c.g, 0.5)).g, texture(u_curve, vec2(c.b, 0.5)).b);
  }
  // HSL bands.
  if (u_hslActive > 0.5) c = applyHsl(c);
  // Global hue rotation.
  if (abs(u_hue) > 1e-4) { vec3 hsl = rgb2hsl(c); hsl.x = fract(hsl.x + u_hue * 0.5); c = hsl2rgb(hsl); }
  // Saturation and vibrance (vibrance protects skin tones and already-saturated pixels).
  float lum = luma(c);
  c = mix(vec3(lum), c, 1.0 + u_saturation);
  float sat = max(max(c.r, c.g), c.b) - min(min(c.r, c.g), c.b);
  vec3 hslv = rgb2hsl(c);
  float skin = bandWeight(hslv.x * 360.0, 25.0);
  float vib = u_vibrance * (1.0 - sat) * (1.0 - 0.6 * skin);
  c = mix(vec3(luma(c)), c, 1.0 + vib * 1.2);
  c = clamp(c, 0.0, 1.0);
  // Colour balance per tonal range.
  float l2 = luma(c);
  float wS = 1.0 - smoothstep(0.0, 0.5, l2);
  float wH = smoothstep(0.5, 1.0, l2);
  float wM = 1.0 - wS - wH;
  c += (u_cbShadows * wS + u_cbMidtones * wM + u_cbHighlights * wH) * 0.15;
  c = clamp(c, 0.0, 1.0);
  // Split toning.
  if (u_stHighlightSat > 1e-4 || u_stShadowSat > 1e-4) {
    float l3 = luma(c);
    float bal = u_stBalance * 0.5;
    float hw = smoothstep(0.5 - bal, 1.0, l3);
    float sw = 1.0 - smoothstep(0.0, 0.5 - bal, l3);
    c += (tintColour(u_stHighlightHue) - 0.5) * u_stHighlightSat * hw * 0.5;
    c += (tintColour(u_stShadowHue) - 0.5) * u_stShadowSat * sw * 0.5;
    c = clamp(c, 0.0, 1.0);
  }
  // 3D LUT (trilinear). Sample at texel centres to avoid edge bleeding.
  if (u_lutIntensity > 1e-4) {
    vec3 scale = vec3((u_lutSize - 1.0) / u_lutSize);
    vec3 offset = vec3(1.0 / (2.0 * u_lutSize));
    vec3 graded = texture(u_lut, c * scale + offset).rgb;
    c = mix(c, graded, u_lutIntensity);
  }
  // Fade / matte: lift blacks and soften whites.
  c = mix(c, c * 0.72 + 0.16, u_fade);
  fragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;
