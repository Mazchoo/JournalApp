/** Port of static/JS/entry.mesh.js: a minimal GLB parser and WebGL preview renderer. */

interface GltfAccessor {
  bufferView: number;
  byteOffset?: number;
  componentType: number;
  count: number;
  type: 'SCALAR' | 'VEC2' | 'VEC3' | 'VEC4' | 'MAT4';
}

interface GltfBufferView {
  byteOffset?: number;
  byteLength: number;
}

interface GltfPrimitive {
  attributes: Record<string, number>;
  indices?: number;
  material?: number;
}

interface GltfMaterial {
  pbrMetallicRoughness?: {
    baseColorFactor?: number[];
    baseColorTexture?: { index: number };
  };
}

interface GltfImage {
  bufferView?: number;
  mimeType?: string;
}

interface Gltf {
  accessors: GltfAccessor[];
  bufferViews: GltfBufferView[];
  meshes?: { primitives: GltfPrimitive[] }[];
  materials?: GltfMaterial[];
  textures?: { source: number }[];
  images?: GltfImage[];
}

export function initializeMeshRenderer(
  canvasElement: HTMLCanvasElement,
  inputFile: File,
  onComplete?: () => void,
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      renderGLB(canvasElement, e.target!.result as ArrayBuffer, onComplete);
    } catch (err) {
      console.error('GLB render error:', err);
      if (onComplete) onComplete();
    }
  };
  reader.readAsArrayBuffer(inputFile);
}

