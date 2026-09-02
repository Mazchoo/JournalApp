import {
  componentFromTemplate,
  getContentId,
  insertNewObjectIntoEditArea,
  isImageFile,
  isMeshFile,
  isVideoFile,
  moveObjectDown,
  moveObjectUp,
} from '../common/utility';
import { editArea, imagePreview, videoPreview } from '../components/globals';
import { ImageEntry } from '../components/image-entry';
import { requestFullImage, requestFullVideo } from '../make-request';
import type { JsonErrorResponse } from '../request-interface';
import {
  contentIndex,
  contentIndexStr,
  dateSlug,
  imageTemplate,
  setContentIndex,
} from '../runtime/backend-variables';
import { showModal } from '../runtime/modals';
import type { ImageContent } from './content-types';
import { initializeMeshRenderer } from './mesh';
import { insertNewParagraphToPosition } from './paragraph';
import { enableSaveButton } from './save';

export type { ImageContent } from './content-types';

/** Port of static/JS/entry.image.js. */

/** Fill the image row template for the given content index. */
export function generateImageTemplate(contentInd: string): string {
  return imageTemplate().replaceAll('__INDEX__', contentInd);
}

/** Allocate the next content index and build an image row. */
export function createNewImage(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  const index = contentIndexStr();
  const div = componentFromTemplate(
    generateImageTemplate(index),
    'div',
    'row mt-4 image-entry',
  );
  new ImageEntry(index, div);
  return div;
}

/** Remove the clicked image row and enable saving. */
export function deleteImage(e: Event): void {
  const image = ImageEntry.fromEvent(e);
  if (image === null) return;
  image.remove();
  enableSaveButton();
}

/** Bind edit, upload, and synthesis handlers on an image row. */
export function initializeNewImage(lastestId: string): void {
  const image = ImageEntry.fromIndex(lastestId);
  if (image === null) return;
  image.bindHandlers({
    onUpload: showImageUpload,
    onDelete: deleteImage,
    onInsertParagraph: insertNewParagraphToPosition,
    onInsertImage: insertNewImageToPosition,
    onMoveUp: moveObjectUp,
    onMoveDown: moveObjectDown,
    onToggleSynthesis: () => {
      ImageEntry.toggleSynthesis(image);
      enableSaveButton();
    },
  });
}

/** Insert a new image row above the clicked row. */
export function insertNewImageToPosition(e: Event): HTMLElement | undefined {
  const contendInd = String(contentIndex() + 1);
  enableSaveButton();
  return insertNewObjectIntoEditArea(e, createNewImage, initializeNewImage, contendInd);
}

/** Append a new image row to the edit area. */
export function appendImageToList(): HTMLElement {
  const div = createNewImage();
  editArea.append(div);
  initializeNewImage(contentIndexStr());
  return div;
}

/** Preview an image file as a data URL. */
export function readImageResource(inputFile: File, contentId: string): void {
  const image = ImageEntry.fromIndex(contentId);
  if (image === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    ImageEntry.hideVideo(image);
    ImageEntry.setSrc(image, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Preview a video file as a data URL. */
export function readVideoResource(inputFile: File, contentId: string): void {
  const image = ImageEntry.fromIndex(contentId);
  if (image === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    ImageEntry.showVideo(image, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Hide 2D media and start a GLB preview on the canvas. */
export function loadMeshResource(inputFile: File, contentId: string): void {
  const image = ImageEntry.fromIndex(contentId);
  if (image === null || image.canvas === null) {
    console.error('Canvas element not found for contentId:', contentId);
    return;
  }

  ImageEntry.hideImage(image);
  ImageEntry.hideVideo(image);

  if (!ImageEntry.showCanvas(image)) return;
  initializeMeshRenderer(image.canvas, inputFile, () => {
    enableSaveButton();
  });
}

/** Write the uploaded file name into the row label. */
export function showFileName(inputFile: File, contentId: string): void {
  const image = ImageEntry.fromIndex(contentId);
  if (image === null) return;
  ImageEntry.setFileName(image, inputFile.name);
}

/** Route each selected file to the matching media preview. */
export function uploadAllMediaFiles(
  contentInd: string,
  inputFiles: FileList | File[],
): void {
  for (let i = inputFiles.length - 1; i >= 0; i--) {
    if (i < inputFiles.length - 1) {
      const current = ImageEntry.fromIndex(contentInd);
      if (current !== null) ImageEntry.clickInsertImage(current);
      contentInd = contentIndexStr();
    }

    const inputFile = inputFiles[i]!;
    if (isVideoFile(inputFile.name)) {
      readVideoResource(inputFile, contentInd);
    } else if (isImageFile(inputFile.name)) {
      readImageResource(inputFile, contentInd);
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

/** Apply loaded image source, file name, and synthesis state. */
export function editImageContent(
  updateInd: string,
  imageContent: ImageContent,
): boolean | undefined {
  const image = ImageEntry.fromIndex(updateInd);
  if (image === null) return undefined;
  return ImageEntry.applyContent(image, imageContent);
}

/** Apply loaded file name and synthesis state without changing the source. */
export function editImageMeta(
  updateInd: string,
  imageContent: ImageContent,
): boolean | undefined {
  const image = ImageEntry.fromIndex(updateInd);
  if (image === null) return undefined;
  return ImageEntry.applyMeta(image, imageContent);
}

/** Treat the media element as a video thumbnail. */
export function changeImageToVideoClass(updateInd: string): boolean | undefined {
  const image = ImageEntry.fromIndex(updateInd);
  if (image === null) return undefined;
  return ImageEntry.changeToVideoClass(image) ? true : undefined;
}

/** Open the full image or video in a modal. */
export function zoomToImage(event: Event): void {
  const area = event.currentTarget as HTMLElement;
  const img = area.querySelector('img');
  if (img === null) return;

  const contentId = getContentId(img.id);
  if (contentId === -1) return;

  const image = ImageEntry.fromIndex(contentId);
  if (image === null) return;

  const imageName = image.fileNameHtml();
  let imageSource = img.getAttribute('src');

  if (img.classList.contains('content-image')) {
    requestFullImage(
      {
        file: imageName,
        name: dateSlug(),
      },
      {
        success: (response) => {
          if (response.base64 !== undefined) imageSource = response.base64;
          if ('error' in response) console.log(`Image error : ${response['error']}`);
        },
        error: (_jqXhr, _textStatus, errorThrown) => {
          console.log(`Unknown error : ${errorThrown}`);
        },
        complete: () => {
          imagePreview.setSrc(imageSource!);
          showModal('image-modal');
        },
      },
    );
  } else if (img.classList.contains('content-video')) {
    requestFullVideo(
      {
        file: imageName,
        name: dateSlug(),
      },
      {
        success: (response) => {
          const videoBlob = new Blob([response], { type: 'video/mp4' });
          imageSource = URL.createObjectURL(videoBlob);
        },
        error: (jqXhr, _textStatus, errorThrown) => {
          const responseJSON = jqXhr.responseJSON as JsonErrorResponse | undefined;
          if (responseJSON && 'error' in responseJSON) {
            console.log(`Video error : ${responseJSON['error']}`);
          } else {
            console.log(`Unknown error : ${errorThrown}`);
          }
        },
        complete: () => {
          videoPreview.setSrc(imageSource!);
          showModal('video-modal');
        },
      },
    );
  }
}
