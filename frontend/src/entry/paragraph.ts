import { ParagraphEntry } from '../components/paragraph-entry';
import { editArea } from '../components/globals';
import {
  componentFromTemplate,
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
  const paragraph = ParagraphEntry.fromEvent(e);
  if (paragraph === null) return;

  /** Remove the paragraph row and enable saving. */
  const deleteParagraphs = (): void => {
    paragraph.remove();
    enableSaveButton();
  };

  if (ParagraphEntry.isEmpty(paragraph)) {
    deleteParagraphs();
    return;
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
  const div = componentFromTemplate(
    generateParagraphTemplate(contentIndex()),
    'div',
    'row mt-3 paragraph-entry',
  );
  new ParagraphEntry(String(contentIndex()), div);
  return div;
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
  const paragraph = ParagraphEntry.fromIndex(lastestId);
  if (paragraph === null) return;

  const initFunction = createInitFunction(lastestId, paragraphText);
  createTinyMCE('#paragraph' + lastestId, height, allowSynthesis, initFunction);

  paragraph.bindHandlers({
    onDelete: deleteParagraph,
    onInsertParagraph: insertNewParagraphToPosition,
    onInsertImage: insertNewImageToPosition,
    onMoveUp: moveObjectUp,
    onMoveDown: moveObjectDown,
  });
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
  editArea.append(div);
  initializeNewParagraph(String(contentIndex()), height, paragraphText);
  return div;
}
