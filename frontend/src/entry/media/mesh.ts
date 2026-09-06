import { MediaEntry } from "../../components/media-entry";
import {
  MESH_CANVAS_FALLBACK_WIDTH_PX,
  MESH_CANVAS_REVEAL_STYLE,
  MESH_FALLBACK_ASPECT_RATIO,
  MESH_FRAME_JPEG_QUALITY,
  MESH_VIEW_SNAPSHOT_DEBOUNCE_MS,
  meshModalRevealStyle,
  type MeshCanvasRevealStyle,
} from "../../display-config";
import type { MeshSavePayload } from "../../request-interface";
import type { JsonErrorResponse } from "../../response-interface";
import {
  createOrbitCamera,
  type OrbitCamera,
} from "../../rendering-3d/create-camera-matrix";
import { parseGlb } from "../../rendering-3d/glb-parsing";
import { computeNormals } from "../../rendering-3d/vertex-operations";
import { startRenderingLoop } from "../../rendering-3d/rendering-loop";
import { dateSlug } from "../../runtime/backend-variables";
import { requestFullMesh } from "../make-request";
import { enableSaveButton } from "../save";

/** Canvas styles accepted by the inline preview and the full-mesh modal. */
type MeshRevealStyle = MeshCanvasRevealStyle;

/** Uploaded GLB files keyed by media row, used when the server copy is missing. */
const uploadedMeshFiles = new Map<string, File>();

export { computeNormals };

/** One orbit camera per mesh row, shared by the inline canvas and the modal. */
const cameras = new Map<string, OrbitCamera>();

/** Latest JPEG frame for each mesh row. */
const lastFrames = new Map<string, string>();

/** Mesh rows whose preview must be sent on the next save. */
const dirtyFrames = new Set<string>();

/** Redraw callbacks for every live canvas of a mesh row. */
const meshRedraws = new Map<string, Map<HTMLCanvasElement, () => void>>();

/** Debounced thumbnail capture after a view edit. */
const pendingSnapshots = new Map<
  string,
  { canvas: HTMLCanvasElement; timer: number }
>();

/** Optional camera and view-change wiring for a mesh preview. */
export interface MeshViewOptions {
  camera?: OrbitCamera;
  onUserViewChange?: () => void;
  index?: string;
}

/**
 * Size the canvas and return a WebGL context.
 * Returns null when WebGL is unavailable. Does not hide sibling media.
 * `preserveDrawingBuffer` keeps the last frame readable for snapshots.
 */
function prepareWebGL(
  canvas: HTMLCanvasElement,
  revealStyle: MeshRevealStyle = MESH_CANVAS_REVEAL_STYLE,
): WebGLRenderingContext | null {
  Object.assign(canvas.style, revealStyle);
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
  revealStyle: MeshRevealStyle = MESH_CANVAS_REVEAL_STYLE,
  view: MeshViewOptions = {},
): void {
  const mesh = parseGlb(buffer);
  if (mesh === null) return;

  const gl = prepareWebGL(canvas, revealStyle);
  if (gl === null) return;

  const camera =
    view.camera ??
    (view.index !== undefined ? meshCamera(view.index) : createOrbitCamera());
  const preview = startRenderingLoop(
    gl,
    canvas,
    mesh,
    onComplete,
    () => {
      MediaEntry.syncCanvasSize(canvas);
    },
    camera,
    view.onUserViewChange,
  );
  if (view.index !== undefined) {
    setMeshCamera(view.index, preview.camera);
    registerMeshRedraw(view.index, canvas, preview.redraw);
  }
  MediaEntry.watchCanvasSize(canvas, preview.notifyResize);
}

/** Read a mesh file and start the WebGL preview on the canvas. */
export function initializeMeshRenderer(
  canvasElement: HTMLCanvasElement,
  inputFile: File,
  onComplete?: () => void,
  revealStyle?: MeshRevealStyle,
  view?: MeshViewOptions,
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      renderMeshBuffer(
        canvasElement,
        e.target!.result as ArrayBuffer,
        onComplete,
        revealStyle,
        view,
      );
    } catch (err) {
      console.error("GLB render error:", err);
      if (onComplete) onComplete();
    }
  };
  reader.readAsArrayBuffer(inputFile);
}

