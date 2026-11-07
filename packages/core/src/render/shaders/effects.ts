import { GLSL_COMMON } from './common';

/** Numeric ids for creative effects. Kept in sync with `EFFECT_DEFINITIONS` in effects/catalog.ts. */
export const EFFECT_IDS = {
  none: 0,
  blur: 1,
  pixelate: 2,
  rgbSplit: 3,
  glitch: 4,
  halftone: 5,
  bloom: 6,
  posterize: 7,
  solarize: 8,
  threshold: 9,
  emboss: 10,
  sketch: 11,
  kaleidoscope: 12,
  swirl: 13,
  fisheye: 14,
  chromatic: 15,
  vhs: 16,
  mirror: 17,
  invert: 18,
  oilPaint: 19,
  crossHatch: 20,
  dotScreen: 21,
  glow: 22,
  vignetteBlur: 23,
  frostedGlass: 24,
} as const;

/**
 * Final look pass: grain + vignette from the Adjust panel, then one optional creative effect.
 * `u_blur` holds a large Gaussian blur of the image for effects that need it (blur, bloom, glow, tilt-shift).
 */
export const EFFECTS_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_blur;
uniform vec2 u_size;          // texture size in pixels
uniform float u_grain, u_grainSize, u_vignette, u_vignetteFeather;
uniform int u_effect;
uniform float u_amount;       // 0..1 main strength
uniform float u_param;        // 0..1 secondary parameter
uniform vec2 u_center;        // 0..1 focus centre for blur/swirl/fisheye
uniform float u_angle;        // radians, for linear blur band
uniform int u_shape;          // blur shape: 0 whole, 1 radial, 2 linear
uniform float u_seed;
${GLSL_COMMON}

vec3 sampleAt(vec2 uv) { return texture(u_image, clamp(uv, 0.0, 1.0)).rgb; }

float focusMask(vec2 uv) {
  // Returns 1 where the image should be blurred.
  vec2 aspect = vec2(u_size.x / u_size.y, 1.0);
  if (u_shape == 1) {
    float d = distance(uv * aspect, u_center * aspect);
    float r = 0.15 + u_param * 0.5;
    return smoothstep(r, r + 0.15 + u_param * 0.2, d);
  }
  if (u_shape == 2) {
    vec2 dir = vec2(cos(u_angle), sin(u_angle));
    float d = abs(dot((uv - u_center) * aspect, dir));
    float r = 0.08 + u_param * 0.35;
    return smoothstep(r, r + 0.12 + u_param * 0.15, d);
  }
  return 1.0;
}

