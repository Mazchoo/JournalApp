import { videoModal, videoPreview } from '../components/globals';
import { ImageEntry } from '../components/image-entry';
import { requestFullVideo } from '../make-request';
import type { JsonErrorResponse } from '../response-interface';
import { dateSlug } from '../runtime/backend-variables';
import { enableSaveButton } from './save';

/** Preview a video file as a data URL. */
export function readVideoResource(inputFile: File, contentId: string): void {
  const image = ImageEntry.fromIndex(contentId);
  if (image === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    ImageEntry.showVideo(image, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Treat the media element as a video thumbnail. */
export function changeImageToVideoClass(updateInd: string): boolean | undefined {
  const image = ImageEntry.fromIndex(updateInd);
  if (image === null) return undefined;
  return ImageEntry.changeToVideoClass(image) ? true : undefined;
}

/** Open the full video in a modal. */
export function zoomToVideo(image: ImageEntry, fileName: string, source: string | null): void {
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