/** Parse a GLB buffer and draw an interactive mesh preview. */
export function renderGLB(
  canvas: HTMLCanvasElement,
  buffer: ArrayBuffer,
  onComplete?: () => void,
  revealStyle?: MeshRevealStyle,
  view?: MeshViewOptions,
): void {
  renderMeshBuffer(canvas, buffer, onComplete, revealStyle, view);
}

/**
 * Call target for `loadMeshResource` and `getFullMesh`. Tests stub this to
 * skip WebGL without mocking the whole module.
 */
export const meshPreview = {
  initialize: initializeMeshRenderer,
  render: renderGLB,
};

/** Read a BlobPart from `requestFullMesh` as an ArrayBuffer. */
function blobAsArrayBuffer(data: BlobPart): Promise<ArrayBuffer> {
  const blob = data instanceof Blob ? data : new Blob([data]);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error("Failed to read mesh blob"));
    };
    reader.readAsArrayBuffer(blob);
  });
}

/** Log a failed full-mesh request the same way video zoom does. */
function logFullMeshError(
  jqXhr: { responseJSON?: JsonErrorResponse },
  errorThrown: string,
): void {
  const responseJSON = jqXhr.responseJSON;
  if (responseJSON && "error" in responseJSON) {
    console.log(`Mesh error : ${responseJSON["error"]}`);
  } else {
    console.log(`Unknown error : ${errorThrown}`);
  }
}

/**
 * Fetch the full GLB and draw it on `canvas`.
 * Falls back to a locally uploaded file when the server request fails.
 */
export function getFullMesh(
  fileName: string,
  canvas: HTMLCanvasElement,
  contentId?: string,
  aspectRatio: number = MESH_FALLBACK_ASPECT_RATIO,
): void {
  const localFile =
    contentId !== undefined ? uploadedMeshFiles.get(contentId) : undefined;
  const width = canvas.clientWidth || MESH_CANVAS_FALLBACK_WIDTH_PX;
  const revealStyle = meshModalRevealStyle(aspectRatio, width);

  requestFullMesh(
    {
      file: fileName,
      name: dateSlug(),
    },
    {
      success: (response) => {
        void blobAsArrayBuffer(response).then((buffer) => {
          meshPreview.render(
            canvas,
            buffer,
            undefined,
            revealStyle,
            meshViewOptions(contentId, canvas),
          );
        });
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        logFullMeshError(jqXhr, errorThrown);
        if (localFile === undefined) return;
        meshPreview.initialize(
          canvas,
          localFile,
          undefined,
          revealStyle,
          meshViewOptions(contentId, canvas),
        );
      },
    },
  );
}

/** Encode the canvas's current frame as a JPEG data URL. */
export async function currentFrameAsJpegBase64(
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  return canvasAsJpegBase64(canvas);
}

/** Return the shared orbit camera for a mesh row, creating one if needed. */
export function meshCamera(index: string): OrbitCamera {
  const existing = cameras.get(index);
  if (existing !== undefined) return existing;
  const camera = createOrbitCamera();
  cameras.set(index, camera);
  return camera;
}

/** Return the shared orbit camera for a mesh row, or undefined. */
export function getMeshCamera(index: string): OrbitCamera | undefined {
  return cameras.get(index);
}

/** Remember the orbit camera for a mesh row. */
export function setMeshCamera(index: string, camera: OrbitCamera): void {
  cameras.set(index, camera);
}

/** Drop the shared camera, frame, and redraws for a removed mesh row. */
export function forgetMeshView(index: string): void {
  cameras.delete(index);
  lastFrames.delete(index);
  dirtyFrames.delete(index);
  meshRedraws.delete(index);
  const pending = pendingSnapshots.get(index);
  if (pending !== undefined) {
    window.clearTimeout(pending.timer);
    pendingSnapshots.delete(index);
  }
}

/** Mark the mesh preview as changed so the next save includes the JPEG. */
export function markMeshFrameDirty(index: string): void {
  dirtyFrames.add(index);
}

/** After a successful save, later saves omit the JPEG unless the view changes again. */
export function clearDirtyMeshFrames(): void {
  dirtyFrames.clear();
}

/** Whether this mesh still needs its preview JPEG in the save payload. */
function shouldSendMeshFrame(index: string): boolean {
  return dirtyFrames.has(index);
}

/** Whether a mesh row has a camera and, if needed, a frame that can be saved. */
export function canSerializeMesh(media: MediaEntry): boolean {
  if (getMeshCamera(media.index) === undefined) return false;
  if (!shouldSendMeshFrame(media.index)) return true;
  if (lastFrames.has(media.index)) return true;
  if (media.src()) return true;
  return media.canvas?.style.visibility === "visible";
}

