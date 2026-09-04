import { describe, expect, it } from "vitest";

import { CAMERA_FOV_Y, INITIAL_CAMERA_RADIUS } from "../src/display-config";
import {
  createOrbitCamera,
  createViewMatrix,
} from "../src/rendering-3d/create-camera-matrix";
import {
  orbitByPixels,
  panCamera,
  rollCamera,
  zoomTowardNdc,
} from "../src/rendering-3d/event-handling";

const ORIGIN: [number, number, number] = [0, 0, 0];

describe("orbitByPixels", () => {
  it("rotates about the image-plane axes and keeps the center of gravity on screen", () => {
    const camera = createOrbitCamera();
    const before = createViewMatrix(camera, ORIGIN);
    orbitByPixels(camera, 80, 40);
    const after = createViewMatrix(camera, ORIGIN);

    expect(camera.forward[0]).toBeGreaterThan(0);
    expect(camera.forward[1]).toBeLessThan(0);
    expect(transformPoint(after, ORIGIN)[0]).toBeCloseTo(0);
    expect(transformPoint(after, ORIGIN)[1]).toBeCloseTo(0);
    expect(Array.from(after)).not.toEqual(Array.from(before));
  });

  it("orbits vertically around image-plane X without using world-up as a lock", () => {
    const camera = createOrbitCamera();
    orbitByPixels(camera, 0, 80);

    expect(camera.forward[0]).toBeCloseTo(0);
    expect(camera.forward[1]).toBeLessThan(0);
    expect(camera.right[0]).toBeCloseTo(1);
    expect(Number.isFinite(createViewMatrix(camera, ORIGIN)[0])).toBe(true);
  });
});

describe("panCamera", () => {
  it("pans right and left on D and A", () => {
    const camera = createOrbitCamera();

    expect(panCamera(camera, "d")).toBe(true);
    expect(camera.panX).toBeGreaterThan(0);
    const right = camera.panX;

    expect(panCamera(camera, "a")).toBe(true);
    expect(camera.panX).toBeLessThan(right);
  });

  it("pans up and down on W and S", () => {
    const camera = createOrbitCamera();

    expect(panCamera(camera, "W")).toBe(true);
    expect(camera.panY).toBeGreaterThan(0);

    expect(panCamera(camera, "s")).toBe(true);
    expect(camera.panY).toBeCloseTo(0);
  });

  it("ignores keys that are not WASD", () => {
    const camera = createOrbitCamera();

    expect(panCamera(camera, "q")).toBe(false);
    expect(camera.panX).toBe(0);
    expect(camera.panY).toBe(0);
  });
});

describe("rollCamera", () => {
  it("rolls about the view axis instead of yawing like a horizontal drag", () => {
    const camera = createOrbitCamera();
    const dragged = createOrbitCamera();
    orbitByPixels(dragged, 80, 0);

    expect(rollCamera(camera, "e")).toBe(true);
    expect(camera.forward[0]).toBeCloseTo(0);
    expect(camera.forward[2]).toBeCloseTo(-1);
    expect(camera.right[1]).not.toBeCloseTo(0);
    expect(dragged.forward[0]).toBeGreaterThan(0);
    expect(dragged.right[1]).toBeCloseTo(0);
    expect(
      transformPoint(createViewMatrix(camera, ORIGIN), ORIGIN)[0],
    ).toBeCloseTo(0);
    expect(
      transformPoint(createViewMatrix(camera, ORIGIN), ORIGIN)[1],
    ).toBeCloseTo(0);
  });

  it("rolls left on Q, opposite of E", () => {
    const camera = createOrbitCamera();
    rollCamera(camera, "e");
    const rightY = camera.right[1];

    expect(rollCamera(camera, "Q")).toBe(true);
    expect(camera.right[1]).toBeGreaterThan(rightY);
  });

  it("ignores keys that are not Q or E", () => {
    const camera = createOrbitCamera();

    expect(rollCamera(camera, "d")).toBe(false);
    expect(camera.right[1]).toBeCloseTo(0);
    expect(camera.up[0]).toBeCloseTo(0);
  });
});

describe("zoomTowardNdc", () => {
  it("zooms toward the screen center without panning", () => {
    const camera = createOrbitCamera();
    zoomTowardNdc(camera, 0, 0, 1, 0.5);

    expect(camera.radius).toBeCloseTo(INITIAL_CAMERA_RADIUS * 0.5);
    expect(camera.panX).toBeCloseTo(0);
    expect(camera.panY).toBeCloseTo(0);
  });

  it("keeps the cursor world point under the cursor when zooming off-center", () => {
    const camera = createOrbitCamera();
    const ndcX = 0.6;
    const ndcY = -0.3;
    const aspect = 2;
    const before = cursorOnPivotPlane(camera, ndcX, ndcY, aspect);

    zoomTowardNdc(camera, ndcX, ndcY, aspect, 0.5);

    const after = cursorOnPivotPlane(camera, ndcX, ndcY, aspect);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
    expect(after[2]).toBeCloseTo(before[2]);
    expect(camera.panX).toBeGreaterThan(0);
    expect(camera.panY).toBeLessThan(0);
  });
});

/** Apply a column-major 4×4 matrix to a point with w = 1. */
function transformPoint(
  m: Float32Array,
  p: [number, number, number],
): [number, number, number] {
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
  ];
}

/**
 * World-space point on the CoG plane that currently projects to the given NDC.
 *
 * Uses the same unprojection as `zoomTowardNdc` so the zoom invariant can be checked.
 */
function cursorOnPivotPlane(
  camera: ReturnType<typeof createOrbitCamera>,
  ndcX: number,
  ndcY: number,
  aspect: number,
): [number, number, number] {
  const view = createViewMatrix(camera, ORIGIN);
  const f = 1 / Math.tan(CAMERA_FOV_Y / 2);
  const camX = (ndcX * camera.radius * aspect) / f;
  const camY = (ndcY * camera.radius) / f;
  const camZ = -camera.radius;
  const inv = invertRigid(view);
  return transformPoint(inv, [camX, camY, camZ]);
}

/** Inverse of a rigid column-major view matrix (rotation + translation). */
function invertRigid(m: Float32Array): Float32Array {
  const inv = new Float32Array(16);
  inv[0] = m[0]!;
  inv[1] = m[4]!;
  inv[2] = m[8]!;
  inv[4] = m[1]!;
  inv[5] = m[5]!;
  inv[6] = m[9]!;
  inv[8] = m[2]!;
  inv[9] = m[6]!;
  inv[10] = m[10]!;
  inv[12] = -(m[0]! * m[12]! + m[1]! * m[13]! + m[2]! * m[14]!);
  inv[13] = -(m[4]! * m[12]! + m[5]! * m[13]! + m[6]! * m[14]!);
  inv[14] = -(m[8]! * m[12]! + m[9]! * m[13]! + m[10]! * m[14]!);
  inv[15] = 1;
  return inv;
}
