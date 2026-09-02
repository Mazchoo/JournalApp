import { componentFromTemplate } from '../../common/utility';
import { imageModal, imagePreview } from '../../components/globals';
import { MediaEntry } from '../../components/media-entry';
import { requestFullImage } from '../../make-request';
import type { MediaContentThumbnail } from '../../response-interface';
import {
  contentIndex,
  contentIndexStr,
  dateSlug,
  imageTemplate,
  setContentIndex,
} from '../../runtime/backend-variables';
import { enableSaveButton } from '../save';

/** Image-specific media-row helpers. */

/** Fill the image row template for the given content index. */
export function generateImageTemplate(contentInd: string): string {
  return imageTemplate().replaceAll('__INDEX__', contentInd);
}

/** Allocate the next content index and build a media row. */
export function createNewImage(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  const index = contentIndexStr();
  const div = componentFromTemplate(
    generateImageTemplate(index),
    'div',
    'row mt-4 image-entry',
  );
  new MediaEntry(index, div);
  return div;
}

/** Remove the clicked media row and enable saving. */
export function deleteImage(e: Event): void {
  const media = MediaEntry.fromEvent(e);
  if (media === null) return;
  media.remove();
  enableSaveButton();
}

/** Apply loaded image source, file name, and synthesis state. */
export function editImageContent(
  updateInd: string,
  imageContent: MediaContentThumbnail,
): boolean | undefined {
  const media = MediaEntry.fromIndex(updateInd);
  if (media === null) return undefined;
  return MediaEntry.applyContent(media, imageContent);
}

/** Fetch the full-size image and show it in the image modal. */
export function openFullImage(fileName: string, source: string | null): void {
  let imageSource = source;

  requestFullImage(
    {
      file: fileName,
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
        imageModal.show();
      },
    },
  );
}
