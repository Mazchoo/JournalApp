/**
 * Fit a mesh in the preview camera and build the view and projection matrices.
 *
 * Camera axes are the image plane (`right`, `up`) and the view direction
 * (`forward`, into the image). Input that mutates this camera lives in
 * `event-handling.ts`.
 */

import { CAMERA_FAR, CAMERA_FOV_Y, CAMERA_NEAR, INITIAL_CAMERA_RADIUS } from '../display-config';

type Vec3 = [number, number, number];

/**
 * Orbit camera in image-plane axes: `right`/`up` are screen x/y, `forward`
 * looks into the image. Pan is in that same plane.
 */
export interface OrbitCamera {
  right: Vec3;
  up: Vec3;
  forward: Vec3;
  radius: number;
  panX: number;
  panY: number;
}

/** Camera looking down −Z at the pivot from `INITIAL_CAMERA_RADIUS`. */
export function createOrbitCamera(): OrbitCamera {
  return {
    right: [1, 0, 0],
    up: [0, 1, 0],
    forward: [0, 0, -1],
    radius: INITIAL_CAMERA_RADIUS,
    panX: 0,
    panY: 0,
  };
}

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

/** Perspective projection for the preview camera. */
export function createProjectionMatrix(aspect: number): Float32Array {
  const f = 1 / Math.tan(CAMERA_FOV_Y / 2);
  const di = 1 / (CAMERA_NEAR - CAMERA_FAR);
  return new Float32Array([
    f / aspect, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (CAMERA_NEAR + CAMERA_FAR) * di, -1,
    0, 0, 2 * CAMERA_NEAR * CAMERA_FAR * di, 0,
  ]);
}

/** World-space camera position for an orbit around `cog`. */
function cameraEye(camera: OrbitCamera, cog: Vec3): Vec3 {
  const { right, up, forward } = camera;
  return [
    cog[0] - forward[0] * camera.radius + right[0] * camera.panX + up[0] * camera.panY,
    cog[1] - forward[1] * camera.radius + right[1] * camera.panX + up[1] * camera.panY,
    cog[2] - forward[2] * camera.radius + right[2] * camera.panX + up[2] * camera.panY,
  ];
}

/** Column-major view matrix looking along −Z, orbiting around `cog`. */
export function createViewMatrix(camera: OrbitCamera, cog: Vec3): Float32Array {
  const { right, up, forward } = camera;
  const eye = cameraEye(camera, cog);
  return new Float32Array([
    right[0], up[0], -forward[0], 0,
    right[1], up[1], -forward[1], 0,
    right[2], up[2], -forward[2], 0,
    -dot(right, eye), -dot(up, eye), dot(forward, eye), 1,
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

/** Build the model-view-projection matrix for the current orbit camera. */
export function createMvpMatrix(
  projection: Float32Array,
  camera: OrbitCamera,
  cog: Vec3,
): Float32Array {
  return multiplyMat4(projection, createViewMatrix(camera, cog));
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