export function renderGLB(
  canvas: HTMLCanvasElement,
  buffer: ArrayBuffer,
  onComplete?: () => void,
): void {
  const dv = new DataView(buffer);

  if (dv.getUint32(0, true) !== 0x46546c67) {
    console.error('Not a valid GLB file');
    return;
  }

  // Parse JSON chunk
  const jsonLen = dv.getUint32(12, true);
  const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLen))) as Gltf;

  // Parse binary chunk
  const binChunkStart = 20 + jsonLen;
  const binLen = dv.getUint32(binChunkStart, true);
  const bin = buffer.slice(binChunkStart + 8, binChunkStart + 8 + binLen);

  if (!gltf.meshes || !gltf.meshes.length) {
    console.error('No meshes found in GLB');
    return;
  }

  const prim = gltf.meshes[0].primitives[0];

  function sliceAccessor(index: number): {
    raw: ArrayBuffer;
    acc: GltfAccessor;
    typeSize: number;
    compSize: number;
  } {
    const acc = gltf.accessors[index];
    const bv = gltf.bufferViews[acc.bufferView];
    const typeSize = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 }[acc.type];
    const compSize = acc.componentType === 5126 ? 4 : acc.componentType === 5125 ? 4 : 2;
    const start = (bv.byteOffset || 0) + (acc.byteOffset || 0);
    const bytes = acc.count * typeSize * compSize;
    return { raw: bin.slice(start, start + bytes), acc, typeSize, compSize };
  }

  function floatArray(index: number): Float32Array {
    const { raw, acc, typeSize } = sliceAccessor(index);
    return new Float32Array(raw, 0, acc.count * typeSize);
  }

  function indexArray(index: number): Uint8Array | Uint16Array | Uint32Array {
    const { raw, acc } = sliceAccessor(index);
    if (acc.componentType === 5121) return new Uint8Array(raw);
    if (acc.componentType === 5123) return new Uint16Array(raw);
    return new Uint32Array(raw);
  }

  const positions = floatArray(prim.attributes['POSITION']);
  const hasNormals = prim.attributes['NORMAL'] !== undefined;
  const hasColors = prim.attributes['COLOR_0'] !== undefined;
  const hasTexCoords = prim.attributes['TEXCOORD_0'] !== undefined;
  const indices = prim.indices !== undefined ? indexArray(prim.indices) : null;

  let normals: Float32Array;
  if (hasNormals) {
    normals = floatArray(prim.attributes['NORMAL']);
  } else {
    normals = computeNormals(positions, indices);
  }

  let colors: Float32Array | null = null;
  if (hasColors) {
    colors = floatArray(prim.attributes['COLOR_0']);
  }

  let texCoords: Float32Array | null = null;
  if (hasTexCoords) {
    texCoords = floatArray(prim.attributes['TEXCOORD_0']);
  }

  // Get material base color and texture if available
  let baseColor = [0.8, 0.8, 0.8, 1.0];
  let textureIndex: number | null = null;
  if (prim.material !== undefined && gltf.materials && gltf.materials[prim.material]) {
    const mat = gltf.materials[prim.material];
    if (mat.pbrMetallicRoughness) {
      if (mat.pbrMetallicRoughness.baseColorFactor) {
        baseColor = mat.pbrMetallicRoughness.baseColorFactor;
      }
      if (mat.pbrMetallicRoughness.baseColorTexture) {
        textureIndex = mat.pbrMetallicRoughness.baseColorTexture.index;
      }
    }
  }

  // Center and scale
  let minX = Infinity;
  let minY = Infinity;
  let minZ = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < positions.length; i += 3) {
    minX = Math.min(minX, positions[i]);
    maxX = Math.max(maxX, positions[i]);
    minY = Math.min(minY, positions[i + 1]);
    maxY = Math.max(maxY, positions[i + 1]);
    minZ = Math.min(minZ, positions[i + 2]);
    maxZ = Math.max(maxZ, positions[i + 2]);
  }
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const cz = (minZ + maxZ) / 2;
  const sc = 2 / Math.max(maxX - minX, maxY - minY, maxZ - minZ, 0.001);
  const pos = new Float32Array(positions.length);
  for (let i = 0; i < positions.length; i += 3) {
    pos[i] = (positions[i] - cx) * sc;
    pos[i + 1] = (positions[i + 1] - cy) * sc;
    pos[i + 2] = (positions[i + 2] - cz) * sc;
  }

  // Setup canvas + WebGL - ensure it's visible
  canvas.style.visibility = 'visible';
  canvas.style.height = '400px';
  canvas.style.display = 'block';
  canvas.style.opacity = '1';
  canvas.style.position = 'relative';
  canvas.style.zIndex = '10';

  canvas.width = canvas.clientWidth || 800;
  canvas.height = 400;

  const gl = (canvas.getContext('webgl') ??
    canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
  if (!gl) {
    console.error('WebGL not supported');
    return;
  }

  if (indices instanceof Uint32Array) {
    gl.getExtension('OES_element_index_uint');
  }

  const vs = `
        attribute vec3 aPos;
        attribute vec3 aNorm;
        ${hasColors ? 'attribute vec3 aColor;' : ''}
        ${hasTexCoords ? 'attribute vec2 aTexCoord;' : ''}
        uniform mat4 uMVP;
        varying vec3 vNorm;
        ${hasColors ? 'varying vec3 vColor;' : ''}
        ${hasTexCoords ? 'varying vec2 vTexCoord;' : ''}
        void main() {
            vNorm = aNorm;
            ${hasColors ? 'vColor = aColor;' : ''}
            ${hasTexCoords ? 'vTexCoord = aTexCoord;' : ''}
            gl_Position = uMVP * vec4(aPos, 1.0);
        }
    `;
  const fs = `
        precision mediump float;
        varying vec3 vNorm;
        ${hasColors ? 'varying vec3 vColor;' : ''}
        ${hasTexCoords ? 'varying vec2 vTexCoord;' : ''}
        uniform vec4 uBaseColor;
        ${hasTexCoords && textureIndex !== null ? 'uniform sampler2D uTexture;' : ''}
        void main() {
            vec3 n = normalize(vNorm);
            float d = max(dot(n, normalize(vec3(1.0, 2.0, 3.0))), 0.0);
            vec3 color = uBaseColor.rgb;
            ${hasTexCoords && textureIndex !== null ? 'color *= texture2D(uTexture, vTexCoord).rgb;' : ''}
            ${hasColors ? 'color *= vColor;' : ''}
            gl_FragColor = vec4(color * (0.3 + 0.7 * d), uBaseColor.a);
        }
    `;

  function mkShader(type: number, src: string): WebGLShader {
    const s = gl!.createShader(type)!;
    gl!.shaderSource(s, src);
    gl!.compileShader(s);
    if (!gl!.getShaderParameter(s, gl!.COMPILE_STATUS)) {
      console.error('Shader compile error:', gl!.getShaderInfoLog(s));
    }
    return s;
  }

  const prog = gl.createProgram()!;
  gl.attachShader(prog, mkShader(gl.VERTEX_SHADER, vs));
  gl.attachShader(prog, mkShader(gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error('Program link error:', gl.getProgramInfoLog(prog));
    return;
  }
  gl.useProgram(prog);

  function upload(data: Float32Array): WebGLBuffer {
    const buf = gl!.createBuffer()!;
    gl!.bindBuffer(gl!.ARRAY_BUFFER, buf);
    gl!.bufferData(gl!.ARRAY_BUFFER, data, gl!.STATIC_DRAW);
    return buf;
  }

  const posAttr = gl.getAttribLocation(prog, 'aPos');
  const posBuf = upload(pos);
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(posAttr);
  gl.vertexAttribPointer(posAttr, 3, gl.FLOAT, false, 0, 0);

  const normAttr = gl.getAttribLocation(prog, 'aNorm');
  const normBuf = upload(normals);
  gl.bindBuffer(gl.ARRAY_BUFFER, normBuf);
  gl.enableVertexAttribArray(normAttr);
  gl.vertexAttribPointer(normAttr, 3, gl.FLOAT, false, 0, 0);

  if (hasColors && colors) {
    const colorAttr = gl.getAttribLocation(prog, 'aColor');
    const colorBuf = upload(colors);
    gl.bindBuffer(gl.ARRAY_BUFFER, colorBuf);
    gl.enableVertexAttribArray(colorAttr);
    gl.vertexAttribPointer(colorAttr, 3, gl.FLOAT, false, 0, 0);
  }

  if (hasTexCoords && texCoords) {
    const texCoordAttr = gl.getAttribLocation(prog, 'aTexCoord');
    const texCoordBuf = upload(texCoords);
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuf);
    gl.enableVertexAttribArray(texCoordAttr);
    gl.vertexAttribPointer(texCoordAttr, 2, gl.FLOAT, false, 0, 0);
  }

  if (indices) {
    const ibo = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  }

  const uMVP = gl.getUniformLocation(prog, 'uMVP');
  const uBaseColor = gl.getUniformLocation(prog, 'uBaseColor');

  if (uBaseColor) {
    gl.uniform4fv(uBaseColor, baseColor);
  }

  // Load texture if available
  if (hasTexCoords && textureIndex !== null && gltf.textures && gltf.images) {
    const texture = gltf.textures[textureIndex];
    const image = gltf.images[texture.source];

    if (image.bufferView !== undefined) {
      const bv = gltf.bufferViews[image.bufferView];
      const imageData = new Uint8Array(bin, bv.byteOffset || 0, bv.byteLength);
      const blob = new Blob([imageData], { type: image.mimeType || 'image/png' });
      const url = URL.createObjectURL(blob);

      const img = new Image();
      img.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        const uTexture = gl.getUniformLocation(prog, 'uTexture');
        gl.uniform1i(uTexture, 0);

        URL.revokeObjectURL(url);
      };
      img.src = url;
    }
  }

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.clearColor(0.94, 0.94, 0.94, 1.0);
  gl.viewport(0, 0, canvas.width, canvas.height);

  const asp = canvas.width / canvas.height;
  const fv = Math.PI / 4;
  const nr = 0.1;
  const fr = 100;
  const f = 1 / Math.tan(fv / 2);
  const di = 1 / (nr - fr);
  const proj = new Float32Array([
    f / asp, 0, 0, 0,
    0, f, 0, 0,
    0, 0, (nr + fr) * di, -1,
    0, 0, 2 * nr * fr * di, 0,
  ]);

  let angle = 0;

  function mvpMatrix(a: number): Float32Array {
    const c = Math.cos(a);
    const s = Math.sin(a);
    // column-major model-view: Y-rotation + translate z=-3
    const mv = new Float32Array([
      c, 0, -s, 0,
      0, 1, 0, 0,
      s, 0, c, 0,
      0, 0, -3, 1,
    ]);
    // proj * mv
    const r = new Float32Array(16);
    for (let col = 0; col < 4; col++) {
      for (let row = 0; row < 4; row++) {
        let sum = 0;
        for (let k = 0; k < 4; k++) sum += proj[row + k * 4] * mv[k + col * 4];
        r[row + col * 4] = sum;
      }
    }
    return r;
  }

  let firstFrame = true;
  function draw(): void {
    angle += 0.01;
    gl!.clear(gl!.COLOR_BUFFER_BIT | gl!.DEPTH_BUFFER_BIT);
    gl!.uniformMatrix4fv(uMVP, false, mvpMatrix(angle));
    if (indices) {
      const itype =
        indices instanceof Uint16Array
          ? gl!.UNSIGNED_SHORT
          : indices instanceof Uint8Array
            ? gl!.UNSIGNED_BYTE
            : gl!.UNSIGNED_INT;
      gl!.drawElements(gl!.TRIANGLES, indices.length, itype, 0);
    } else {
      gl!.drawArrays(gl!.TRIANGLES, 0, pos.length / 3);
    }

    if (firstFrame) {
      firstFrame = false;
      const err = gl!.getError();
      if (err !== gl!.NO_ERROR) {
        console.error('WebGL error after first draw:', err);
      }
      if (onComplete) onComplete();
    }

    requestAnimationFrame(draw);
  }

  draw();
}

export function computeNormals(
  positions: Float32Array,
  indices: Uint8Array | Uint16Array | Uint32Array | null,
): Float32Array {
  const norms = new Float32Array(positions.length);
  const triCount = indices ? indices.length / 3 : positions.length / 9;

  for (let t = 0; t < triCount; t++) {
    const v0 = indices ? indices[t * 3] * 3 : t * 9;
    const v1 = indices ? indices[t * 3 + 1] * 3 : t * 9 + 3;
    const v2 = indices ? indices[t * 3 + 2] * 3 : t * 9 + 6;

    const ax = positions[v1] - positions[v0];
    const ay = positions[v1 + 1] - positions[v0 + 1];
    const az = positions[v1 + 2] - positions[v0 + 2];
    const bx = positions[v2] - positions[v0];
    const by = positions[v2 + 1] - positions[v0 + 1];
    const bz = positions[v2 + 2] - positions[v0 + 2];
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
    const len = Math.sqrt(norms[i] * norms[i] + norms[i + 1] * norms[i + 1] + norms[i + 2] * norms[i + 2]);
    if (len > 0) {
      norms[i] /= len;
      norms[i + 1] /= len;
      norms[i + 2] /= len;
    }
  }

  return norms;
}
