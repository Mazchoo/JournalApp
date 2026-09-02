import { imageModal, imagePreview } from '../../components/globals';
import { requestFullImage } from '../make-request';
import { dateSlug } from '../../runtime/backend-variables';

/** Image-specific media-row helpers. */

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
