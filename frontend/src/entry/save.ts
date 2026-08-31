import { dateSlug, saveUrl } from '../runtime/config';
import { csrfToken, jq, tiny, type SynthesisEditor } from '../runtime/externals';
import { showMessageSimpleModal } from '../runtime/modals';
import { getMCEComponentHeight } from '../tinymce/helper';
import { enableDeleteButton } from './delete';
import { zoomToImage } from './image';

/** Port of static/JS/entry.save.js. */

export interface ParagraphSavePayload {
  text: string;
  height: number;
  allow_ai_synthesis: 0 | 1;
  entry: string;
}

export interface MediaSavePayload {
  file_path: string;
  allow_ai_synthesis: 0 | 1;
  entry: string;
}

export type SaveData = Record<string, ParagraphSavePayload | MediaSavePayload>;

export function generateSaveEntry(saveContent: JQuery | null): SaveData | undefined {
  if (saveContent === null) return undefined;
  const $ = jq();
  const saveData: SaveData = {};

  for (let i = 0; i < saveContent.length; i++) {
    const content = saveContent[i] as HTMLElement & { src?: string };
    const contentId = content.id;

    if ($(content).hasClass('entry-text')) {
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
    } else if ($(content).hasClass('content-image') && content.src) {
      const ind = contentId.replace('image', '');
      const allowSynthesis = $('#allow-syn' + ind).hasClass('btn-primary');
      const fileName = $('#upload-label' + ind)[0].textContent!;
      saveData[contentId] = {
        file_path: fileName,
        allow_ai_synthesis: allowSynthesis ? 1 : 0,
        entry: dateSlug(),
      };
    } else if ($(content).hasClass('content-video') && content.src) {
      // Can be a video or an image
      const ind = contentId.replace('video', '').replace('image', '');
      const allowSynthesis = $('#allow-syn' + ind).hasClass('btn-primary');
      const fileName = $('#upload-label' + ind)[0].textContent!;
      saveData[`video${ind}`] = {
        file_path: fileName,
        allow_ai_synthesis: allowSynthesis ? 1 : 0,
        entry: dateSlug(),
      };
    }
  }

  return saveData;
}

export function saveEntryToDatabase(saveData: SaveData | null | undefined): void {
  if (saveData === null) return;
  const $ = jq();
  const csrftoken = csrfToken();

  $.ajax({
    type: 'POST',
    url: saveUrl(),
    data: {
      content: saveData,
      csrfmiddlewaretoken: csrftoken,
      name: dateSlug(),
    },
    success: (response: Record<string, string>) => {
      if ('success' in response) showMessageSimpleModal('Save Success', response['success']);
      if ('error' in response) showMessageSimpleModal('Save Errors', response['error']);
      enableDeleteButton();
      $('.image-area').on('click', zoomToImage);
    },
    error: (_jqXhr, _textStatus, errorThrown) => {
      showMessageSimpleModal('Unknown Error', errorThrown);
    },
    complete: () => {
      $('#spinner-save').addClass('invisible');
    },
  });
}

export function getSaveData(): SaveData | undefined {
  const saveContent = jq()('.save-content');
  return generateSaveEntry(saveContent);
}

export function saveToDatabase(): void {
  const $ = jq();
  if ($('#btn-save').hasClass('disabled') || !$('#spinner-save').hasClass('invisible')) return;

  disableSaveButton();
  $('#spinner-save').removeClass('invisible');
  const saveData = getSaveData();
  window.scrollTo(0, document.body.scrollHeight);
  saveEntryToDatabase(saveData);
}

export function enableSaveButton(): void {
  const $ = jq();
  $('#btn-save').removeClass('disabled');
  $('#btn-save').removeClass('btn-outline-success');
  $('#btn-save').addClass('btn-success');
  $('#save-nav-button').removeClass('disabled');
}

export function disableSaveButton(): void {
  const $ = jq();
  $('#btn-save').removeClass('btn-success');
  $('#btn-save').addClass('disabled');
  $('#btn-save').addClass('btn-outline-success');
  $('#save-nav-button').addClass('disabled');
}