/** Build the save payload for a mesh row, or null when the camera is missing. */
export async function serializeMesh(
  media: MediaEntry,
): Promise<MeshSavePayload | null> {
  const camera = getMeshCamera(media.index);
  if (camera === undefined) {
    console.error("mesh: no camera for", media.index);
    return null;
  }
  const payload: MeshSavePayload = {
    file_path: media.fileName(),
    camera,
    entry: dateSlug(),
  };
  if (!shouldSendMeshFrame(media.index)) return payload;

  const frameImage = await latestMeshFrame(media);
  if (frameImage === null) return null;
  payload.frame_image = frameImage;
  return payload;
}

/** Hide 2D media and start a GLB preview on the canvas. */
export function loadMeshResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null || media.canvas === null) {
    console.error("Canvas element not found for contentId:", contentId);
    return;
  }

  uploadedMeshFiles.set(contentId, inputFile);
  markMeshFrameDirty(contentId);
  MediaEntry.hideImage(media);
  MediaEntry.hideVideo(media);

  if (!MediaEntry.showCanvas(media)) return;
  meshPreview.initialize(
    media.canvas,
    inputFile,
    () => {
      enableSaveButton();
    },
    undefined,
    meshViewOptions(contentId, media.canvas),
  );
}

/** Shared camera and view-edit callback for a mesh row's canvas. */
function meshViewOptions(
  contentId: string | undefined,
  canvas: HTMLCanvasElement,
): MeshViewOptions | undefined {
  if (contentId === undefined) return undefined;
  return {
    camera: meshCamera(contentId),
    index: contentId,
    onUserViewChange: () => {
      handleMeshViewChange(contentId, canvas);
    },
  };
}

/** Register a live canvas so other views of the same mesh can redraw. */
function registerMeshRedraw(
  index: string,
  canvas: HTMLCanvasElement,
  redraw: () => void,
): void {
  let byCanvas = meshRedraws.get(index);
  if (byCanvas === undefined) {
    byCanvas = new Map();
    meshRedraws.set(index, byCanvas);
  }
  byCanvas.set(canvas, redraw);
}

/** Redraw every connected canvas for this mesh except the one that just changed. */
function redrawOtherMeshViews(index: string, source: HTMLCanvasElement): void {
  const byCanvas = meshRedraws.get(index);
  if (byCanvas === undefined) return;
  for (const [canvas, redraw] of byCanvas) {
    if (canvas === source || !canvas.isConnected) continue;
    redraw();
  }
}

/** Enable save, sync other views, and snapshot the new frame onto the thumbnail. */
function handleMeshViewChange(index: string, canvas: HTMLCanvasElement): void {
  markMeshFrameDirty(index);
  enableSaveButton();
  redrawOtherMeshViews(index, canvas);
  const previous = pendingSnapshots.get(index);
  if (previous !== undefined) window.clearTimeout(previous.timer);
  pendingSnapshots.set(index, {
    canvas,
    timer: window.setTimeout(() => {
      pendingSnapshots.delete(index);
      void captureMeshFrame(index, canvas);
    }, MESH_VIEW_SNAPSHOT_DEBOUNCE_MS),
  });
}

/** Encode a canvas frame and write it onto the row thumbnail. */
async function captureMeshFrame(
  index: string,
  canvas: HTMLCanvasElement,
): Promise<string | null> {
  const frame = await canvasAsJpegBase64(canvas);
  if (frame === null) return null;
  lastFrames.set(index, frame);
  const media = MediaEntry.fromIndex(index);
  if (media !== null) MediaEntry.setSrc(media, frame);
  return frame;
}

/** Return the latest mesh frame, flushing a pending view snapshot first. */
async function latestMeshFrame(media: MediaEntry): Promise<string | null> {
  const pending = pendingSnapshots.get(media.index);
  if (pending !== undefined) {
    window.clearTimeout(pending.timer);
    pendingSnapshots.delete(media.index);
    const frame = await captureMeshFrame(media.index, pending.canvas);
    if (frame !== null) return frame;
  }
  const stored = lastFrames.get(media.index);
  if (stored !== undefined) return stored;
  if (media.canvas !== null && media.canvas.style.visibility === "visible") {
    return currentFrameAsJpegBase64(media.canvas);
  }
  return media.src();
}
