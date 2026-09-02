import {
  insertNewObjectIntoEditArea,
  isImageFile,
  isMeshFile,
  isVideoFile,
  moveObjectDown,
  moveObjectUp,
} from '../../common/utility';
import { editArea } from '../../components/globals';
import { MediaEntry } from '../../components/media-entry';
import type { MediaContentThumbnail } from '../../response-interface';
import { contentIndex, contentIndexStr } from '../../runtime/backend-variables';
import { insertNewParagraphToPosition } from '../paragraph';
import { enableSaveButton } from '../save';
import { createNewImage, deleteImage, openFullImage } from './image';
import { loadMeshResource } from './mesh';
import { readVideoResource, zoomToVideo } from './video';

/** Generic media-row behavior shared by image, video, and mesh. */

/** Bind edit, upload, and synthesis handlers on a media row. */
export function initializeNewMedia(lastestId: string): void {
  const media = MediaEntry.fromIndex(lastestId);
  if (media === null) return;
  media.bindHandlers({
    onUpload: showImageUpload,
    onDelete: deleteImage,
    onInsertParagraph: insertNewParagraphToPosition,
    onInsertImage: insertNewMediaToPosition,
    onMoveUp: moveObjectUp,
    onMoveDown: moveObjectDown,
    onToggleSynthesis: () => {
      MediaEntry.toggleSynthesis(media);
      enableSaveButton();
    },
  });
}

/** Insert a new media row above the clicked row. */
export function insertNewMediaToPosition(e: Event): HTMLElement | undefined {
  const contendInd = String(contentIndex() + 1);
  enableSaveButton();
  return insertNewObjectIntoEditArea(e, createNewImage, initializeNewMedia, contendInd);
}

/** Append a new media row to the edit area. */
export function appendImageToList(): HTMLElement {
  const div = createNewImage();
  editArea.append(div);
  initializeNewMedia(contentIndexStr());
  return div;
}

/** Preview an image file as a data URL. */
export function readMediaResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    MediaEntry.hideVideo(media);
    MediaEntry.setSrc(media, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Write the uploaded file name into the row label. */
export function showFileName(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null) return;
  MediaEntry.setFileName(media, inputFile.name);
}

/** Route each selected file to the matching media preview. */
export function uploadAllMediaFiles(
  contentInd: string,
  inputFiles: FileList | File[],
): void {
  for (let i = inputFiles.length - 1; i >= 0; i--) {
    if (i < inputFiles.length - 1) {
      const current = MediaEntry.fromIndex(contentInd);
      if (current !== null) MediaEntry.clickInsertImage(current);
      contentInd = contentIndexStr();
    }

    const inputFile = inputFiles[i]!;
    if (isVideoFile(inputFile.name)) {
      readVideoResource(inputFile, contentInd);
    } else if (isImageFile(inputFile.name)) {
      readMediaResource(inputFile, contentInd);
    } else if (isMeshFile(inputFile.name)) {
      loadMeshResource(inputFile, contentInd);
    } else {
      console.log('Unknown media type');
    }

    showFileName(inputFile, contentInd);
  }
}

/** Upload the files chosen on a row's file input. */
export function showImageUpload(self: Event): void {
  const input = self.target as HTMLInputElement;
  if (!(input.id && input.files)) return;

  const contentInd = input.id.replace('upload', '');
  uploadAllMediaFiles(contentInd, input.files);
}

/** Apply loaded file name and synthesis state without changing the source. */
export function editMediaMeta(
  updateInd: string,
  mediaContent: MediaContentThumbnail,
): boolean | undefined {
  const media = MediaEntry.fromIndex(updateInd);
  if (media === null) return undefined;
  return MediaEntry.applyMeta(media, mediaContent);
}

/** Open the full image or video in a modal. */
export function zoomToMedia(event: Event): void {
  const media = MediaEntry.fromEvent(event);
  if (media === null) return;

  const img = media.image;
  if (img === null) return;

  const fileName = media.fileNameHtml();
  const source = img.getAttribute('src');

  if (img.classList.contains('content-image')) {
    openFullImage(fileName, source);
  } else if (img.classList.contains('content-video')) {
    zoomToVideo(media, fileName, source);
  }
}
