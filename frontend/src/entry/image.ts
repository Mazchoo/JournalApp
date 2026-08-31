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
import { contentIndex, dateSlug, imageTemplate, imageUrl, setContentIndex, videoUrl } from '../runtime/config';
import { csrfToken, jq } from '../runtime/externals';
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

export function generateImageTemplate(contentInd: string | number): string {
  return imageTemplate().replaceAll('__INDEX__', String(contentInd));
}

export function createNewImage(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  return componentFromTemplate(
    generateImageTemplate(contentIndex()),
    'div',
    'row mt-4 image-entry',
  );
}

export function deleteImage(e: JQuery.TriggeredEvent): void {
  const imageDivs = jq()(eventNameSelector(e));
  deleteParentDiv(imageDivs[0]);
  enableSaveButton();
}

export function initializeNewImage(lastestId: string | number): void {
  const $ = jq();
  $('#upload' + lastestId).on('change', showImageUpload);

  $('#delete-content' + lastestId).on('click', deleteImage);
  $('#insert-paragraph' + lastestId).on('click', insertNewParagraphToPosition);
  $('#insert-image' + lastestId).on('click', insertNewImageToPosition);
  $('#move-content-up' + lastestId).on('click', moveObjectUp);
  $('#move-content-down' + lastestId).on('click', moveObjectDown);
  $('#allow-syn' + lastestId).on('click', function (this: HTMLElement) {
    $(this).toggleClass('btn-primary btn-outline-secondary');
    enableSaveButton();
  });
}

export function insertNewImageToPosition(e: JQuery.TriggeredEvent): HTMLElement | undefined {
  const contendInd = String(contentIndex() + 1);
  enableSaveButton();
  return insertNewObjectIntoEditArea(e, createNewImage, initializeNewImage, contendInd);
}

export function appendImageToList(): HTMLElement {
  const div = createNewImage();

  jq()('#edit-area')[0].appendChild(div);
  initializeNewImage(String(contentIndex()));

  return div;
}

