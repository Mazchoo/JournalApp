import { describe, expect, it } from 'vitest';

import { computeCenterOfGravity } from '../src/rendering-3d/vertex-operations';

describe('computeCenterOfGravity', () => {
  it('returns the origin when there are no vertices', () => {
    expect(computeCenterOfGravity(new Float32Array())).toEqual([0, 0, 0]);
  });

  it('returns a single vertex unchanged', () => {
    expect(computeCenterOfGravity(new Float32Array([1, 2, 3]))).toEqual([1, 2, 3]);
  });

  it('averages several vertices with equal mass', () => {
    const positions = new Float32Array([0, 0, 0, 2, 4, 6, 4, 2, 0]);

    expect(computeCenterOfGravity(positions)).toEqual([2, 2, 2]);
  });
});
