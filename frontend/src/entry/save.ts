import { ImageEntry } from '../components/image-entry';
import { editArea, saveButton, saveNavButton, saveSpinner } from '../components/globals';
import { requestSaveEntry } from '../make-request';
import type { SaveData } from '../request-interface';
import { dateSlug } from '../runtime/config';
import { tiny, type SynthesisEditor } from '../runtime/externals';
import { showMessageSimpleModal } from '../runtime/modals';
import { getMCEComponentHeight } from '../tinymce/helper';
import { enableDeleteButton } from './delete';
import { zoomToImage } from './image';

export type { MediaSavePayload, ParagraphSavePayload, SaveData } from '../request-interface';

/** Port of static/JS/entry.save.js. */

/** Build the save payload from the current content elements. */
export function generateSaveEntry(saveContent: ArrayLike<Element> | null): SaveData | undefined {
  if (saveContent === null) return undefined;
  const saveData: SaveData = {};

  for (let i = 0; i < saveContent.length; i++) {
    const content = saveContent[i] as HTMLElement & { src?: string };
    const contentId = content.id;

    if (content.classList.contains('entry-text')) {
      const editor = tiny().get(contentId) as SynthesisEditor;
      const textContent = editor.getContent();
      const height = getMCEComponentHeight(contentId);
      const allowSynthesis = editor.synthesisEnabled ?? true;
      saveData[contentId] = {
        text: textContent,
        height: height,
        allow_ai_synthesis: allowSynthesis ? 1 : 0,
        entry: dateSlug(),
      };
    } else if (content.classList.contains('content-image') && content.src) {
      const ind = contentId.replace('image', '');
      const image = ImageEntry.fromIndex(ind);
      if (image === null) continue;
      saveData[contentId] = {
        file_path: image.fileName(),
        allow_ai_synthesis: image.isSynthesisActive() ? 1 : 0,
        entry: dateSlug(),
      };
    } else if (content.classList.contains('content-video') && content.src) {
      // Can be a video or an image
      const ind = contentId.replace('video', '').replace('image', '');
      const image = ImageEntry.fromIndex(ind);
      if (image === null) continue;
      saveData[`video${ind}`] = {
        file_path: image.fileName(),
        allow_ai_synthesis: image.isSynthesisActive() ? 1 : 0,
        entry: dateSlug(),
      };
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
