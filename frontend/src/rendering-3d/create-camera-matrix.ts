/**
 * Fit a mesh in the preview camera and build the rotating MVP matrix.
 */

/** Translate a mesh to the origin and scale it to fit a cube of side length 2. */
export function centerAndScalePositions(positions: Float32Array): Float32Array {
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]!);
    maxX = Math.max(maxX, positions[i]!);
    minY = Math.min(minY, positions[i + 1]!);
    maxY = Math.max(maxY, positions[i + 1]!);
    minZ = Math.min(minZ, positions[i + 2]!);
    maxZ = Math.max(maxZ, positions[i + 2]!);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sc = 2 / Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);
  const pos = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    pos[i] = (positions[i]! - cx) * sc;
    pos[i + 1] = (positions[i + 1]! - cy) * sc;
    pos[i + 2] = (positions[i + 2]! - cz) * sc;
  }
  return pos;
}

/** Perspective projection for the preview camera (45° FOV, near 0.1, far 100). */
export function createProjectionMatrix(aspect: number): Float32Array {
  const fv = Math.PI / 4;
  const nr = 0.1;
  const fr = 100;
  const f = 1 / Math.tan(fv / 2);
  const di = 1 / (nr - fr);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (nr + fr) * di, -1,
    0, 0, 2 * nr * fr * di, 0,
  ]);
}

/** Column-major Y-rotation about the origin, then translate to z = -3. */
function modelViewMatrix(angle: number): Float32Array {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return new Float32Array([
    c, 0, -s, 0,
    0, 1, 0, 0,
    s, 0, c, 0,
    0, 0, -3, 1,
  ]);
}

/** Multiply two column-major 4×4 matrices. */
function multiplyMat4(a: Float32Array, b: Float32Array): Float32Array {
  const r = new Float32Array(16);
  for (let col = 0; col < 4; col++) {
    for (let row = 0; row < 4; row++) {
      let sum = 0;
      for (let k = 0; k < 4; k++) sum += a[row + k * 4]! * b[k + col * 4]!;
      r[row + col * 4] = sum;
    }
  }
  return r;
}

/** Build a rotating model-view-projection matrix. */
export function createMvpMatrix(projection: Float32Array, angle: number): Float32Array {
  return multiplyMat4(projection, modelViewMatrix(angle));
}
