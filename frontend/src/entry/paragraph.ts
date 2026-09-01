import {
  componentFromTemplate,
  deleteParentDiv,
  eventNameSelector,
  insertNewObjectIntoEditArea,
  moveObjectDown,
  moveObjectUp,
} from '../common/utility';
import { contentIndex, paragraphTemplate, setContentIndex } from '../runtime/config';
import { tiny } from '../runtime/externals';
import { showCallbackModal } from '../runtime/modals';
import { createTinyMCE } from '../tinymce/helper';
import { insertNewImageToPosition } from './image';
import { enableSaveButton } from './save';

/** Port of static/JS/entry.paragraph.js. */

/** Fill the paragraph row template for the given content index. */
export function generateParagraphTemplate(contentInd: string | number): string {
  return paragraphTemplate().replaceAll('__INDEX__', String(contentInd));
}

/** Delete an empty paragraph immediately, or confirm before deleting text. */
export function deleteParagraph(e: Event): void {
  const paragraphDiv = document.querySelector(eventNameSelector(e));
  /** Remove the paragraph row and enable saving. */
  const deleteParagraphs = (): void => {
    deleteParentDiv(paragraphDiv);
    enableSaveButton();
  };

  const paragraphText = paragraphDiv?.querySelector<HTMLIFrameElement>('.tox-edit-area__iframe');
  if (paragraphText !== undefined && paragraphText !== null) {
    const paragraphContent = paragraphText.contentDocument!.body;
    if (paragraphContent.innerText.trim().length === 0) {
      deleteParagraphs();
      return;
    }
  }

  showCallbackModal(
    'Are you sure?',
    'Are you sure you want to delete this non-empty paragraph? There is no way to undo this.',
    'Confirm',
    deleteParagraphs,
  );
}

/** Allocate the next content index and build a paragraph row. */
export function createNewParagraph(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  return componentFromTemplate(
    generateParagraphTemplate(contentIndex()),
    'div',
    'row mt-3 paragraph-entry',
  );
}

/** Write text into the TinyMCE editor for the given index. */
export function editParagraphContent(
  updateInd: string | number | undefined,
  paragraphText: string | undefined,
): boolean {
  if (updateInd === undefined || paragraphText === undefined) return false;
  const paragraphDiv = tiny().get('paragraph' + updateInd);
  if (paragraphDiv === null) {
    return false;
  }

  paragraphDiv.setContent(paragraphText);
  return true;
}

/** Return an init callback that restores paragraph text, if any. */
export function createInitFunction(
  updateInd: string | number,
  paragraphText: string,
): () => void {
  if (paragraphText.length === 0) return () => {};
  return () => {
    editParagraphContent(updateInd, paragraphText);
  };
}

/** Create the editor and bind the row's edit buttons. */
export function initializeNewParagraph(
  lastestId: string | number,
  height = 220,
  paragraphText = '',
  allowSynthesis = true,
): void {
  const initFunction = createInitFunction(lastestId, paragraphText);
  createTinyMCE('#paragraph' + lastestId, height, allowSynthesis, initFunction);

  document.getElementById('delete-content' + lastestId)?.addEventListener('click', deleteParagraph);
  document
    .getElementById('insert-paragraph' + lastestId)
    ?.addEventListener('click', insertNewParagraphToPosition);
  document
    .getElementById('insert-image' + lastestId)
    ?.addEventListener('click', insertNewImageToPosition);
  document.getElementById('move-content-up' + lastestId)?.addEventListener('click', moveObjectUp);
  document
    .getElementById('move-content-down' + lastestId)
    ?.addEventListener('click', moveObjectDown);
}

/** Insert a new paragraph row above the clicked row. */
export function insertNewParagraphToPosition(e: Event): HTMLElement | undefined {
  const contendInd = String(contentIndex() + 1);
  enableSaveButton();
  return insertNewObjectIntoEditArea(e, createNewParagraph, initializeNewParagraph, contendInd);
}

/** Append a new paragraph row to the edit area. */
export function appendParagraphToList(
  _e?: Event,
  height = 220,
  paragraphText = '',
): HTMLElement {
  const div = createNewParagraph();

  document.getElementById('edit-area')!.appendChild(div);
  initializeNewParagraph(String(contentIndex()), height, paragraphText);

  return div;
}
