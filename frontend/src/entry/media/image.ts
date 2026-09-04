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
    MediaEntry.setSrc(media, e.target!.result as string);
    enableSaveButton();
  };
  reader.readAsDataURL(inputFile);
}

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
        if ("error" in response)
          console.log(`Image error : ${response["error"]}`);
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
