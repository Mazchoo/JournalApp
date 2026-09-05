import { MediaEntry } from "../../components/media-entry";
import { parseGlb } from "../../rendering-3d/glb-parsing";
import { computeNormals } from "../../rendering-3d/vertex-operations";
import { startRenderingLoop } from "../../rendering-3d/rendering-loop";
import { enableSaveButton } from "../save";

export { computeNormals };

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

  const gl = MediaEntry.prepareWebGL(canvas);
  if (gl === null) return;

  startRenderingLoop(gl, canvas, mesh, onComplete);
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
  return MediaEntry.canvasAsJpegBase64(canvas);
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
