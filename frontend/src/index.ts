/**
 * Public surface of the frontend project.
 *
 * Every name exported here was a global in static/JS, so the export names must stay in sync
 * with what templates/day.html calls from its inline `<script>`.
 */

export {
  changeTooltipTextFromInput,
  componentFromTemplate,
  deleteParentDiv,
  getContentId,
  getContentType,
  getIndexInArr,
  getParentDivOfObject,
  insertNewObjectIntoEditArea,
  isImageFile,
  isMeshFile,
  isVideoFile,
  moveObjectDown,
  moveObjectUp,
  refreshScrollSpies,
  removeItem,
  reorderOneDivFromAnother,
  reverseString,
} from './common/utility';

export { createTinyMCE, getMCEComponentHeight, resetMCE } from './tinymce/helper';

export {
  appendParagraphToList,
  createInitFunction,
  createNewParagraph,
  deleteParagraph,
  editParagraphContent,
  generateParagraphTemplate,
  initializeNewParagraph,
  insertNewParagraphToPosition,
} from './entry/paragraph';

export { computeNormals, initializeMeshRenderer, renderGLB } from './entry/mesh';

export {
  appendImageToList,
  changeImageToVideoClass,
  createNewImage,
  deleteImage,
  editImageContent,
  editImageMeta,
  generateImageTemplate,
  initializeNewImage,
  insertNewImageToPosition,
  loadMeshResource,
  readImageResource,
  readVideoResource,
  showFileName,
  showImageUpload,
  uploadAllMediaFiles,
  zoomToImage,
} from './entry/image';

export {
  deleteContent,
  deleteFromDatabase,
  disableDeleteButton,
  enableDeleteButton,
} from './entry/delete';

export {
  disableSaveButton,
  enableSaveButton,
  generateSaveEntry,
  getSaveData,
  saveEntryToDatabase,
  saveToDatabase,
} from './entry/save';

export {
  initializeServerRenderedContent,
  loadServerRenderedImage,
  loadServerRenderedVideo,
} from './entry/load';

export { getDestinationSlug, makeMoveRequest, moveEntry } from './entry/move';

export type { ImageContent } from './entry/image';
export type { MediaSavePayload, ParagraphSavePayload, SaveData } from './entry/save';
export type { SynthesisEditor } from './runtime/externals';
