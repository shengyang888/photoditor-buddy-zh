/**
 * Draws a colourful sample photo (sky, sun, hills, a person silhouette and some detail) so people
 * can try the editor without uploading anything. Pure canvas drawing, no assets.
 */
export function createSampleImage(width = 1600, height = 1067): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const sky = ctx.createLinearGradient(0, 0, 0, height * 0.7);
  sky.addColorStop(0, '#2b4c8c');
  sky.addColorStop(0.5, '#7fb3e6');
  sky.addColorStop(1, '#ffd6a5');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, width, height);
  // Sun.
  const sun = ctx.createRadialGradient(
    width * 0.72,
    height * 0.32,
    10,
    width * 0.72,
    height * 0.32,
    width * 0.12,
  );
  sun.addColorStop(0, '#fff6d5');
  sun.addColorStop(0.4, '#ffd166');
  sun.addColorStop(1, 'rgba(255,209,102,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, width, height);
  // Clouds.
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  for (const [cx, cy, r] of [
    [0.2, 0.22, 0.05],
    [0.26, 0.2, 0.07],
    [0.33, 0.23, 0.05],
    [0.55, 0.15, 0.04],
    [0.6, 0.14, 0.05],
  ]) {
    ctx.beginPath();
    ctx.arc(cx! * width, cy! * height, r! * width, 0, Math.PI * 2);
    ctx.fill();
  }
  // Hills.
  const hills = [
    ['#6c8f5a', 0.55, 0.62],
    ['#4f7444', 0.62, 0.7],
    ['#2f4f33', 0.72, 0.78],
  ] as const;
  hills.forEach(([color, y1, y2], i) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, height);
    ctx.lineTo(0, height * y1);
    for (let x = 0; x <= width; x += width / 12) {
      const t = x / width;
      const y = height * (y1 + (y2 - y1) * (0.5 + 0.5 * Math.sin(t * Math.PI * (2 + i) + i)));
      ctx.lineTo(x, y);
    }
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
  });
  // Lake reflection.
  const lake = ctx.createLinearGradient(0, height * 0.8, 0, height);
  lake.addColorStop(0, 'rgba(120,170,220,0.9)');
  lake.addColorStop(1, 'rgba(40,70,120,0.95)');
  ctx.fillStyle = lake;
  ctx.fillRect(0, height * 0.82, width, height * 0.18);
  // A simple person silhouette in the foreground (head + body) for beauty/liquify demos.
  ctx.fillStyle = '#f2c9a8';
  ctx.beginPath();
  ctx.arc(width * 0.3, height * 0.62, width * 0.045, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(width * 0.24, height * 0.9);
  ctx.quadraticCurveTo(width * 0.3, height * 0.6, width * 0.36, height * 0.9);
  ctx.closePath();
  ctx.fill();
  // Fine texture so sharpen/denoise have something to work on.
  const noise = ctx.getImageData(0, 0, width, height);
  for (let i = 0; i < noise.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 12;
    noise.data[i] = Math.max(0, Math.min(255, noise.data[i]! + n));
    noise.data[i + 1] = Math.max(0, Math.min(255, noise.data[i + 1]! + n));
    noise.data[i + 2] = Math.max(0, Math.min(255, noise.data[i + 2]! + n));
  }
  ctx.putImageData(noise, 0, 0);
  return canvas;
}
