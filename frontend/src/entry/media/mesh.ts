import { MediaEntry } from "../../components/media-entry";
import {
  MESH_CANVAS_REVEAL_STYLE,
  MESH_FRAME_JPEG_QUALITY,
} from "../../display-config";
import { parseGlb } from "../../rendering-3d/glb-parsing";
import { computeNormals } from "../../rendering-3d/vertex-operations";
import { startRenderingLoop } from "../../rendering-3d/rendering-loop";
import { enableSaveButton } from "../save";

export { computeNormals };

/**
 * Size the canvas and return a WebGL context.
 * Returns null when WebGL is unavailable. Does not hide sibling media.
 * `preserveDrawingBuffer` keeps the last frame readable for snapshots.
 */
function prepareWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
  Object.assign(canvas.style, MESH_CANVAS_REVEAL_STYLE);
  MediaEntry.syncCanvasSize(canvas);

  const contextAttributes: WebGLContextAttributes = {
    preserveDrawingBuffer: true,
  };
  const gl = (canvas.getContext("webgl", contextAttributes) ??
    canvas.getContext(
      "experimental-webgl",
      contextAttributes,
    )) as WebGLRenderingContext | null;
  if (!gl) {
    console.error("WebGL not supported");
    return null;
  }
  return gl;
}

/**
 * Encode the canvas's current pixels as a JPEG data URL.
 * Returns null when encoding fails.
 */
function canvasAsJpegBase64(canvas: HTMLCanvasElement): Promise<string | null> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob === null) {
          console.error("mesh: canvas JPEG encode failed");
          resolve(null);
          return;
        }
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result;
          if (typeof result !== "string") {
            console.error("mesh: canvas JPEG encode failed");
            resolve(null);
            return;
          }
          resolve(result);
        };
        reader.onerror = () => {
          console.error("mesh: canvas JPEG encode failed");
          resolve(null);
        };
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      MESH_FRAME_JPEG_QUALITY,
    );
  });
}

/**
 * Parse mesh bytes and start the shared WebGL preview.
 *
 * Other file types would be dispatched here; they must produce `MeshRenderData`
 * so the camera, shaders, and render loop stay unchanged.
 */
function renderMeshBuffer(
  canvas: HTMLCanvasElement,
  buffer: ArrayBuffer,
  onComplete?: () => void,
): void {
  const mesh = parseGlb(buffer);
  if (mesh === null) return;

  const gl = prepareWebGL(canvas);
  if (gl === null) return;

  const preview = startRenderingLoop(gl, canvas, mesh, onComplete, () => {
    MediaEntry.syncCanvasSize(canvas);
  });
  MediaEntry.watchCanvasSize(canvas, preview.notifyResize);
}

/** Read a mesh file and start the WebGL preview on the canvas. */
export function initializeMeshRenderer(
  canvasElement: HTMLCanvasElement,
  inputFile: File,
  onComplete?: () => void,
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      renderMeshBuffer(
        canvasElement,
        e.target!.result as ArrayBuffer,
        onComplete,
      );
    } catch (err) {
      console.error("GLB render error:", err);
      if (onComplete) onComplete();
    }
  };
  reader.readAsArrayBuffer(inputFile);
}

/**
 * Call target for `loadMeshResource`. Tests stub this to skip WebGL without
 * mocking the whole module (same-file calls would ignore that mock).
 */
export const meshPreview = {
  initialize: initializeMeshRenderer,
};

/** Parse a GLB buffer and draw an interactive mesh preview. */
export function renderGLB(
  canvas: HTMLCanvasElement,
  buffer: ArrayBuffer,
  onComplete?: () => void,
): void {
  renderMeshBuffer(canvas, buffer, onComplete);
}

/** Encode the canvas's current frame as a JPEG data URL. */
export async function currentFrameAsJpegBase64(
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  return canvasAsJpegBase64(canvas);
}

/** Hide 2D media and start a GLB preview on the canvas. */
export function loadMeshResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null || media.canvas === null) {
    console.error("Canvas element not found for contentId:", contentId);
    return;
  }

  MediaEntry.hideImage(media);
  MediaEntry.hideVideo(media);

  if (!MediaEntry.showCanvas(media)) return;
  meshPreview.initialize(media.canvas, inputFile, () => {
    enableSaveButton();
  });
}
