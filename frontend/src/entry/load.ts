import { MediaEntry } from "../components/media-entry";
import { ParagraphEntry } from "../components/paragraph-entry";
import { editArea } from "../components/globals";
import { scrollToTop } from "../components/common";
import {
  requestImageThumbnail,
  requestMeshThumbnail,
  requestVideoThumbnail,
} from "./make-request";
import { initializeNewMedia } from "./media/media";
import { setMeshCamera } from "./media/mesh";
import { initializeParagraphRow } from "./paragraph/paragraph";
import type { JsonErrorResponse } from "../response-interface";
import type { OrbitCamera } from "../rendering-3d/create-camera-matrix";

/** Port of static/JS/entry.load.js. */

/** Fetch the downsized image for a server-rendered media row. */
export function loadServerRenderedImage(index: string, imageId: string): void {
  requestImageThumbnail(
    { image_id: imageId },
    {
      success: (response) => {
        const media = MediaEntry.fromIndex(index);
        if (media === null) return;
        const blob = response instanceof Blob ? response : new Blob([response]);
        MediaEntry.setSrc(media, URL.createObjectURL(blob));
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        const responseJSON = jqXhr.responseJSON as JsonErrorResponse | undefined;
        if (responseJSON?.error !== undefined) {
          console.log("Image load error:", responseJSON.error);
          return;
        }
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
        const media = MediaEntry.fromIndex(index);
        if (media === null) return;
        const blob = response instanceof Blob ? response : new Blob([response]);
        MediaEntry.setSrc(media, URL.createObjectURL(blob));
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        const responseJSON = jqXhr.responseJSON as JsonErrorResponse | undefined;
        if (responseJSON?.error !== undefined) {
          console.log("Video image load error:", responseJSON.error);
          return;
        }
        console.log("Failed to load video image:", errorThrown);
      },
    },
  );
}

/** Fetch the downsized preview for a server-rendered mesh row. */
export function loadServerRenderedMesh(index: string, meshId: string): void {
  const media = MediaEntry.fromIndex(index);
  const rawCamera = media?.image?.getAttribute("data-camera") ?? "";
  if (rawCamera.startsWith("{")) {
    setMeshCamera(index, JSON.parse(rawCamera) as OrbitCamera);
  }

  requestMeshThumbnail(
    { mesh_id: meshId },
    {
      success: (response) => {
        if (media === null) return;
        const blob = response instanceof Blob ? response : new Blob([response]);
        MediaEntry.setSrc(media, URL.createObjectURL(blob));
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        const responseJSON = jqXhr.responseJSON as JsonErrorResponse | undefined;
        if (responseJSON?.error !== undefined) {
          console.log("Mesh image load error:", responseJSON.error);
          return;
        }
        console.log("Failed to load mesh image:", errorThrown);
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

    const meshId = media.meshId();
    if (meshId) {
      loadServerRenderedMesh(media.index, meshId);
    }
  });

  scrollToTop();
}