void main() {
  vec2 uv = v_uv;
  vec3 c = sampleAt(uv);
  vec2 px = 1.0 / u_size;
  vec2 aspect = vec2(u_size.x / u_size.y, 1.0);

  if (u_effect == 1) { // blur (whole / radial / linear) using pre-blurred texture
    vec3 blurred = texture(u_blur, uv).rgb;
    c = mix(c, blurred, focusMask(uv) * u_amount);
  } else if (u_effect == 2) { // pixelate
    float block = max(2.0, floor(u_amount * 60.0 + 2.0));
    vec2 b = floor(uv * u_size / block) * block + block * 0.5;
    c = sampleAt(b / u_size);
  } else if (u_effect == 3) { // rgb split
    vec2 off = vec2(u_amount * 0.03, 0.0);
    c = vec3(sampleAt(uv + off).r, c.g, sampleAt(uv - off).b);
  } else if (u_effect == 4) { // glitch
    float row = floor(uv.y * (8.0 + u_param * 40.0));
    float n = hash21(vec2(row, u_seed));
    float shift = (n - 0.5) * u_amount * 0.15 * step(0.6, hash21(vec2(row * 3.1, u_seed + 1.0)));
    vec2 guv = vec2(uv.x + shift, uv.y);
    c = vec3(sampleAt(guv + vec2(u_amount * 0.01, 0.0)).r, sampleAt(guv).g, sampleAt(guv - vec2(u_amount * 0.01, 0.0)).b);
  } else if (u_effect == 5) { // halftone
    float cell = 4.0 + (1.0 - u_param) * 16.0;
    vec2 p = uv * u_size;
    float ang = 0.785398;
    mat2 rot = mat2(cos(ang), -sin(ang), sin(ang), cos(ang));
    vec2 q = rot * p;
    vec2 cellCenter = (floor(q / cell) + 0.5) * cell;
    vec2 back = transpose(rot) * cellCenter;
    float l = luma(sampleAt(back / u_size));
    float r = (1.0 - l) * cell * 0.7;
    float d = distance(q, cellCenter);
    float dot_ = 1.0 - smoothstep(r - 0.8, r + 0.8, d);
    vec3 ht = vec3(1.0 - dot_);
    c = mix(c, ht, u_amount);
  } else if (u_effect == 6) { // bloom
    vec3 b = texture(u_blur, uv).rgb;
    vec3 bright = max(b - (0.6 - u_param * 0.4), 0.0);
    c += bright * u_amount * 1.5;
  } else if (u_effect == 7) { // posterize
    float levels = 2.0 + (1.0 - u_amount) * 14.0;
    c = floor(c * levels + 0.5) / levels;
  } else if (u_effect == 8) { // solarize
    float t = 1.0 - u_amount * 0.7;
    c = mix(c, 1.0 - c, step(t, c));
  } else if (u_effect == 9) { // threshold
    float l = luma(c);
    c = mix(c, vec3(step(u_param, l)), u_amount);
  } else if (u_effect == 10) { // emboss
    vec3 a = sampleAt(uv - px * 1.5);
    vec3 b = sampleAt(uv + px * 1.5);
    float e = luma(b) - luma(a);
    c = mix(c, vec3(0.5 + e * 3.0), u_amount);
  } else if (u_effect == 11) { // sketch (inverted edges)
    float gx = luma(sampleAt(uv + vec2(px.x, 0.0))) - luma(sampleAt(uv - vec2(px.x, 0.0)));
    float gy = luma(sampleAt(uv + vec2(0.0, px.y))) - luma(sampleAt(uv - vec2(0.0, px.y)));
    float edge = clamp(1.0 - sqrt(gx * gx + gy * gy) * (4.0 + u_param * 12.0), 0.0, 1.0);
    c = mix(c, vec3(edge), u_amount);
  } else if (u_effect == 12) { // kaleidoscope
    vec2 p = (uv - 0.5) * aspect;
    float segments = 4.0 + floor(u_param * 8.0);
    float a = atan(p.y, p.x);
    float r = length(p);
    float seg = PI * 2.0 / segments;
    a = mod(a, seg);
    a = abs(a - seg * 0.5);
    vec2 q = vec2(cos(a), sin(a)) * r / aspect + 0.5;
    c = mix(c, sampleAt(q), u_amount);
  } else if (u_effect == 13) { // swirl
    vec2 p = (uv - u_center) * aspect;
    float r = length(p);
    float radius = 0.3 + u_param * 0.5;
    float t = 1.0 - smoothstep(0.0, radius, r);
    float a = atan(p.y, p.x) + t * t * u_amount * 6.0;
    vec2 q = vec2(cos(a), sin(a)) * r / aspect + u_center;
    c = sampleAt(q);
  } else if (u_effect == 14) { // fisheye
    vec2 p = (uv - 0.5) * 2.0;
    float r = length(p);
    float k = u_amount * 0.8;
    vec2 q = p * (1.0 + k * r * r) / (1.0 + k);
    c = sampleAt(q * 0.5 + 0.5);
  } else if (u_effect == 15) { // chromatic aberration (radial)
    vec2 d = (uv - 0.5) * u_amount * 0.04;
    c = vec3(sampleAt(uv + d).r, c.g, sampleAt(uv - d).b);
  } else if (u_effect == 16) { // vhs
    float line = sin(uv.y * u_size.y * 1.5) * 0.5 + 0.5;
    vec2 off = vec2(u_amount * 0.006, 0.0);
    vec3 v = vec3(sampleAt(uv + off).r, c.g, sampleAt(uv - off).b);
    v *= 1.0 - line * u_amount * 0.35;
    v += (hash21(uv * u_size + u_seed) - 0.5) * u_amount * 0.12;
    v = mix(vec3(luma(v)), v, 0.75);
    c = mix(c, v, u_amount);
  } else if (u_effect == 17) { // mirror
    vec2 m = u_param < 0.5 ? vec2(uv.x < 0.5 ? uv.x : 1.0 - uv.x, uv.y) : vec2(uv.x, uv.y < 0.5 ? uv.y : 1.0 - uv.y);
    c = mix(c, sampleAt(m), u_amount);
  } else if (u_effect == 18) { // invert
    c = mix(c, 1.0 - c, u_amount);
  } else if (u_effect == 19) { // oil paint (Kuwahara-style, 4 regions)
    float rad = 1.0 + u_amount * 3.0;
    vec3 best = c; float bestVar = 1e9;
    for (int k = 0; k < 4; k++) {
      vec2 sgn = vec2(k == 0 || k == 3 ? 1.0 : -1.0, k < 2 ? 1.0 : -1.0);
      vec3 mean = vec3(0.0); vec3 sq = vec3(0.0);
      for (int i = 0; i <= 2; i++) for (int j = 0; j <= 2; j++) {
        vec3 s = sampleAt(uv + sgn * vec2(float(i), float(j)) * rad * px);
        mean += s; sq += s * s;
      }
      mean /= 9.0; sq /= 9.0;
      float v = dot(sq - mean * mean, vec3(1.0));
      if (v < bestVar) { bestVar = v; best = mean; }
    }
    c = best;
  } else if (u_effect == 20) { // cross hatch
    float l = luma(c);
    vec2 p = uv * u_size;
    float hatch = 1.0;
    float spacing = 6.0 + (1.0 - u_param) * 6.0;
    if (l < 0.8 && mod(p.x + p.y, spacing) < 1.2) hatch = 0.0;
    if (l < 0.6 && mod(p.x - p.y, spacing) < 1.2) hatch = 0.0;
    if (l < 0.4 && mod(p.x + p.y - spacing * 0.5, spacing) < 1.2) hatch = 0.0;
    if (l < 0.2 && mod(p.x - p.y - spacing * 0.5, spacing) < 1.2) hatch = 0.0;
    c = mix(c, vec3(hatch), u_amount);
  } else if (u_effect == 21) { // dot screen
    float cell = 4.0 + (1.0 - u_param) * 12.0;
    vec2 p = mod(uv * u_size, cell) - cell * 0.5;
    float l = luma(c);
    float d = length(p) / (cell * 0.5);
    float dots = smoothstep(l - 0.1, l + 0.1, 1.0 - d);
    c = mix(c, c * dots, u_amount);
  } else if (u_effect == 22) { // glow (soft focus)
    vec3 b = texture(u_blur, uv).rgb;
    vec3 screen = 1.0 - (1.0 - c) * (1.0 - b);
    c = mix(c, screen, u_amount * 0.8);
  } else if (u_effect == 23) { // vignette blur (edges soften)
    float d = distance((uv - 0.5) * aspect, vec2(0.0));
    float m = smoothstep(0.25, 0.75, d);
    c = mix(c, texture(u_blur, uv).rgb, m * u_amount);
  } else if (u_effect == 24) { // frosted glass
    vec2 jitter = (vec2(hash21(uv * u_size + u_seed), hash21(uv * u_size * 1.7 + u_seed)) - 0.5) * u_amount * 24.0 * px;
    c = sampleAt(uv + jitter);
  }

  // Grain (Adjust panel).
  if (u_grain > 0.0) {
    float size = 1.0 + u_grainSize * 3.0;
    vec2 g = floor(uv * u_size / size);
    float n = hash21(g + u_seed) - 0.5;
    float lumW = 1.0 - abs(luma(c) * 2.0 - 1.0) * 0.5; // less grain in extremes
    c += n * u_grain * 0.35 * lumW;
  }
  // Vignette (Adjust panel).
  if (abs(u_vignette) > 1e-4) {
    float d = distance((uv - 0.5) * aspect, vec2(0.0)) / length(vec2(0.5) * aspect);
    float feather = 0.2 + u_vignetteFeather * 0.7;
    float v = smoothstep(1.0 - feather, 1.0, d);
    c = u_vignette > 0.0 ? c * (1.0 - v * u_vignette * 0.9) : c + (1.0 - c) * v * -u_vignette * 0.7;
  }
  fragColor = vec4(clamp(c, 0.0, 1.0), texture(u_image, uv).a);
}
`;
