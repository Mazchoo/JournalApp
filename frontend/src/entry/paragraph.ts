import {
  componentFromTemplate,
  deleteParentDiv,
  eventNameSelector,
  insertNewObjectIntoEditArea,
  moveObjectDown,
  moveObjectUp,
} from '../common/utility';
import { contentIndex, paragraphTemplate, setContentIndex } from '../runtime/config';
import { jq, tiny } from '../runtime/externals';
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
export function deleteParagraph(e: JQuery.TriggeredEvent): void {
  const $ = jq();
  const paragraphDivs = $(eventNameSelector(e));
  /** Remove the paragraph row and enable saving. */
  const deleteParagraphs = (): void => {
    deleteParentDiv(paragraphDivs[0]);
    enableSaveButton();
  };

  const paragraphText = paragraphDivs.find('.tox-edit-area__iframe')[0] as
    | HTMLIFrameElement
    | undefined;
  if (paragraphText !== undefined) {
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
  const $ = jq();
  const initFunction = createInitFunction(lastestId, paragraphText);
  createTinyMCE('#paragraph' + lastestId, height, allowSynthesis, initFunction);

  $('#delete-content' + lastestId).on('click', deleteParagraph);
  $('#insert-paragraph' + lastestId).on('click', insertNewParagraphToPosition);
  $('#insert-image' + lastestId).on('click', insertNewImageToPosition);
  $('#move-content-up' + lastestId).on('click', moveObjectUp);
  $('#move-content-down' + lastestId).on('click', moveObjectDown);
}

/** Insert a new paragraph row above the clicked row. */
export function insertNewParagraphToPosition(e: JQuery.TriggeredEvent): HTMLElement | undefined {
  const contendInd = String(contentIndex() + 1);
  enableSaveButton();
  return insertNewObjectIntoEditArea(e, createNewParagraph, initializeNewParagraph, contendInd);
}

/** Append a new paragraph row to the edit area. */
export function appendParagraphToList(
  _e?: JQuery.TriggeredEvent,
  height = 220,
  paragraphText = '',
): HTMLElement {
  const div = createNewParagraph();

  jq()('#edit-area')[0].appendChild(div);
  initializeNewParagraph(String(contentIndex()), height, paragraphText);

  return div;
}
