import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';

import { computeNormals, initializeMeshRenderer, renderGLB } from '../src/entry/mesh';
import { buildGlb, buildTriangleGlb, prepareCanvas } from './helpers/glb';

let canvas: HTMLCanvasElement;
let consoleError: MockInstance<typeof console.error>;

/** FileReader resolves on its own task queue, so poll rather than guessing a tick count. */
function waitForConsoleError(message: string): Promise<void> {
  return vi.waitFor(() => {
    const seen = consoleError.mock.calls.some((call) => call[0] === message);
    expect(seen, `console.error was never called with "${message}"`).toBe(true);
  });
}

beforeEach(() => {
  document.body.innerHTML = '<canvas id="mesh-canvas0"></canvas>';
  canvas = document.getElementById('mesh-canvas0') as HTMLCanvasElement;
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('computeNormals', () => {
  it('produces the unit face normal of an indexed triangle', () => {
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]);

    const normals = computeNormals(positions, new Uint16Array([0, 1, 2]));

    expect(Array.from(normals)).toEqual([0, 0, 1, 0, 0, 1, 0, 0, 1]);
  });

  it('handles non-indexed geometry by walking vertices in threes', () => {
    const positions = new Float32Array([0, 0, 0, 0, 0, 1, 0, 1, 0]);

    const normals = computeNormals(positions, null);

    expect(normals).toHaveLength(9);
    expect(normals[0]).toBeCloseTo(-1);
    expect(normals[1]).toBeCloseTo(0);
    expect(normals[2]).toBeCloseTo(0);
  });

  it('averages and normalises the normals of shared vertices', () => {
    // Two triangles sharing the edge 1-2, folded around the x axis.
    const positions = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    const indices = new Uint16Array([0, 1, 2, 0, 2, 3]);

    const normals = computeNormals(positions, indices);

    for (let i = 0; i < normals.length; i += 3) {
      const length = Math.hypot(normals[i]!, normals[i + 1]!, normals[i + 2]!);
      expect(length).toBeCloseTo(1);
    }
  });

  it('leaves degenerate triangles at zero rather than dividing by zero', () => {
    const positions = new Float32Array([0, 0, 0, 0, 0, 0, 0, 0, 0]);

    const normals = computeNormals(positions, new Uint16Array([0, 1, 2]));

    expect(Array.from(normals)).toEqual([0, 0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('renderGLB', () => {
  it('rejects a file that does not start with the glTF magic number', () => {
    const notGlb = new ArrayBuffer(64);

    renderGLB(canvas, notGlb);

    expect(consoleError).toHaveBeenCalledWith('Not a valid GLB file');
  });

  it('rejects a GLB with no meshes', () => {
    const buffer = buildGlb({ accessors: [], bufferViews: [], meshes: [] });

    renderGLB(canvas, buffer);

    expect(consoleError).toHaveBeenCalledWith('No meshes found in GLB');
  });

  it('reports a missing WebGL context', () => {
    vi.spyOn(canvas, 'getContext').mockReturnValue(null);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(consoleError).toHaveBeenCalledWith('WebGL not supported');
  });

  it('sizes and reveals the canvas before drawing', () => {
    prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(canvas.style.visibility).toBe('visible');
    expect(canvas.style.height).toBe('400px');
    expect(canvas.style.display).toBe('block');
    expect(canvas.width).toBe(800);
    expect(canvas.height).toBe(400);
  });

  it('uploads the geometry and draws the indexed triangle', () => {
    const gl = prepareCanvas(canvas);
    const { indices } = buildTriangleGlb();

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(gl.callsTo('drawElements')).toHaveLength(1);
    expect(gl.callsTo('drawElements')[0]![1]).toBe(indices.length);
    expect(gl.callsTo('drawArrays')).toHaveLength(0);
  });

  it('uploads a position buffer and a computed normal buffer', () => {
    const gl = prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    const uploads = gl.callsTo('bufferData').map((args) => args[1]);
    const floatUploads = uploads.filter((data) => data instanceof Float32Array);
    expect(floatUploads).toHaveLength(2);
    expect((floatUploads[1] as Float32Array).length).toBe(9);
  });

  it('applies the default base colour when the primitive has no material', () => {
    const gl = prepareCanvas(canvas);

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(gl.callsTo('uniform4fv')[0]![1]).toEqual([0.8, 0.8, 0.8, 1.0]);
  });

  it('applies the material base colour when one is present', () => {
    const gl = prepareCanvas(canvas);
    const { buffer } = buildTriangleGlb();
    const withMaterial = replaceGltf(buffer, (gltf) => {
      gltf['materials'] = [{ pbrMetallicRoughness: { baseColorFactor: [0.1, 0.2, 0.3, 1] } }];
      (gltf['meshes'] as { primitives: Record<string, unknown>[] }[])[0]!.primitives[0]!['material'] = 0;
      return gltf;
    });

    renderGLB(canvas, withMaterial);

    expect(gl.callsTo('uniform4fv')[0]![1]).toEqual([0.1, 0.2, 0.3, 1]);
  });

  it('reports its first frame through the completion callback exactly once', () => {
    prepareCanvas(canvas);
    const onComplete = vi.fn();

    renderGLB(canvas, buildTriangleGlb().buffer, onComplete);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('aborts when the shader program fails to link', () => {
    const gl = prepareCanvas(canvas);
    gl.overrides['getProgramParameter'] = () => false;

    renderGLB(canvas, buildTriangleGlb().buffer);

    expect(consoleError).toHaveBeenCalledWith('Program link error:', '');
    expect(gl.callsTo('drawElements')).toHaveLength(0);
  });
});

describe('initializeMeshRenderer', () => {
  it('reads the file and renders it', async () => {
    prepareCanvas(canvas);
    const onComplete = vi.fn();
    const file = new File([buildTriangleGlb().buffer], 'scan.glb');

    initializeMeshRenderer(canvas, file, onComplete);
    await vi.waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));

    expect(canvas.width).toBe(800);
    expect(consoleError).not.toHaveBeenCalled();
  });

  it('reports a parse failure and still signals completion', async () => {
    const onComplete = vi.fn();
    const truncated = new Uint8Array([0x67, 0x6c, 0x54, 0x46]);

    initializeMeshRenderer(canvas, new File([truncated], 'scan.glb'), onComplete);
    await waitForConsoleError('GLB render error:');

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('does not require a completion callback', async () => {
    const truncated = new Uint8Array([0x67, 0x6c, 0x54, 0x46]);

    initializeMeshRenderer(canvas, new File([truncated], 'scan.glb'));
    await waitForConsoleError('GLB render error:');
  });
});

/** Rewrites the JSON chunk of a GLB while keeping its binary chunk intact. */
function replaceGltf(
  buffer: ArrayBuffer,
  edit: (gltf: Record<string, unknown>) => Record<string, unknown>,
): ArrayBuffer {
  const view = new DataView(buffer);
  const jsonLen = view.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen))) as Record<
    string,
    unknown
  >;
  const binChunkStart = 20 + jsonLen;
  const binLen = view.getUint32(binChunkStart, true);
  const bin = new Uint8Array(buffer.slice(binChunkStart + 8, binChunkStart + 8 + binLen));

  return buildGlb(edit(gltf), bin);
}
