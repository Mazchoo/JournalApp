import { videoModal, videoPreview } from '../../components/globals';
import { MediaEntry } from '../../components/media-entry';
import { requestFullVideo } from '../../make-request';
import type { JsonErrorResponse } from '../../response-interface';
import { dateSlug } from '../../runtime/backend-variables';
import { enableSaveButton } from '../save';

/** Preview a video file as a data URL. */
export function readVideoResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    MediaEntry.showVideo(media, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Treat the media element as a video thumbnail. */
export function changeImageToVideoClass(updateInd: string): boolean | undefined {
  const media = MediaEntry.fromIndex(updateInd);
  if (media === null) return undefined;
  return MediaEntry.changeToVideoClass(media) ? true : undefined;
}

/** Open the full video in a modal. */
export function zoomToVideo(media: MediaEntry, fileName: string, source: string | null): void {
  let videoSource = source;

  requestFullVideo(
    {
      file: fileName,
      name: dateSlug(),
    },
    {
      success: (response) => {
        const videoBlob = new Blob([response], { type: 'video/mp4' });
        videoSource = URL.createObjectURL(videoBlob);
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
        videoPreview.setSrc(videoSource!);
        videoModal.show();
      },
    },
  );
}
