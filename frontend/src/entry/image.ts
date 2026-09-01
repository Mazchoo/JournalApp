import {
  componentFromTemplate,
  deleteParentDiv,
  eventNameSelector,
  getContentId,
  insertNewObjectIntoEditArea,
  isImageFile,
  isMeshFile,
  isVideoFile,
  moveObjectDown,
  moveObjectUp,
} from '../common/utility';
import { requestFullImage, requestFullVideo } from '../make-request';
import type { JsonErrorResponse } from '../request-interface';
import { contentIndex, dateSlug, imageTemplate, setContentIndex } from '../runtime/config';
import { showModal } from '../runtime/modals';
import { initializeMeshRenderer } from './mesh';
import { insertNewParagraphToPosition } from './paragraph';
import { enableSaveButton } from './save';

/** Port of static/JS/entry.image.js. */

/** Shape of the image/video payloads returned by main.content_generation.load_entry. */
export interface ImageContent {
  base64?: string;
  file_name?: string;
  allow_ai_synthesis?: number;
}

/** Apply or remove the two Generate-button classes according to the synthesis flag. */
function setSynthesisButtonState(button: HTMLElement, isActive: boolean): void {
  button.classList.toggle('btn-primary', isActive);
  button.classList.toggle('btn-outline-secondary', !isActive);
}

/** Hide an element without removing it from layout calculations. */
function hideMedia(element: HTMLElement | null): void {
  if (element === null) return;
  element.style.visibility = 'hidden';
  element.style.height = '0px';
}

/** Fill the image row template for the given content index. */
export function generateImageTemplate(contentInd: string | number): string {
  return imageTemplate().replaceAll('__INDEX__', String(contentInd));
}

/** Allocate the next content index and build an image row. */
export function createNewImage(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  return componentFromTemplate(
    generateImageTemplate(contentIndex()),
    'div',
    'row mt-4 image-entry',
  );
}

/** Remove the clicked image row and enable saving. */
export function deleteImage(e: Event): void {
  const imageDiv = document.querySelector(eventNameSelector(e));
  deleteParentDiv(imageDiv);
  enableSaveButton();
}

/** Bind edit, upload, and synthesis handlers on an image row. */
export function initializeNewImage(lastestId: string | number): void {
  document.getElementById('upload' + lastestId)?.addEventListener('change', showImageUpload);

  document.getElementById('delete-content' + lastestId)?.addEventListener('click', deleteImage);
  document
    .getElementById('insert-paragraph' + lastestId)
    ?.addEventListener('click', insertNewParagraphToPosition);
  document
    .getElementById('insert-image' + lastestId)
    ?.addEventListener('click', insertNewImageToPosition);
  document.getElementById('move-content-up' + lastestId)?.addEventListener('click', moveObjectUp);
  document
    .getElementById('move-content-down' + lastestId)
    ?.addEventListener('click', moveObjectDown);
  document.getElementById('allow-syn' + lastestId)?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLElement;
    button.classList.toggle('btn-primary');
    button.classList.toggle('btn-outline-secondary');
    enableSaveButton();
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

  document.getElementById('edit-area')!.appendChild(div);
  initializeNewImage(String(contentIndex()));

  return div;
}

/** Preview an image file as a data URL. */
export function readImageResource(inputFile: File, contentId: string | number): void {
  const reader = new FileReader();

  reader.onload = (e) => {
    hideMedia(document.getElementById('video' + contentId));
    const image = document.getElementById('image' + contentId);
    if (image !== null) image.setAttribute('src', e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Preview a video file as a data URL. */
export function readVideoResource(inputFile: File, contentId: string | number): void {
  const reader = new FileReader();

  reader.onload = (e) => {
    const video = document.getElementById('video' + contentId);
    if (video !== null) {
      video.style.visibility = 'visible';
      video.style.height = 'auto';
      video.setAttribute('src', e.target!.result as string);
    }
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Hide 2D media and start a GLB preview on the canvas. */
export function loadMeshResource(inputFile: File, contentId: string | number): void {
  hideMedia(document.getElementById('image' + contentId));
  hideMedia(document.getElementById('video' + contentId));

  const canvas = document.getElementById('mesh-canvas' + contentId) as HTMLCanvasElement | null;
  if (canvas !== null) {
    Object.assign(canvas.style, {
      visibility: 'visible',
      height: '400px',
      display: 'block',
      opacity: '1',
      position: 'relative',
      zIndex: '1',
    });
    initializeMeshRenderer(canvas, inputFile, () => {
      enableSaveButton();
    });
  } else {
    console.error('Canvas element not found for contentId:', contentId);
  }
}

/** Write the uploaded file name into the row label. */
export function showFileName(inputFile: File, contentId: string | number): void {
  const infoArea = document.getElementById('upload-label' + contentId);
  if (infoArea !== null) infoArea.textContent = inputFile.name;
}

/** Route each selected file to the matching media preview. */
export function uploadAllMediaFiles(
  contentInd: string | number,
  inputFiles: FileList | File[],
): void {
  for (let i = inputFiles.length - 1; i >= 0; i--) {
    if (i < inputFiles.length - 1) {
      document.getElementById('insert-image' + contentInd)?.click();
      contentInd = contentIndex();
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
  updateInd: string | number,
  imageContent: ImageContent,
): boolean | undefined {
  const imageArea = document.getElementById('image' + updateInd);
  const infoArea = document.getElementById('upload-label' + updateInd);
  const allowSynthesis = document.getElementById('allow-syn' + updateInd);
  if (imageArea == null || infoArea == null || allowSynthesis == null) {
    return undefined;
  }

  imageArea.setAttribute('src', imageContent['base64']!);
  setSynthesisButtonState(allowSynthesis, imageContent['allow_ai_synthesis'] === 1);
  infoArea.textContent = imageContent['file_name']!;
  return true;
}

/** Apply loaded file name and synthesis state without changing the source. */
export function editImageMeta(
  updateInd: string | number,
  imageContent: ImageContent,
): boolean | undefined {
  const infoArea = document.getElementById('upload-label' + updateInd);
  const originalCheck = document.getElementById('allow-syn' + updateInd);
  if (infoArea == null || originalCheck == null) {
    return undefined;
  }

  setSynthesisButtonState(originalCheck, imageContent['allow_ai_synthesis'] === 1);
  infoArea.textContent = imageContent['file_name']!;
  return true;
}

/** Treat the media element as a video thumbnail. */
export function changeImageToVideoClass(updateInd: string | number): boolean | undefined {
  const imageArea = document.getElementById('image' + updateInd);
  if (imageArea == null) {
    return undefined;
  }

  imageArea.classList.remove('content-image');
  imageArea.classList.add('content-video');
  imageArea.style.visibility = 'visible';
  imageArea.style.height = 'auto';
  return true;
}

/** Open the full image or video in a modal. */
export function zoomToImage(event: Event): void {
  const area = event.currentTarget as HTMLElement;
  const image = area.querySelector('img');
  if (image === null) return;

  const contentId = getContentId(image.id);

  if (contentId === -1) return;
  const imageName = document.getElementById('upload-label' + contentId)?.innerHTML ?? '';

  let imageSource = image.getAttribute('src');

  if (image.classList.contains('content-image')) {
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
          const preview = document.getElementById('image-preview');
          if (preview !== null) preview.setAttribute('src', imageSource!);
          showModal('image-modal');
        },
      },
    );
  } else if (image.classList.contains('content-video')) {
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
          const preview = document.getElementById('video-preview');
          if (preview !== null) preview.setAttribute('src', imageSource!);
          showModal('video-modal');
        },
      },
    );
  }
}
