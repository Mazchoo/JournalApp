import { imageModal, imagePreview } from "../../components/globals";
import { MediaEntry } from "../../components/media-entry";
import { requestFullImage } from "../make-request";
import { dateSlug } from "../../runtime/backend-variables";
import { enableSaveButton } from "../save";

/** Image-specific media-row helpers. */

/** Preview an image file as a data URL. */
export function readImageResource(inputFile: File, contentId: string): void {
  const media = MediaEntry.fromIndex(contentId);
  if (media === null) return;
  const reader = new FileReader();

  reader.onload = (e) => {
    MediaEntry.hideVideo(media);
    MediaEntry.setSrc(media, e.target!.result as string, true);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

/** Show `src` in the existing full-image modal. */
function showImageInModal(src: string): void {
  imagePreview.setSrc(src);
  imageModal.show();
}

/**
 * Show the full-size image in the image modal.
 * Locally uploaded originals are already complete; saved images are fetched.
 */
export function openFullImage(media: MediaEntry): void {
  const source = media.src();
  if (media.isLocalFull()) {
    if (source === null || source === "") {
      console.error(`openFullImage: #image${media.index} has no source`);
      return;
    }
    showImageInModal(source);
    return;
  }

  let imageSource = source;

  requestFullImage(
    {
      file: media.fileNameHtml(),
      name: dateSlug(),
    },
    {
      success: (response) => {
        if (response.base64 !== undefined) imageSource = response.base64;
        if ("error" in response)
          console.log(`Image error : ${response["error"]}`);
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        console.log(`Unknown error : ${errorThrown}`);
      },
      complete: () => {
        showImageInModal(imageSource!);
      },
    },
  );
}
