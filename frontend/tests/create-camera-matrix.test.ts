import { describe, expect, it } from 'vitest';

import { CAMERA_FOV_Y, INITIAL_CAMERA_RADIUS } from '../src/display-config';
import { createOrbitCamera, createProjectionMatrix, createViewMatrix } from '../src/rendering-3d/create-camera-matrix';

const ORIGIN: [number, number, number] = [0, 0, 0];

describe('createViewMatrix', () => {
  it('places the default camera at (0, 0, radius) looking down −Z', () => {
    const view = createViewMatrix(createOrbitCamera(), ORIGIN);

    const expected = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, -INITIAL_CAMERA_RADIUS, 1];
    expected.forEach((value, i) => expect(view[i]).toBeCloseTo(value));
  });

  it('orbits around the given center of gravity, not the world origin', () => {
    const cog: [number, number, number] = [2, 0, 0];
    const view = createViewMatrix(createOrbitCamera(), cog);
    const projected = transformPoint(view, cog);

    expect(projected[0]).toBeCloseTo(0);
    expect(projected[1]).toBeCloseTo(0);
    expect(projected[2]).toBeCloseTo(-INITIAL_CAMERA_RADIUS);
  });
});

describe('createProjectionMatrix', () => {
  it('uses a 45° FOV with a finite perspective divide', () => {
    const projection = createProjectionMatrix(2);
    const f = 1 / Math.tan(CAMERA_FOV_Y / 2);

    expect(projection[0]).toBeCloseTo(f / 2);
    expect(projection[5]).toBeCloseTo(f);
    expect(projection[11]).toBe(-1);
  });
});

/** Apply a column-major 4×4 matrix to a point with w = 1. */
function transformPoint(m: Float32Array, p: [number, number, number]): [number, number, number] {
  return [
    m[0]! * p[0] + m[4]! * p[1] + m[8]! * p[2] + m[12]!,
    m[1]! * p[0] + m[5]! * p[1] + m[9]! * p[2] + m[13]!,
    m[2]! * p[0] + m[6]! * p[1] + m[10]! * p[2] + m[14]!,
  ];
}
