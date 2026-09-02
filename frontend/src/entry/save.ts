import { contentTypeFromElement } from '../components/content';
import { ImageEntry } from '../components/image-entry';
import { ParagraphEntry } from '../components/paragraph-entry';
import { editArea, saveButton, saveNavButton, saveSpinner } from '../components/globals';
import { ContentType } from '../common/content-types';
import { requestSaveEntry } from '../make-request';
import type { SaveData } from '../request-interface';
import { dateSlug } from '../runtime/backend-variables';
import { showMessageSimpleModal } from '../runtime/modals';
import { enableDeleteButton } from './delete';
import { zoomToImage } from './image';

export type { MediaSavePayload, ParagraphSavePayload, SaveData } from '../request-interface';

/** Port of static/JS/entry.save.js. */

/** Build the save payload from the current content elements. */
export function generateSaveEntry(saveContent: ArrayLike<Element> | null): SaveData | undefined {
  if (saveContent === null) return undefined;
  const saveData: SaveData = {};

  for (let i = 0; i < saveContent.length; i++) {
    const element = saveContent[i] as HTMLElement;
    const contentType = contentTypeFromElement(element);
    if (contentType === undefined) continue;

    switch (contentType) {
      case ContentType.Paragraph: {
        const paragraph = ParagraphEntry.fromSaveElement(element)?.asParagraph();
        if (paragraph === undefined) continue;
        saveData[paragraph.saveId()] = paragraph.serialize();
        break;
      }
      case ContentType.Image: {
        const image = ImageEntry.fromSaveElement(element)?.asImage(element);
        if (image == null) continue;
        saveData[image.saveId()] = image.serialize();
        break;
      }
      case ContentType.Video: {
        const video = ImageEntry.fromSaveElement(element)?.asVideo(element);
        if (video == null) continue;
        saveData[video.saveId()] = video.serialize();
        break;
      }
    }
  }

  return saveData;
}

/** POST the save payload and report the result. */
export function saveEntryToDatabase(saveData: SaveData | null | undefined): void {
  if (saveData === null) return;

  requestSaveEntry(
    {
      content: saveData,
      name: dateSlug(),
    },
    {
      success: (response) => {
        if ('success' in response) showMessageSimpleModal('Save Success', response['success']);
        if ('error' in response) showMessageSimpleModal('Save Errors', response['error']);
        enableDeleteButton();
        editArea.imageAreas().forEach((area) => {
          area.addEventListener('click', zoomToImage);
        });
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        showMessageSimpleModal('Unknown Error', errorThrown);
      },
      complete: () => {
        saveSpinner.hide();
      },
    },
  );
}

/** Collect the save payload from every `.save-content` element. */
export function getSaveData(): SaveData | undefined {
  return generateSaveEntry(editArea.saveContent());
}

/** Disable the save button, show the spinner, and POST the entry. */
export function saveToDatabase(): void {
  if (saveButton.isDisabled() || saveSpinner.isVisible()) {
    return;
  }

  disableSaveButton();
  saveSpinner.show();
  const saveData = getSaveData();
  window.scrollTo(0, document.body.scrollHeight);
  saveEntryToDatabase(saveData);
}

/** Enable the save button and nav link. */
export function enableSaveButton(): void {
  if (!saveButton.enable()) return;
  saveNavButton.enable();
}

/** Disable the save button and nav link. */
export function disableSaveButton(): void {
  if (!saveButton.disable()) return;
  saveNavButton.disable();
}
