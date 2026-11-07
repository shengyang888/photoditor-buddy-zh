import { GLSL_COMMON } from './common';

/**
 * Displacement warp used for face reshape and the liquify brush.
 * `u_displacement` stores uv offsets (RG float); the shader samples the source at uv + offset.
 */
export const WARP_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_displacement;
void main() {
  vec2 offset = texture(u_displacement, v_uv).rg;
  fragColor = texture(u_image, clamp(v_uv + offset, 0.0, 1.0));
}
`;

/**
 * Skin pass: edge-preserving smoothing (bilateral), whitening, teeth whitening and eye brightening,
 * each limited to its mask channel (R = skin, G = teeth, B = eyes). Then a makeup overlay is blended.
 */
export const SKIN_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform sampler2D u_mask;
uniform sampler2D u_makeup;
uniform vec2 u_size;
uniform float u_smooth, u_whiten, u_teeth, u_eyes, u_useMakeup, u_useMask, u_blemish;
${GLSL_COMMON}

vec3 bilateral(vec2 uv, float radius) {
  vec3 centre = texture(u_image, uv).rgb;
  vec3 sum = vec3(0.0);
  float wsum = 0.0;
  vec2 px = radius / u_size;
  for (int x = -4; x <= 4; x++) {
    for (int y = -4; y <= 4; y++) {
      vec2 o = vec2(float(x), float(y)) * px;
      vec3 s = texture(u_image, uv + o).rgb;
      float spatial = exp(-dot(o * u_size, o * u_size) / (2.0 * radius * radius * 16.0));
      float range = exp(-dot(s - centre, s - centre) / (2.0 * 0.08 * 0.08));
      float w = spatial * range;
      sum += s * w; wsum += w;
    }
  }
  return sum / max(wsum, 1e-4);
}

void main() {
  vec4 src = texture(u_image, v_uv);
  vec3 c = src.rgb;
  vec4 mask = u_useMask > 0.5 ? texture(u_mask, v_uv) : vec4(0.0);
  float skin = mask.r;
  if (u_smooth > 0.0 && skin > 0.001) {
    float radius = 1.0 + u_smooth * 2.5;
    vec3 smooth_ = bilateral(v_uv, radius);
    // Keep a little texture so skin does not look plastic.
    vec3 detail = c - smooth_;
    c = mix(c, smooth_ + detail * 0.25, u_smooth * skin);
  }
  if (u_blemish > 0.0 && mask.a > 0.001) {
    vec3 heal = bilateral(v_uv, 3.0);
    c = mix(c, heal, mask.a * u_blemish);
  }
  if (u_whiten > 0.0 && skin > 0.001) {
    vec3 lifted = c + (1.0 - c) * 0.35;
    lifted = mix(vec3(luma(lifted)), lifted, 0.85);
    c = mix(c, lifted, u_whiten * skin);
  }
  if (u_teeth > 0.0 && mask.g > 0.001) {
    vec3 hsl = rgb2hsl(c);
    hsl.y *= 1.0 - 0.8 * u_teeth;          // remove yellow cast
    hsl.z = min(1.0, hsl.z + 0.18 * u_teeth); // brighten
    c = mix(c, hsl2rgb(hsl), mask.g);
  }
  if (u_eyes > 0.0 && mask.b > 0.001) {
    vec3 bright = c * (1.0 + 0.35 * u_eyes);
    bright = (bright - 0.5) * (1.0 + 0.2 * u_eyes) + 0.5;
    c = mix(c, clamp(bright, 0.0, 1.0), mask.b);
  }
  if (u_useMakeup > 0.5) {
    vec4 m = texture(u_makeup, v_uv);
    if (m.a > 0.001) {
      vec3 mc = m.rgb; // straight alpha (ImageData upload)
      // Makeup blend: hue from the makeup, saturation halfway between photo and makeup, and the
      // photo's own brightness/texture, darkened in proportion to how dark the makeup colour is
      // (eyeliner and brows darken, lipstick keeps highlights, light colours lift dark pixels a little).
      vec3 ch = rgb2hsl(c);
      vec3 mh = rgb2hsl(mc);
      float darken = min(1.0, 0.3 + 1.2 * mh.z);
      float lightness = mix(ch.z * darken, mh.z, 0.25 * m.a);
      float saturation = mix(ch.y, mh.y, 0.55);
      vec3 blended = hsl2rgb(vec3(mh.x, clamp(saturation, 0.0, 1.0), clamp(lightness, 0.0, 1.0)));
      c = mix(c, blended, clamp(m.a, 0.0, 1.0));
    }
  }
  fragColor = vec4(clamp(c, 0.0, 1.0), src.a);
}
`;
