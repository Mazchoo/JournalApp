import type { MeshRenderData } from "./render-data-types";

export interface MeshShaderProgram {
  program: WebGLProgram;
  uMVP: WebGLUniformLocation | null;
}

/** Compile a WebGL shader and log compile errors. */
function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  src: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
  }
  return shader;
}

/** Vertex shader: position, normal, and optional colour / UV attributes. */
function vertexShaderSource(hasColors: boolean, hasTexCoords: boolean): string {
  return `
        attribute vec3 aPos;
        attribute vec3 aNorm;
        ${hasColors ? "attribute vec3 aColor;" : ""}
        ${hasTexCoords ? "attribute vec2 aTexCoord;" : ""}
        uniform mat4 uMVP;
        varying vec3 vNorm;
        ${hasColors ? "varying vec3 vColor;" : ""}
        ${hasTexCoords ? "varying vec2 vTexCoord;" : ""}
        void main() {
            vNorm = aNorm;
            ${hasColors ? "vColor = aColor;" : ""}
            ${hasTexCoords ? "vTexCoord = aTexCoord;" : ""}
            gl_Position = uMVP * vec4(aPos, 1.0);
        }
    `;
}

/** Fragment shader: Lambert lighting, optional texture and vertex colour. */
function fragmentShaderSource(
  hasColors: boolean,
  hasTexCoords: boolean,
  sampleTexture: boolean,
): string {
  return `
        precision mediump float;
        varying vec3 vNorm;
        ${hasColors ? "varying vec3 vColor;" : ""}
        ${hasTexCoords ? "varying vec2 vTexCoord;" : ""}
        uniform vec4 uBaseColor;
        ${sampleTexture ? "uniform sampler2D uTexture;" : ""}
        void main() {
            vec3 n = normalize(vNorm);
            float d = max(dot(n, normalize(vec3(1.0, 2.0, 3.0))), 0.0);
            vec3 color = uBaseColor.rgb;
            ${sampleTexture ? "color *= texture2D(uTexture, vTexCoord).rgb;" : ""}
            ${hasColors ? "color *= vColor;" : ""}
            gl_FragColor = vec4(color * (0.3 + 0.7 * d), uBaseColor.a);
        }
    `;
}

/** Upload vertex data into a new ARRAY_BUFFER. */
function upload(gl: WebGLRenderingContext, data: Float32Array): WebGLBuffer {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
  return buf;
}

/** Bind a float vertex attribute from a freshly uploaded buffer. */
function bindFloatAttribute(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  name: string,
  data: Float32Array,
  size: number,
): void {
  const location = gl.getAttribLocation(program, name);
  upload(gl, data);
  gl.enableVertexAttribArray(location);
  gl.vertexAttribPointer(location, size, gl.FLOAT, false, 0, 0);
}

/** Decode an embedded image and bind it as TEXTURE0. */
function loadEmbeddedTexture(
  gl: WebGLRenderingContext,
  program: WebGLProgram,
  bytes: Uint8Array<ArrayBuffer>,
  mimeType: string,
): void {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
    gl.texParameteri(
      gl.TEXTURE_2D,
      gl.TEXTURE_MIN_FILTER,
      gl.LINEAR_MIPMAP_LINEAR,
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    const uTexture = gl.getUniformLocation(program, "uTexture");
    gl.uniform1i(uTexture, 0);

    URL.revokeObjectURL(url);
  };
  img.src = url;
}

/**
 * Compile shaders for the mesh's attribute passes, upload buffers, and set uniforms.
 *
 * Returns null when the program fails to link.
 */
export function createShaders(
  gl: WebGLRenderingContext,
  mesh: MeshRenderData,
): MeshShaderProgram | null {
  const hasColors = mesh.colorPass.type === "vertex-color";
  const hasTexCoords = mesh.texCoordPass.type === "texcoords";
  const texture =
    mesh.texCoordPass.type === "texcoords" ? mesh.texCoordPass.texture : null;
  const sampleTexture = hasTexCoords && texture !== null;

  if (mesh.indices instanceof Uint32Array) {
    gl.getExtension("OES_element_index_uint");
  }

  const program = gl.createProgram()!;
  gl.attachShader(
    program,
    compileShader(
      gl,
      gl.VERTEX_SHADER,
      vertexShaderSource(hasColors, hasTexCoords),
    ),
  );
  gl.attachShader(
    program,
    compileShader(
      gl,
      gl.FRAGMENT_SHADER,
      fragmentShaderSource(hasColors, hasTexCoords, sampleTexture),
    ),
  );
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    return null;
  }
  gl.useProgram(program);

  bindFloatAttribute(gl, program, "aPos", mesh.positions, 3);
  bindFloatAttribute(gl, program, "aNorm", mesh.normals, 3);

  if (mesh.colorPass.type === "vertex-color") {
    bindFloatAttribute(gl, program, "aColor", mesh.colorPass.colors, 3);
  }

  if (mesh.texCoordPass.type === "texcoords") {
    bindFloatAttribute(
      gl,
      program,
      "aTexCoord",
      mesh.texCoordPass.texCoords,
      2,
    );
  }

  if (mesh.indices) {
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
  }

  const uMVP = gl.getUniformLocation(program, "uMVP");
  const uBaseColor = gl.getUniformLocation(program, "uBaseColor");
  if (uBaseColor) {
    gl.uniform4fv(uBaseColor, mesh.baseColor);
  }

  if (sampleTexture && texture !== null) {
    loadEmbeddedTexture(gl, program, texture.bytes, texture.mimeType);
  }

  return { program, uMVP };
}
