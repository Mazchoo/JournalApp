import { downsizedImageUrl, downsizedVideoImageUrl } from '../runtime/config';
import { csrfToken, jq } from '../runtime/externals';
import { initializeNewImage } from './image';
import { initializeNewParagraph } from './paragraph';

/** Port of static/JS/entry.load.js. */

/** Fetch the downsized image for a server-rendered media row. */
export function loadServerRenderedImage(index: string | number, imageId: string): void {
  const $ = jq();
  const csrftoken = csrfToken();
  $.ajax({
    type: 'POST',
    url: downsizedImageUrl(),
    data: {
      image_id: imageId,
      csrfmiddlewaretoken: csrftoken,
    },
    success: (response: Record<string, string>) => {
      if ('base64' in response) {
        $('#image' + index).attr('src', response['base64']);
      }
      if ('error' in response) {
        console.log('Image load error:', response['error']);
      }
    },
    error: (_jqXhr, _textStatus, errorThrown) => {
      console.log('Failed to load image:', errorThrown);
    },
  });
}

/** Fetch the downsized poster frame for a server-rendered video row. */
export function loadServerRenderedVideo(index: string | number, videoId: string): void {
  const $ = jq();
  const csrftoken = csrfToken();
  $.ajax({
    type: 'POST',
    url: downsizedVideoImageUrl(),
    data: {
      video_id: videoId,
      csrfmiddlewaretoken: csrftoken,
    },
    success: (response: Record<string, string>) => {
      if ('base64' in response) {
        $('#image' + index).attr('src', response['base64']);
      }
      if ('error' in response) {
        console.log('Video image load error:', response['error']);
      }
    },
    error: (_jqXhr, _textStatus, errorThrown) => {
      console.log('Failed to load video image:', errorThrown);
    },
  });
}

/** Wire editors, handlers, and async loads for server-rendered rows. */
export function initializeServerRenderedContent(): void {
  const $ = jq();

  // Initialize TinyMCE and event handlers on server-rendered paragraphs
  $('.paragraph-entry').each(function (this: HTMLElement) {
    const textarea = $(this).find('textarea.entry-text')[0];
    if (!textarea) return;
    const index = textarea.id.replace('paragraph', '');
    const height = parseInt(textarea.getAttribute('data-height')!) || 220;
    const allowSynthesis = textarea.getAttribute('data-allow-ai-synthesis') !== '0';
    initializeNewParagraph(index, height, '', allowSynthesis);
  });

  // Initialize event handlers and async loading on server-rendered images/videos
  $('.image-entry').each(function (this: HTMLElement) {
    const img = $(this).find('img')[0];
    if (!img) return;
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
