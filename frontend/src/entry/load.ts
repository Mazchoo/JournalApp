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
          const image = document.getElementById('image' + index);
          if (image !== null) image.setAttribute('src', response.base64);
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
          const image = document.getElementById('image' + index);
          if (image !== null) image.setAttribute('src', response.base64);
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
  document.querySelectorAll('.paragraph-entry').forEach((row) => {
    const textarea = row.querySelector<HTMLTextAreaElement>('textarea.entry-text');
    if (textarea === null) return;
    const index = textarea.id.replace('paragraph', '');
    const height = parseInt(textarea.getAttribute('data-height')!) || 220;
    const allowSynthesis = textarea.getAttribute('data-allow-ai-synthesis') !== '0';
    initializeNewParagraph(index, height, '', allowSynthesis);
  });

  document.querySelectorAll('.image-entry').forEach((row) => {
    const img = row.querySelector('img');
    if (img === null) return;
    const index = img.id.replace('image', '');
    initializeNewImage(index);

    const imageId = img.getAttribute('data-image-id');
    if (imageId) {
      loadServerRenderedImage(index, imageId);
    }

    const videoId = img.getAttribute('data-video-id');
    if (videoId) {
      loadServerRenderedVideo(index, videoId);
    }
  });

  window.scrollTo(0, 0);
}
