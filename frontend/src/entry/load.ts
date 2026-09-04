import { MediaEntry } from "../components/media-entry";
import { ParagraphEntry } from "../components/paragraph-entry";
import { editArea } from "../components/globals";
import { scrollToTop } from "../components/common";
import { requestImageThumbnail, requestVideoThumbnail } from "./make-request";
import { initializeNewMedia } from "./media/media";
import { initializeParagraphRow } from "./paragraph";

/** Port of static/JS/entry.load.js. */

/** Fetch the downsized image for a server-rendered media row. */
export function loadServerRenderedImage(index: string, imageId: string): void {
  requestImageThumbnail(
    { image_id: imageId },
    {
      success: (response) => {
        if (response.base64 !== undefined) {
          const media = MediaEntry.fromIndex(index);
          if (media !== null) MediaEntry.setSrc(media, response.base64);
        }
        if (response.error !== undefined) {
          console.log("Image load error:", response.error);
        }
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log("Failed to load image:", errorThrown);
      },
    },
  );
}

/** Fetch the downsized poster frame for a server-rendered video row. */
export function loadServerRenderedVideo(index: string, videoId: string): void {
  requestVideoThumbnail(
    { video_id: videoId },
    {
      success: (response) => {
        if (response.base64 !== undefined) {
          const media = MediaEntry.fromIndex(index);
          if (media !== null) MediaEntry.setSrc(media, response.base64);
        }
        if (response.error !== undefined) {
          console.log("Video image load error:", response.error);
        }
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log("Failed to load video image:", errorThrown);
      },
    },
  );
}

/** Wire editors, handlers, and async loads for server-rendered rows. */
export function initializeServerRenderedContent(): void {
  editArea.paragraphRows().forEach((row) => {
    const paragraph = ParagraphEntry.fromRow(row as HTMLElement);
    if (paragraph === null) return;
    initializeParagraphRow(paragraph);
  });

  editArea.mediaRows().forEach((row) => {
    const media = MediaEntry.fromRow(row as HTMLElement);
    if (media === null) return;
    initializeNewMedia(media.index);

    const imageId = media.imageId();
    if (imageId) {
      loadServerRenderedImage(media.index, imageId);
    }

    const videoId = media.videoId();
    if (videoId) {
      loadServerRenderedVideo(media.index, videoId);
    }
  });

  scrollToTop();
}
