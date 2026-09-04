import type { AccessorSlice, Gltf, GltfPrimitive } from "./glb-interface";
import {
  FLOAT,
  GLB_MAGIC,
  TYPE_SIZE,
  UNSIGNED_BYTE,
  UNSIGNED_INT,
  UNSIGNED_SHORT,
} from "./glb-interface";
import type {
  ColorPass,
  IndexBuffer,
  MeshRenderData,
  TexCoordPass,
} from "./render-data-types";
import { computeNormals } from "./vertex-operations";

/** Slice one glTF accessor out of the binary chunk. */
function sliceAccessor(
  gltf: Gltf,
  bin: ArrayBuffer,
  index: number,
): AccessorSlice {
  const acc = gltf.accessors[index]!;
  const bv = gltf.bufferViews[acc.bufferView]!;
  const typeSize = TYPE_SIZE[acc.type];
  const compSize =
    acc.componentType === FLOAT || acc.componentType === UNSIGNED_INT ? 4 : 2;
  const start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
  const bytes = acc.count * typeSize * compSize;
  return { raw: bin.slice(start, start + bytes), acc, typeSize, compSize };
}

/** Read a float accessor as a Float32Array. */
function floatArray(gltf: Gltf, bin: ArrayBuffer, index: number): Float32Array {
  const { raw, acc, typeSize } = sliceAccessor(gltf, bin, index);
  return new Float32Array(raw, 0, acc.count * typeSize);
}

/** Read an index accessor as the matching typed array. */
function indexArray(gltf: Gltf, bin: ArrayBuffer, index: number): IndexBuffer {
  const { raw, acc } = sliceAccessor(gltf, bin, index);
  if (acc.componentType === UNSIGNED_BYTE) return new Uint8Array(raw);
  if (acc.componentType === UNSIGNED_SHORT) return new Uint16Array(raw);
  return new Uint32Array(raw);
}

/** Read colour, UV, and material fields from a primitive into render passes. */
function attributePasses(
  gltf: Gltf,
  bin: ArrayBuffer,
  prim: GltfPrimitive,
): { colorPass: ColorPass; texCoordPass: TexCoordPass; baseColor: number[] } {
  let colorPass: ColorPass = { type: "none" };
  if (prim.attributes["COLOR_0"] !== undefined) {
    colorPass = {
      type: "vertex-color",
      colors: floatArray(gltf, bin, prim.attributes["COLOR_0"]),
    };
  }

  let texCoordPass: TexCoordPass = { type: "none" };
  if (prim.attributes["TEXCOORD_0"] !== undefined) {
    texCoordPass = {
      type: "texcoords",
      texCoords: floatArray(gltf, bin, prim.attributes["TEXCOORD_0"]),
      texture: null,
    };
  }

  let baseColor = [0.8, 0.8, 0.8, 1.0];
  if (
    prim.material !== undefined &&
    gltf.materials &&
    gltf.materials[prim.material]
  ) {
    const mat = gltf.materials[prim.material];
    if (mat.pbrMetallicRoughness) {
      if (mat.pbrMetallicRoughness.baseColorFactor) {
        baseColor = mat.pbrMetallicRoughness.baseColorFactor;
      }
      if (
        mat.pbrMetallicRoughness.baseColorTexture &&
        texCoordPass.type === "texcoords"
      ) {
        const textureIndex = mat.pbrMetallicRoughness.baseColorTexture.index;
        if (gltf.textures && gltf.images) {
          const texture = gltf.textures[textureIndex];
          const image =
            texture !== undefined ? gltf.images[texture.source] : undefined;
          if (image !== undefined && image.bufferView !== undefined) {
            const bv = gltf.bufferViews[image.bufferView]!;
            texCoordPass = {
              ...texCoordPass,
              texture: {
                bytes: new Uint8Array(
                  bin.slice(
                    bv.byteOffset || 0,
                    (bv.byteOffset || 0) + bv.byteLength,
                  ),
                ),
                mimeType: image.mimeType || "image/png",
              },
            };
          }
        }
      }
    }
  }

  return { colorPass, texCoordPass, baseColor };
}

/**
 * Parse a GLB container into render-ready mesh data.
 *
 * Returns null when the buffer is not a GLB or contains no meshes. Other mesh
 * file types should produce the same `MeshRenderData` shape.
 */
export function parseGlb(buffer: ArrayBuffer): MeshRenderData | null {
  const dv = new DataView(buffer);

  if (dv.getUint32(0, true) !== GLB_MAGIC) {
    console.error("Not a valid GLB file");
    return null;
  }

  const jsonLen = dv.getUint32(12, true);
  const gltf = JSON.parse(
    new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen)),
  ) as Gltf;

  const binChunkStart = 20 + jsonLen;
  const binLen = dv.getUint32(binChunkStart, true);
  const bin = buffer.slice(binChunkStart + 8, binChunkStart + 8 + binLen);

  if (!gltf.meshes || !gltf.meshes.length) {
    console.error("No meshes found in GLB");
    return null;
  }

  const prim = gltf.meshes[0]!.primitives[0]!;
  const positions = floatArray(gltf, bin, prim.attributes["POSITION"]!);
  const indices =
    prim.indices !== undefined ? indexArray(gltf, bin, prim.indices) : null;
  const normals =
    prim.attributes["NORMAL"] !== undefined
      ? floatArray(gltf, bin, prim.attributes["NORMAL"])
      : computeNormals(positions, indices);
  const { colorPass, texCoordPass, baseColor } = attributePasses(
    gltf,
    bin,
    prim,
  );

  return { positions, normals, indices, baseColor, colorPass, texCoordPass };
}
