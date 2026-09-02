import { ImageEntry } from '../components/image-entry';
import { ParagraphEntry } from '../components/paragraph-entry';
import { editArea } from '../components/globals';
import { requestDownsizedImage, requestDownsizedVideoImage } from '../make-request';
import { initializeNewImage } from './image';
import { initializeNewParagraph } from './paragraph';

/** Port of static/JS/entry.load.js. */

/** Fetch the downsized image for a server-rendered media row. */
export function loadServerRenderedImage(index: string | number, imageId: string): void {
  requestDownsizedImage(
    { image_id: imageId },
    {
      success: (response) => {
        if (response.base64 !== undefined) {
          const image = ImageEntry.fromIndex(index);
          if (image !== null) ImageEntry.setSrc(image, response.base64);
        }
        if (response.error !== undefined) {
          console.log('Image load error:', response.error);
        }
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log('Failed to load image:', errorThrown);
      },
    },
  );
}

/** Fetch the downsized poster frame for a server-rendered video row. */
export function loadServerRenderedVideo(index: string | number, videoId: string): void {
  requestDownsizedVideoImage(
    { video_id: videoId },
    {
      success: (response) => {
        if (response.base64 !== undefined) {
          const image = ImageEntry.fromIndex(index);
          if (image !== null) ImageEntry.setSrc(image, response.base64);
        }
        if (response.error !== undefined) {
          console.log('Video image load error:', response.error);
        }
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log('Failed to load video image:', errorThrown);
      },
    },
  );
}

/** Wire editors, handlers, and async loads for server-rendered rows. */
export function initializeServerRenderedContent(): void {
  editArea.paragraphRows().forEach((row) => {
    const paragraph = ParagraphEntry.fromRow(row as HTMLElement);
    if (paragraph === null || paragraph.textarea === null) return;
    const height = parseInt(paragraph.textarea.getAttribute('data-height')!) || 220;
    const allowSynthesis = paragraph.textarea.getAttribute('data-allow-ai-synthesis') !== '0';
    initializeNewParagraph(paragraph.index, height, '', allowSynthesis);
  });

  editArea.imageRows().forEach((row) => {
    const image = ImageEntry.fromRow(row as HTMLElement);
    if (image === null) return;
    initializeNewImage(image.index);

    const imageId = image.image?.getAttribute('data-image-id');
    if (imageId) {
      loadServerRenderedImage(image.index, imageId);
    }

    const videoId = image.image?.getAttribute('data-video-id');
    if (videoId) {
      loadServerRenderedVideo(image.index, videoId);
    }
  });

  window.scrollTo(0, 0);
}
