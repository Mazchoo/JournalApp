import { vi } from 'vitest';

/** Builders and fakes for the GLB preview renderer. */

const GLB_MAGIC = 0x46546c67;
const JSON_CHUNK = 0x4e4f534a;
const BIN_CHUNK = 0x004e4942;

/** Pad a byte length up to the next 4-byte GLB alignment. */
function padTo4(length: number): number {
  return (4 - (length % 4)) % 4;
}

/** Pack a glTF JSON document and its binary buffer into a GLB container. */
export function buildGlb(gltf: unknown, bin: Uint8Array = new Uint8Array(0)): ArrayBuffer {
  const jsonBytes = new TextEncoder().encode(JSON.stringify(gltf));
  const jsonPad = padTo4(jsonBytes.length);
  const jsonLen = jsonBytes.length + jsonPad;
  const binPad = padTo4(bin.length);
  const binLen = bin.length + binPad;

  const total = 12 + 8 + jsonLen + 8 + binLen;
  const buffer = new ArrayBuffer(total);
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);

  view.setUint32(0, GLB_MAGIC, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, total, true);

  view.setUint32(12, jsonLen, true);
  view.setUint32(16, JSON_CHUNK, true);
  bytes.set(jsonBytes, 20);
  bytes.fill(0x20, 20 + jsonBytes.length, 20 + jsonLen);

  const binChunkStart = 20 + jsonLen;
  view.setUint32(binChunkStart, binLen, true);
  view.setUint32(binChunkStart + 4, BIN_CHUNK, true);
  bytes.set(bin, binChunkStart + 8);

  return buffer;
}

export interface TriangleGlb {
  buffer: ArrayBuffer;
  positions: number[];
  indices: number[];
}

/** Build a GLB holding one untextured, un-normalled triangle. */
export function buildTriangleGlb(): TriangleGlb {
  const positions = [0, 0, 0, 1, 0, 0, 0, 1, 0];
  const indices = [0, 1, 2];

  const positionBytes = new Uint8Array(new Float32Array(positions).buffer);
  const indexBytes = new Uint8Array(new Uint16Array(indices).buffer);
  const bin = new Uint8Array(positionBytes.length + indexBytes.length);
  bin.set(positionBytes, 0);
  bin.set(indexBytes, positionBytes.length);

  const gltf = {
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' },
      { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' },
    ],
    bufferViews: [
      { byteOffset: 0, byteLength: positionBytes.length },
      { byteOffset: positionBytes.length, byteLength: indexBytes.length },
    ],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
  };

  return { buffer: buildGlb(gltf, bin), positions, indices };
}

export interface FakeGl {
  context: WebGLRenderingContext;
  calls: Record<string, unknown[][]>;
  callsTo(name: string): unknown[][];
  /** Per-method return values, overriding the defaults below. */
  overrides: Record<string, () => unknown>;
}

const RETURN_VALUES: Record<string, () => unknown> = {
  createShader: () => ({}),
  createProgram: () => ({}),
  createBuffer: () => ({}),
  createTexture: () => ({}),
  getShaderParameter: () => true,
  getProgramParameter: () => true,
  getAttribLocation: () => 0,
  getUniformLocation: () => ({}),
  getShaderInfoLog: () => '',
  getProgramInfoLog: () => '',
  getExtension: () => ({}),
  getError: () => 0,
};

/** Return a recording stand-in for a WebGL context. */
export function fakeWebGLContext(): FakeGl {
  const calls: Record<string, unknown[][]> = {};
  const overrides: Record<string, () => unknown> = {};
  const constants = new Map<string, number>();

  const target = {} as Record<string, unknown>;
  const context = new Proxy(target, {
    /** Resolve a GL constant or record a method call. */
    get(_target, property: string) {
      if (/^[A-Z0-9_]+$/.test(property)) {
        if (property === 'NO_ERROR') return 0;
        if (!constants.has(property)) constants.set(property, constants.size + 1);
        return constants.get(property);
      }
      return (...args: unknown[]) => {
        (calls[property] ??= []).push(args);
        const producer = overrides[property] ?? RETURN_VALUES[property];
        return producer?.();
      };
    },
  }) as unknown as WebGLRenderingContext;

  return {
    context,
    calls,
    overrides,
    /** Return recorded argument lists for a WebGL method. */
    callsTo: (name: string) => calls[name] ?? [],
  };
}

/** Give the canvas a fake WebGL context and stop the render loop after one frame. */
export function prepareCanvas(canvas: HTMLCanvasElement): FakeGl {
  const gl = fakeWebGLContext();
  vi.spyOn(canvas, 'getContext').mockReturnValue(gl.context as unknown as null);
  vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
  return gl;
}