export function readImageResource(inputFile: File, contentId: string | number): void {
  const $ = jq();
  const reader = new FileReader();

  reader.onload = (e) => {
    $('#video' + contentId).css({ visibility: 'hidden', height: 0 });
    $('#image' + contentId).attr('src', e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

export function readVideoResource(inputFile: File, contentId: string | number): void {
  const $ = jq();
  const reader = new FileReader();

  reader.onload = (e) => {
    $('#video' + contentId).css({ visibility: 'visible', height: 'auto' });
    $('#video' + contentId).attr('src', e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

export function loadMeshResource(inputFile: File, contentId: string | number): void {
  const $ = jq();
  // Hide image and video elements
  $('#image' + contentId).css({ visibility: 'hidden', height: 0 });
  $('#video' + contentId).css({ visibility: 'hidden', height: 0 });

  // Show canvas for 3D rendering
  const canvas = $('#mesh-canvas' + contentId);
  canvas.css({
    visibility: 'visible',
    height: '400px',
    display: 'block',
    opacity: '1',
    position: 'relative',
    zIndex: '1',
  });

  // Initialize mesh renderer using the mesh module
  if (canvas[0]) {
    initializeMeshRenderer(canvas[0] as HTMLCanvasElement, inputFile, () => {
      enableSaveButton();
    });
  } else {
    console.error('Canvas element not found for contentId:', contentId);
  }
}

export function showFileName(inputFile: File, contentId: string | number): void {
  const infoArea = jq()('#upload-label' + contentId)[0];
  const fileName = inputFile.name;
  infoArea.textContent = fileName;
}

export function uploadAllMediaFiles(
  contentInd: string | number,
  inputFiles: FileList | File[],
): void {
  const $ = jq();
  for (let i = inputFiles.length - 1; i >= 0; i--) {
    if (i < inputFiles.length - 1) {
      $('#insert-image' + contentInd).trigger('click');
      contentInd = contentIndex();
    }

    const inputFile = inputFiles[i];
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

export function showImageUpload(self: JQuery.TriggeredEvent): void {
  const input = self.target as HTMLInputElement;
  if (!(input.id && input.files)) return;

  const contentInd = input.id.replace('upload', '');
  uploadAllMediaFiles(contentInd, input.files);
}

export function editImageContent(
  updateInd: string | number,
  imageContent: ImageContent,
): boolean | undefined {
  const $ = jq();
  const imageArea = $('#image' + updateInd);
  const infoArea = $('#upload-label' + updateInd);
  const allowSynthesis = $('#allow-syn' + updateInd);
  if (imageArea[0] == undefined || infoArea[0] == undefined || allowSynthesis[0] == undefined) {
    return undefined;
  }

  imageArea.attr('src', imageContent['base64']!);
  const isActive = imageContent['allow_ai_synthesis'] === 1;
  allowSynthesis.toggleClass('btn-primary', isActive).toggleClass('btn-outline-secondary', !isActive);
  infoArea.text(imageContent['file_name']!);
  return true;
}

export function editImageMeta(
  updateInd: string | number,
  imageContent: ImageContent,
): boolean | undefined {
  const $ = jq();
  const infoArea = $('#upload-label' + updateInd);
  const originalCheck = $('#allow-syn' + updateInd);
  if (infoArea[0] == undefined || originalCheck[0] == undefined) {
    return undefined;
  }

  const isActiveMeta = imageContent['allow_ai_synthesis'] === 1;
  originalCheck
    .toggleClass('btn-primary', isActiveMeta)
    .toggleClass('btn-outline-secondary', !isActiveMeta);
  infoArea.text(imageContent['file_name']!);
  return true;
}

export function changeImageToVideoClass(updateInd: string | number): boolean | undefined {
  const imageArea = jq()('#image' + updateInd);
  if (imageArea[0] == undefined) {
    return undefined;
  }

  imageArea.removeClass('content-image');
  imageArea.addClass('content-video');
  imageArea.css({ visibility: 'visible', height: 'auto' });
  return true;
}

export function zoomToImage(this: HTMLElement): void {
  const $ = jq();
  const imageId = $(this).find('img').attr('id')!;
  const contentId = getContentId(imageId);

  if (contentId === -1) return;
  const imageName = $('#upload-label' + contentId).html();
  const csrftoken = csrfToken();

  const image = $(this).find('img');
  let imageSource = image.attr('src');

  if ($(image).hasClass('content-image')) {
    $.ajax({
      type: 'POST',
      url: imageUrl(),
      data: {
        file: imageName,
        csrfmiddlewaretoken: csrftoken,
        name: dateSlug(),
      },
      success: (response: Record<string, string>) => {
        if ('base64' in response) imageSource = response['base64'];
        if ('error' in response) console.log(`Image error : ${response['error']}`);
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log(`Unknown error : ${errorThrown}`);
      },
      complete: () => {
        $('#image-preview').attr('src', imageSource!);
        $('#image-modal').modal('show');
      },
    });
  } else if ($(image).hasClass('content-video')) {
    $.ajax({
      type: 'POST',
      url: videoUrl(),
      data: {
        file: imageName,
        csrfmiddlewaretoken: csrftoken,
        name: dateSlug(),
      },
      xhrFields: {
        responseType: 'blob',
      },
      success: (response: BlobPart) => {
        // Create a blob URL from the streaming video response
        const videoBlob = new Blob([response], { type: 'video/mp4' });
        imageSource = URL.createObjectURL(videoBlob);
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        // Check if response is JSON error
        const responseJSON = jqXhr.responseJSON as Record<string, string> | undefined;
        if (responseJSON && 'error' in responseJSON) {
          console.log(`Video error : ${responseJSON['error']}`);
        } else {
          console.log(`Unknown error : ${errorThrown}`);
        }
      },
      complete: () => {
        // Use the dedicated video modal
        $('#video-preview').attr('src', imageSource!);
        $('#video-modal').modal('show');
      },
    });
  }
}
