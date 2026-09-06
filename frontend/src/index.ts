/**
 * Public surface of the frontend project.
 *
 * The IIFE copies these names onto `window` so standalone pages (test_mesh.html)
 * can still call them. templates/day.html no longer calls them itself; `boot()`
 * wires the editor, carousel, and modals.
 */

export { boot, bindDayPageHandlers } from "./boot";

export {
  changeTooltipTextFromInput,
  componentFromTemplate,
  deleteParentDiv,
  getContentType,
  getIndexInArr,
  getParentDivOfObject,
  insertNewObjectIntoEditArea,
  moveObjectDown,
  moveObjectUp,
  refreshScrollSpies,
  removeItem,
  reorderOneDivFromAnother,
  reverseString,
} from "./common/dom";

export {
  isHtmlFile,
  isImageFile,
  isMarkdownFile,
  isMeshFile,
  isVideoFile,
} from "./common/file-io";

export {
  createTinyMCE,
  getMCEComponentHeight,
  resetMCE,
} from "./tinymce/helper";

export {
  appendParagraphToList,
  createInitFunction,
  createNewParagraph,
  deleteParagraph,
  editParagraphContent,
  generateParagraphTemplate,
  initializeRawHtmlParagraph,
  initializeNewParagraph,
  initializeParagraphRow,
  insertNewParagraphToPosition,
} from "./entry/paragraph/paragraph";

export {
  computeNormals,
  getFullMesh,
  initializeMeshRenderer,
  loadMeshResource,
  renderGLB,
} from "./entry/media/mesh";

export {
  appendMediaToList,
  createNewMedia,
  deleteMedia,
  editMediaContent,
  editMediaMeta,
  generateMediaTemplate,
  initializeNewMedia,
  insertNewMediaToPosition,
  showFileName,
  showImageUpload,
  uploadAllMediaFiles,
  zoomToMedia,
} from "./entry/media/media";

export { readImageResource as readMediaResource } from "./entry/media/image";

export {
  changeImageToVideoClass,
  readVideoResource,
} from "./entry/media/video";

export {
  deleteContent,
  deleteFromDatabase,
  disableDeleteButton,
  enableDeleteButton,
} from "./entry/delete";

export {
  disableSaveButton,
  enableSaveButton,
  generateSaveEntry,
  getSaveData,
  saveEntryToDatabase,
  saveToDatabase,
} from "./entry/save";

export {
  initializeServerRenderedContent,
  loadServerRenderedImage,
  loadServerRenderedMesh,
  loadServerRenderedVideo,
} from "./entry/load";

export { getDestinationSlug, makeMoveRequest, moveEntry } from "./entry/move";

export type {
  CameraSavePayload,
  ImageSavePayload,
  MeshSavePayload,
  ParagraphSavePayload,
  SaveData,
  SavePayload,
  VideoSavePayload,
} from "./request-interface";
export type { MediaContentThumbnail as ImageContent } from "./response-interface";
export type { SynthesisEditor } from "./runtime/synthesis-editor";
