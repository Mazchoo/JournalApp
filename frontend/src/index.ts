/**
 * Public surface of the frontend project.
 *
 * The IIFE copies these names onto `window` so standalone pages (test_mesh.html)
 * can still call them. templates/day.html no longer calls them itself; `boot()`
 * wires the editor, carousel, and modals.
 */

export { boot, bindDayPageHandlers } from './boot';

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
export type { MediaSavePayload, ParagraphSavePayload, SaveData } from './request-interface';
export type { SynthesisEditor } from './runtime/externals';
