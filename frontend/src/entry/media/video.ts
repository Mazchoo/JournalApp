import { MediaEntry } from "../../components/media-entry";
import { requestFullVideo } from "../make-request";
import type { JsonErrorResponse } from "../../response-interface";
import { dateSlug } from "../../runtime/backend-variables";
import { enableSaveButton } from "../save";

/** Preview a video file as a data URL. */
export function readVideoResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null) return;
  MediaEntry.hideImage(media);
  const reader = new FileReader();

  reader.onload = (e) => {
    MediaEntry.showVideo(media, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Treat the media element as a video thumbnail. */
export function changeImageToVideoClass(
  updateInd: string,
): boolean | undefined {
  const media = MediaEntry.fromIndex(updateInd);
  if (media === null) return undefined;
  return MediaEntry.changeToVideoClass(media) ? true : undefined;
}

/** Fetch the full video and play it in the row. Videos do not use a modal. */
export function zoomToVideo(media: MediaEntry, fileName: string): void {
  requestFullVideo(
    {
      file: fileName,
      name: dateSlug(),
    },
    {
      success: (response) => {
        const videoBlob = new Blob([response], { type: "video/mp4" });
        MediaEntry.showVideo(media, URL.createObjectURL(videoBlob));
      },
      error: (jqXhr, _textStatus, errorThrown) => {
        const responseJSON = jqXhr.responseJSON as
          JsonErrorResponse | undefined;
        if (responseJSON && "error" in responseJSON) {
          console.log(`Video error : ${responseJSON["error"]}`);
        } else {
          console.log(`Unknown error : ${errorThrown}`);
        }
      },
    },
  );
}
