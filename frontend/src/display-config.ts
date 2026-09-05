/**
 * Default sizes, timing, and appearance for on-screen UI.
 * Callers apply these values; they must not restate the numbers locally.
 */

/** Home-page carousel auto-advance interval. */
export const AUTO_CYCLE_MS = 5000;

/** TinyMCE editor height when none is stored on the paragraph. */
export const PARAGRAPH_EDITOR_HEIGHT_PX = 220;

/** Mesh preview canvas CSS and drawing-buffer height. */
export const MESH_CANVAS_HEIGHT_PX = 400;

/** Drawing-buffer width when the canvas has no layout size yet. */
export const MESH_CANVAS_FALLBACK_WIDTH_PX = 800;

/** Stacking order of the revealed mesh canvas. */
export const MESH_CANVAS_Z_INDEX = 10;

/** JPEG quality when encoding a mesh preview frame. */
export const MESH_FRAME_JPEG_QUALITY = 0.85;

/** Inline styles applied when revealing the mesh canvas. */
export const MESH_CANVAS_REVEAL_STYLE = {
  visibility: "visible",
  height: `${MESH_CANVAS_HEIGHT_PX}px`,
  display: "block",
  opacity: "1",
  position: "relative",
  zIndex: String(MESH_CANVAS_Z_INDEX),
};

/** Vertical field of view for the mesh preview camera, in radians. */
export const CAMERA_FOV_Y = Math.PI / 4;

/** Near clip plane of the mesh preview camera. */
export const CAMERA_NEAR = 0.1;

/** Far clip plane of the mesh preview camera. */
export const CAMERA_FAR = 100;

/** Distance from the orbit pivot at which the mesh preview starts. */
export const INITIAL_CAMERA_RADIUS = 3;
