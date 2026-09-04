/**
 * glTF JSON shapes and GLB numeric constants used by the parser.
 * Parsing lives in `glb-parsing.ts`.
 */

/** glTF component type: FLOAT. */
export const FLOAT = 5126;
/** glTF component type: UNSIGNED_BYTE. */
export const UNSIGNED_BYTE = 5121;
/** glTF component type: UNSIGNED_SHORT. */
export const UNSIGNED_SHORT = 5123;
/** glTF component type: UNSIGNED_INT. */
export const UNSIGNED_INT = 5125;

export const GLB_MAGIC = 0x46546c67;

export const TYPE_SIZE = {
  SCALAR: 1,
  VEC2: 2,
  VEC3: 3,
  VEC4: 4,
  MAT4: 16,
} as const;

export interface GltfAccessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: keyof typeof TYPE_SIZE;
}

export interface GltfBufferView {
  byteOffset?: number;
  byteLength: number;
}

export interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
}

export interface GltfMaterial {
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: { index: number };
  };
}

export interface GltfImage {
  bufferView?: number;
  mimeType?: string;
}

export interface Gltf {
  accessors: GltfAccessor[];
  bufferViews: GltfBufferView[];
  meshes?: { primitives: GltfPrimitive[] }[];
  materials?: GltfMaterial[];
  textures?: { source: number }[];
  images?: GltfImage[];
}

export interface AccessorSlice {
  raw: ArrayBuffer;
  acc: GltfAccessor;
  typeSize: number;
  compSize: number;
}
