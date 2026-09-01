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
      const allowSynthesis = document
        .getElementById('allow-syn' + ind)
        ?.classList.contains('btn-primary');
      const fileName = document.getElementById('upload-label' + ind)!.textContent!;
      saveData[contentId] = {
        file_path: fileName,
        allow_ai_synthesis: allowSynthesis ? 1 : 0,
        entry: dateSlug(),
      };
    } else if (content.classList.contains('content-video') && content.src) {
      // Can be a video or an image
      const ind = contentId.replace('video', '').replace('image', '');
      const allowSynthesis = document
        .getElementById('allow-syn' + ind)
        ?.classList.contains('btn-primary');
      const fileName = document.getElementById('upload-label' + ind)!.textContent!;
      saveData[`video${ind}`] = {
        file_path: fileName,
        allow_ai_synthesis: allowSynthesis ? 1 : 0,
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
        document.querySelectorAll('.image-area').forEach((area) => {
          area.addEventListener('click', zoomToImage);
        });
      },
      error: (_jqXhr, _textStatus, errorThrown) => {
        showMessageSimpleModal('Unknown Error', errorThrown);
      },
      complete: () => {
        document.getElementById('spinner-save')?.classList.add('invisible');
      },
    },
  );
}

/** Collect the save payload from every `.save-content` element. */
export function getSaveData(): SaveData | undefined {
  return generateSaveEntry(document.querySelectorAll('.save-content'));
}

/** Disable the save button, show the spinner, and POST the entry. */
export function saveToDatabase(): void {
  const saveButton = document.getElementById('btn-save');
  const spinner = document.getElementById('spinner-save');
  if (saveButton?.classList.contains('disabled') || !spinner?.classList.contains('invisible')) {
    return;
  }

  disableSaveButton();
  spinner.classList.remove('invisible');
  const saveData = getSaveData();
  window.scrollTo(0, document.body.scrollHeight);
  saveEntryToDatabase(saveData);
}

/** Enable the save button and nav link. */
export function enableSaveButton(): void {
  const button = document.getElementById('btn-save');
  if (button === null) return;
  button.classList.remove('disabled');
  button.classList.remove('btn-outline-success');
  button.classList.add('btn-success');
  document.getElementById('save-nav-button')?.classList.remove('disabled');
}

/** Disable the save button and nav link. */
export function disableSaveButton(): void {
  const button = document.getElementById('btn-save');
  if (button === null) return;
  button.classList.remove('btn-success');
  button.classList.add('disabled');
  button.classList.add('btn-outline-success');
  document.getElementById('save-nav-button')?.classList.add('disabled');
}
