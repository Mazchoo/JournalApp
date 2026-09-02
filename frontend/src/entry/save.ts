import { MediaEntry } from '../components/media-entry';
import { ParagraphEntry } from '../components/paragraph-entry';
import { editArea, saveButton, saveNavButton, saveSpinner } from '../components/globals';
import { scrollToBottom } from '../components/common';
import { requestSaveEntry } from './make-request';
import type { SaveData } from '../request-interface';
import { dateSlug } from '../runtime/backend-variables';
import { showMessageSimpleModal } from '../runtime/modals';
import { enableDeleteButton } from './delete';
import { zoomToMedia } from './media/media';

export type { MediaSavePayload, ParagraphSavePayload, SaveData } from '../request-interface';

/** Port of static/JS/entry.save.js. */

/** Build the save payload from the current content elements. */
export function generateSaveEntry(saveContent: ArrayLike<Element> | null): SaveData | undefined {
  if (saveContent === null) return undefined;
  const saveData: SaveData = {};

  for (let i = 0; i < saveContent.length; i++) {
    const element = saveContent[i] as HTMLElement;
    const entry =
      ParagraphEntry.fromSaveElement(element) ?? MediaEntry.fromSaveElement(element);
    if (entry === null) continue;
    saveData[entry.saveId()] = entry.serialize();
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
        editArea.onImageAreaClick(zoomToMedia);
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
  scrollToBottom();
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
