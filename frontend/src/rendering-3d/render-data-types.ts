/**
 * Binary geometry the 3D renderer consumes.
 *
 * File parsers (GLB today, other formats later) must produce this shape so the
 * camera, shaders, and render loop stay format-agnostic.
 */

/** Index buffer matching a glTF-style unsigned component type. */
export type IndexBuffer = Uint8Array | Uint16Array | Uint32Array;

/** Image bytes embedded in a mesh file, ready to decode into a WebGL texture. */
export interface EmbeddedTexture {
  bytes: Uint8Array<ArrayBuffer>;
  mimeType: string;
}

/**
 * Per-vertex colour pass.
 *
 * `vertex-color` means the fragment shader multiplies lighting by a colour
 * attribute. `none` means shading uses only the material base colour (and an
 * optional texture).
 */
export type ColorPass =
  | { readonly type: "vertex-color"; readonly colors: Float32Array }
  | { readonly type: "none" };

/**
 * Optional texture-coordinate pass.
 *
 * Present when the mesh has UVs. `texture` is the embedded image to sample, if any.
 */
export type TexCoordPass =
  | {
      readonly type: "texcoords";
      readonly texCoords: Float32Array;
      readonly texture: EmbeddedTexture | null;
    }
  | { readonly type: "none" };

/** Render-ready mesh produced by any file parser. */
export interface MeshRenderData {
  positions: Float32Array;
  normals: Float32Array;
  indices: IndexBuffer | null;
  /** RGBA material base colour, defaulting to grey when the file has none. */
  baseColor: number[];
  colorPass: ColorPass;
  texCoordPass: TexCoordPass;
}
