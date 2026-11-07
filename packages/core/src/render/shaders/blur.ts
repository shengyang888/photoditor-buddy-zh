/**
 * Separable Gaussian blur. Run twice (horizontal then vertical). `u_radius` is in pixels.
 * A 13-tap kernel with linear-sampling offsets keeps large radii affordable on phones.
 */
export const BLUR_FRAGMENT = `#version 300 es
precision highp float;
in vec2 v_uv;
out vec4 fragColor;
uniform sampler2D u_image;
uniform vec2 u_direction; // (1,0) or (0,1), already divided by texture size
uniform float u_radius;
void main() {
  if (u_radius < 0.01) { fragColor = texture(u_image, v_uv); return; }
  float sigma = max(u_radius * 0.5, 0.3);
  vec4 sum = vec4(0.0);
  float weightSum = 0.0;
  const int TAPS = 12;
  float step = max(u_radius / float(TAPS), 0.25);
  for (int i = -TAPS; i <= TAPS; i++) {
    float d = float(i) * step;
    float w = exp(-(d * d) / (2.0 * sigma * sigma));
    sum += texture(u_image, v_uv + u_direction * d) * w;
    weightSum += w;
  }
  fragColor = sum / weightSum;
}
`;
