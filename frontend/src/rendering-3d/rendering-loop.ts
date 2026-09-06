import {
  centerAndScalePositions,
  createMvpMatrix,
  createOrbitCamera,
  createProjectionMatrix,
  type OrbitCamera,
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
 * texture decodes, or in response to pointer, keyboard, or resize input.
 *
 * `onResize` should match the canvas drawing buffer to its layout size.
 * Works on `MeshRenderData` from any parser. Calls `onComplete` after the first frame.
 * `camera` is reused when provided so a mesh has one orbit state.
 * `onUserViewChange` runs after pointer or keyboard camera edits, not resize.
 */
export function startRenderingLoop(
  gl: WebGLRenderingContext,
  canvas: HTMLCanvasElement,
  mesh: MeshRenderData,
  onComplete?: () => void,
  onResize?: () => void,
  camera: OrbitCamera = createOrbitCamera(),
  onUserViewChange?: () => void,
): { notifyResize: () => void; camera: OrbitCamera; redraw: () => void } {
  const prepared: MeshRenderData = {
    ...mesh,
    positions: centerAndScalePositions(mesh.positions),
  };
  const cog = computeCenterOfGravity(prepared.positions);

  let onTextureReady = (): void => {};
  const shaders = createShaders(gl, prepared, () => {
    onTextureReady();
  });
  if (shaders === null) {
    return { notifyResize: () => {}, camera, redraw: () => {} };
  }
  const { uMVP } = shaders;

  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LESS);
  gl.clearColor(0.94, 0.94, 0.94, 1.0);

  let projection = createProjectionMatrix(1);

  /** Point the viewport and projection at the current drawing-buffer size. */
  function fitProjection(): void {
    gl.viewport(0, 0, canvas.width, canvas.height);
    projection = createProjectionMatrix(
      canvas.width / Math.max(canvas.height, 1),
    );
  }

  fitProjection();
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

  /** Sync the drawing buffer, then rebuild the projection if the size changed. */
  function notifyResize(): void {
    const prevWidth = canvas.width;
    const prevHeight = canvas.height;
    onResize?.();
    if (canvas.width === prevWidth && canvas.height === prevHeight) return;
    fitProjection();
    draw();
  }

  onTextureReady = draw;
  bindCameraControls(
    canvas,
    camera,
    () => {
      draw();
      onUserViewChange?.();
    },
    notifyResize,
  );
  requestAnimationFrame(draw);
  return { notifyResize, camera, redraw: draw };
}
