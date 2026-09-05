import {
  centerAndScalePositions,
  createMvpMatrix,
  createOrbitCamera,
  createProjectionMatrix,
} from "./create-camera-matrix";
import { bindCameraControls } from "./event-handling";
import { createShaders } from "./create-shaders";
import type { MeshRenderData } from "./render-data-types";
import { computeCenterOfGravity } from "./vertex-operations";

/** WebGL type constant for an index buffer. */
function indexComponentType(
  gl: WebGLRenderingContext,
  indices: Uint8Array | Uint16Array | Uint32Array,
): number {
  if (indices instanceof Uint16Array) return gl.UNSIGNED_SHORT;
  if (indices instanceof Uint8Array) return gl.UNSIGNED_BYTE;
  return gl.UNSIGNED_INT;
}

/**
 * Upload a mesh and draw it. Further frames are drawn when an embedded
 * texture decodes, or in response to pointer and keyboard input.
 *
 * Works on `MeshRenderData` from any parser. Calls `onComplete` after the first frame.
 */
export function startRenderingLoop(
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  mesh: MeshRenderData,
  onComplete?: () => void,
): void {
  const prepared: MeshRenderData = {
    ...mesh,
    positions: centerAndScalePositions(mesh.positions),
  };
  const cog = computeCenterOfGravity(prepared.positions);
  const camera = createOrbitCamera();

  let onTextureReady = (): void => {};
  const shaders = createShaders(gl, prepared, () => {
    onTextureReady();
  });
  if (shaders === null) return;
  const { uMVP } = shaders;

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.clearColor(0.94, 0.94, 0.94, 1.0);
  gl.viewport(0, 0, canvas.width, canvas.height);

  const projection = createProjectionMatrix(canvas.width / canvas.height);
  let firstFrame = true;

  /** Draw the mesh with the current camera. */
  function draw(): void {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uMVP, false, createMvpMatrix(projection, camera, cog));
    if (prepared.indices) {
      gl.drawElements(
        gl.TRIANGLES,
        prepared.indices.length,
        indexComponentType(gl, prepared.indices),
        0,
      );
    } else {
      gl.drawArrays(gl.TRIANGLES, 0, prepared.positions.length / 3);
    }

    if (firstFrame) {
      firstFrame = false;
      const err = gl.getError();
      if (err !== gl.NO_ERROR) {
        console.error("WebGL error after first draw:", err);
      }
      if (onComplete) onComplete();
    }
  }

  onTextureReady = draw;
  bindCameraControls(canvas, camera, draw);
  requestAnimationFrame(draw);
}
