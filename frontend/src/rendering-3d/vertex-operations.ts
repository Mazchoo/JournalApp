import type { IndexBuffer } from "./render-data-types";

/** Per-vertex unit normals accumulated from triangle faces. */
export function computeNormals(
  positions: Float32Array,
  indices: IndexBuffer | null,
): Float32Array {
  const norms = new Float32Array(positions.length);
  const triCount = indices ? indices.length / 3 : positions.length / 9;

  for (let t = 0; t < triCount; t++) {
    const v0 = indices ? indices[t * 3]! * 3 : t * 9;
    const v1 = indices ? indices[t * 3 + 1]! * 3 : t * 9 + 3;
    const v2 = indices ? indices[t * 3 + 2]! * 3 : t * 9 + 6;

    const ax = positions[v1]! - positions[v0]!;
    const ay = positions[v1 + 1]! - positions[v0 + 1]!;
    const az = positions[v1 + 2]! - positions[v0 + 2]!;
    const bx = positions[v2]! - positions[v0]!;
    const by = positions[v2 + 1]! - positions[v0 + 1]!;
    const bz = positions[v2 + 2]! - positions[v0 + 2]!;
    const nx = ay * bz - az * by;
    const ny = az * bx - ax * bz;
    const nz = ax * by - ay * bx;

    norms[v0] += nx;
    norms[v0 + 1] += ny;
    norms[v0 + 2] += nz;
    norms[v1] += nx;
    norms[v1 + 1] += ny;
    norms[v1 + 2] += nz;
    norms[v2] += nx;
    norms[v2 + 1] += ny;
    norms[v2 + 2] += nz;
  }

  for (let i = 0; i < norms.length; i += 3) {
    const len = Math.sqrt(
      norms[i]! * norms[i]! +
        norms[i + 1]! * norms[i + 1]! +
        norms[i + 2]! * norms[i + 2]!,
    );
    if (len > 0) {
      norms[i] /= len;
      norms[i + 1] /= len;
      norms[i + 2] /= len;
    }
  }

  return norms;
}

/**
 * Average of the given vertex positions, treating each vertex as equal mass.
 *
 * Returns `[0, 0, 0]` when there are no vertices.
 */
export function computeCenterOfGravity(
  positions: Float32Array,
): [number, number, number] {
  const vertexCount = positions.length / 3;
  if (vertexCount === 0) return [0, 0, 0];

  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < positions.length; i += 3) {
    x += positions[i]!;
    y += positions[i + 1]!;
    z += positions[i + 2]!;
  }
  return [x / vertexCount, y / vertexCount, z / vertexCount];
}
