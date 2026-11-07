/** A parsed 3D LUT: `size` samples per axis, `data` holds size³ RGB floats (0..1) in red-fastest order. */
export interface Lut3D {
  title: string;
  size: number;
  data: Float32Array;
  domainMin: [number, number, number];
  domainMax: [number, number, number];
}

/**
 * Parses an Adobe/Resolve `.cube` file. Supports `TITLE`, `LUT_3D_SIZE`, `DOMAIN_MIN`,
 * `DOMAIN_MAX` and comments. 1D LUTs are rejected with a clear error because the shader
 * only samples 3D tables.
 */
export function parseCube(text: string): Lut3D {
  let title = 'Untitled LUT';
  let size = 0;
  let domainMin: [number, number, number] = [0, 0, 0];
  let domainMax: [number, number, number] = [1, 1, 1];
  const values: number[] = [];

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const upper = line.toUpperCase();
    if (upper.startsWith('TITLE')) {
      title = line.slice(5).trim().replace(/^"|"$/g, '') || title;
    } else if (upper.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1] ?? '0', 10);
    } else if (upper.startsWith('LUT_1D_SIZE')) {
      throw new Error('1D LUT files are not supported. Please use a 3D .cube LUT.');
    } else if (upper.startsWith('DOMAIN_MIN')) {
      domainMin = parseTriple(line);
    } else if (upper.startsWith('DOMAIN_MAX')) {
      domainMax = parseTriple(line);
    } else if (/^[-+0-9.]/.test(line)) {
      const parts = line.split(/\s+/).map(Number);
      if (parts.length >= 3 && parts.slice(0, 3).every((v) => Number.isFinite(v))) {
        values.push(parts[0]!, parts[1]!, parts[2]!);
      }
    }
  }

  if (size < 2 || size > 128) throw new Error('LUT_3D_SIZE is missing or out of range (2..128).');
  const expected = size * size * size * 3;
  if (values.length !== expected) {
    throw new Error(
      `LUT has ${values.length / 3} entries but LUT_3D_SIZE ${size} needs ${size ** 3}.`,
    );
  }
  return { title, size, data: Float32Array.from(values), domainMin, domainMax };
}

function parseTriple(line: string): [number, number, number] {
  const parts = line.split(/\s+/).slice(1, 4).map(Number);
  if (parts.length !== 3 || parts.some((v) => !Number.isFinite(v))) {
    throw new Error(`Invalid triple in line: ${line}`);
  }
  return [parts[0]!, parts[1]!, parts[2]!];
}

/**
 * Builds a 3D LUT by sampling `transform` at every grid point. Lets the filter catalogue
 * express non-linear colour looks (cross-process, teal-orange) as ordinary LUTs.
 */
export function generateLut(
  title: string,
  size: number,
  transform: (r: number, g: number, b: number) => [number, number, number],
): Lut3D {
  const data = new Float32Array(size * size * size * 3);
  let i = 0;
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const [or, og, ob] = transform(r / (size - 1), g / (size - 1), b / (size - 1));
        data[i++] = or;
        data[i++] = og;
        data[i++] = ob;
      }
    }
  }
  return { title, size, data, domainMin: [0, 0, 0], domainMax: [1, 1, 1] };
}

/** Identity LUT (no colour change) at the requested size. Useful for tests and defaults. */
export function identityLut(size = 17): Lut3D {
  return generateLut('Identity', size, (r, g, b) => [r, g, b]);
}
