/**
 * Pointer and keyboard camera controls for the mesh preview.
 *
 * Middle-drag orbits about image x/y; the wheel dollies along the view axis;
 * Q/E rolls about that same axis; WASD pans in the image plane.
 */

import { CAMERA_FOV_Y } from '../display-config';
import type { OrbitCamera } from './create-camera-matrix';

type Vec3 = [number, number, number];

/** Radians of yaw/pitch per pixel of middle-mouse drag. */
const ORBIT_SENSITIVITY = 0.005;

/** WASD pan distance as a fraction of the current orbit radius. */
const PAN_STEP_FRACTION = 0.05;

/** Radians of roll about the view axis per Q/E keypress. */
const ROLL_STEP = 0.08;

/** Smallest allowed distance from the orbit pivot. */
const MIN_RADIUS = 0.15;

/** Largest allowed distance from the orbit pivot. */
const MAX_RADIUS = 80;

/** Drop previous input handlers when the same canvas starts a new preview. */
const loopControllers = new WeakMap<HTMLCanvasElement, AbortController>();

/**
 * Orbit around the pivot from a middle-mouse drag.
 *
 * `dx` rotates about image-plane Y (screen up); `dy` rotates about image-plane X
 * (screen right).
 */
export function orbitByPixels(camera: OrbitCamera, dx: number, dy: number): void {
  const up: Vec3 = [camera.up[0], camera.up[1], camera.up[2]];
  const right: Vec3 = [camera.right[0], camera.right[1], camera.right[2]];
  rotateCamera(camera, up, -dx * ORBIT_SENSITIVITY);
  rotateCamera(camera, right, -dy * ORBIT_SENSITIVITY);
}

/**
 * Pan the camera in its image plane from a WASD key.
 *
 * Returns false when the key is not a pan binding.
 */
export function panCamera(camera: OrbitCamera, key: string): boolean {
  const step = camera.radius * PAN_STEP_FRACTION;
  switch (key.toLowerCase()) {
    case 'w':
      camera.panY += step;
      return true;
    case 's':
      camera.panY -= step;
      return true;
    case 'a':
      camera.panX -= step;
      return true;
    case 'd':
      camera.panX += step;
      return true;
    default:
      return false;
  }
}

/**
 * Roll about the view axis (into the image).
 *
 * Middle-drag already covers image-plane x/y. The wheel dollies along this
 * axis; Q/E is the rotation around it. Q rolls left; E rolls right.
 * Returns false when the key is not a roll binding.
 */
export function rollCamera(camera: OrbitCamera, key: string): boolean {
  switch (key.toLowerCase()) {
    case 'q':
      rotateCamera(camera, camera.forward, -ROLL_STEP);
      return true;
    case 'e':
      rotateCamera(camera, camera.forward, ROLL_STEP);
      return true;
    default:
      return false;
  }
}

/**
 * Dolly toward the point on the pivot plane under the given NDC coordinates.
 *
 * `factor` < 1 zooms in; `factor` > 1 zooms out. The world point under the
 * cursor stays under the cursor.
 */
export function zoomTowardNdc(
  camera: OrbitCamera,
  ndcX: number,
  ndcY: number,
  aspect: number,
  factor: number,
): void {
  const newRadius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, camera.radius * factor));
  const s = newRadius / camera.radius;
  const f = 1 / Math.tan(CAMERA_FOV_Y / 2);
  camera.panX += (1 - s) * ((ndcX * camera.radius * aspect) / f);
  camera.panY += (1 - s) * ((ndcY * camera.radius) / f);
  camera.radius = newRadius;
}

/** NDC coordinates of a pointer event on the canvas, with Y flipped for clip space. */
function pointerNdc(canvas: HTMLCanvasElement, event: MouseEvent): [number, number] {
  const rect = canvas.getBoundingClientRect();
  const width = rect.width || canvas.width || 1;
  const height = rect.height || canvas.height || 1;
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return [(x / width) * 2 - 1, 1 - (y / height) * 2];
}

/**
 * Bind wheel zoom, middle-drag orbit, WASD pan, and Q/E roll on `canvas`.
 *
 * Calls `onChange` after any camera mutation so the caller can redraw.
 * Replaces any previous binding on the same canvas.
 */
export function bindCameraControls(
  canvas: HTMLCanvasElement,
  camera: OrbitCamera,
  onChange: () => void,
): void {
  canvas.tabIndex = 0;
  loopControllers.get(canvas)?.abort();
  const controller = new AbortController();
  loopControllers.set(canvas, controller);
  const { signal } = controller;

  let orbitDragging = false;
  let lastPointerX = 0;
  let lastPointerY = 0;

  canvas.addEventListener(
    'wheel',
    (event) => {
      event.preventDefault();
      const [ndcX, ndcY] = pointerNdc(canvas, event);
      zoomTowardNdc(camera, ndcX, ndcY, canvas.width / canvas.height, Math.exp(event.deltaY * 0.001));
      onChange();
    },
    { passive: false, signal },
  );

  canvas.addEventListener(
    'mousedown',
    (event) => {
      canvas.focus();
      if (event.button !== 1) return;
      event.preventDefault();
      orbitDragging = true;
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
    },
    { signal },
  );

  window.addEventListener(
    'mousemove',
    (event) => {
      if (!orbitDragging) return;
      orbitByPixels(camera, event.clientX - lastPointerX, event.clientY - lastPointerY);
      lastPointerX = event.clientX;
      lastPointerY = event.clientY;
      onChange();
    },
    { signal },
  );

  window.addEventListener(
    'mouseup',
    (event) => {
      if (event.button === 1) orbitDragging = false;
    },
    { signal },
  );

  canvas.addEventListener(
    'keydown',
    (event) => {
      if (document.activeElement !== canvas) return;
      if (!panCamera(camera, event.key) && !rollCamera(camera, event.key)) return;
      event.preventDefault();
      onChange();
    },
    { signal },
  );
}

/** Rotate the camera basis about `axis` (through the orbit pivot). */
function rotateCamera(camera: OrbitCamera, axis: Vec3, angle: number): void {
  const k = normalize(axis);
  camera.right = rotateVec(camera.right, k, angle);
  camera.up = rotateVec(camera.up, k, angle);
  camera.forward = rotateVec(camera.forward, k, angle);
  camera.forward = normalize(camera.forward);
  camera.right = normalize(cross(camera.forward, camera.up));
  camera.up = normalize(cross(camera.right, camera.forward));
}

/** Rodrigues rotation of `v` around unit axis `k`. */
function rotateVec(v: Vec3, k: Vec3, angle: number): Vec3 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const d = dot(k, v);
  const cxv = cross(k, v);
  return [
    v[0] * c + cxv[0] * s + k[0] * d * (1 - c),
    v[1] * c + cxv[1] * s + k[1] * d * (1 - c),
    v[2] * c + cxv[2] * s + k[2] * d * (1 - c),
  ];
}

function cross(a: Vec3, b: Vec3): Vec3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function dot(a: Vec3, b: Vec3): number {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}

function normalize(v: Vec3): Vec3 {
  const len = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / len, v[1] / len, v[2] / len];
}
