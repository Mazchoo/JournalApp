import { parseGlb, computeNormals } from '../rendering-3d/glb-parsing';
import { startRenderingLoop } from '../rendering-3d/rendering-loop';

export { computeNormals };

/** Reveal the canvas and return a WebGL context, or null if WebGL is unavailable. */
function prepareMeshCanvas(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
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
    return null;
  }
  return gl;
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

  const gl = prepareMeshCanvas(canvas);
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
      renderMeshBuffer(canvasElement, e.target!.result as ArrayBuffer, onComplete);
    } catch (err) {
      console.error('GLB render error:', err);
      if (onComplete) onComplete();
    }
  };
  reader.readAsArrayBuffer(inputFile);
}

/** Parse a GLB buffer and draw a rotating mesh preview. */
export function renderGLB(
  canvas: HTMLCanvasElement,
  buffer: ArrayBuffer,
  onComplete?: () => void,
): void {
  renderMeshBuffer(canvas, buffer, onComplete);
}
