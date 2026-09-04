import { HtmlEntry } from "../components/html-entry";
import { ParagraphEntry } from "../components/paragraph-entry";
import { editArea } from "../components/globals";
import {
  componentFromTemplate,
  insertNewObjectIntoEditArea,
  moveObjectDown,
  moveObjectUp,
} from "../common/dom";
import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../display-config";
import {
  contentIndex,
  contentIndexStr,
  paragraphTemplate,
  setContentIndex,
} from "../runtime/backend-variables";
import { showCallbackModal } from "../runtime/modals";
import { createTinyMCE } from "../tinymce/helper";
import { isStandaloneHtmlDocument } from "./html";
import { insertNewMediaToPosition } from "./media/media";
import { enableSaveButton } from "./save";

/** Port of static/JS/entry.paragraph.js. */

/** Fill the paragraph row template for the given content index. */
export function generateParagraphTemplate(contentInd: string): string {
  return paragraphTemplate().replaceAll("{{ item.index }}", contentInd);
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
    "Are you sure?",
    "Are you sure you want to delete this non-empty paragraph? There is no way to undo this.",
    "Confirm",
    deleteParagraphs,
  );
}

/** Allocate the next content index and build a paragraph row. */
export function createNewParagraph(): HTMLElement {
  setContentIndex(contentIndex() + 1);
  const index = contentIndexStr();
  const div = componentFromTemplate(
    generateParagraphTemplate(index),
    "div",
    "row mt-3 paragraph-entry",
  );
  new ParagraphEntry(index, div);
  return div;
}

/** Write text into the TinyMCE editor for the given index. */
export function editParagraphContent(
  updateInd: string | undefined,
  paragraphText: string | undefined,
): boolean {
  if (updateInd === undefined || paragraphText === undefined) {
    console.error(
      "editParagraphContent: update index or paragraph text is missing",
    );
    return false;
  }
  const paragraph = ParagraphEntry.fromIndex(updateInd);
  if (paragraph === null) return false;
  return paragraph.setContent(paragraphText);
}

/** Return an init callback that restores paragraph text, if any. */
export function createInitFunction(
  updateInd: string,
  paragraphText: string,
): () => void {
  if (paragraphText.length === 0) return () => {};
  return () => {
    editParagraphContent(updateInd, paragraphText);
  };
}

/** Bind the row's edit buttons. */
function bindParagraphHandlers(paragraph: ParagraphEntry): void {
  paragraph.bindHandlers({
    onDelete: deleteParagraph,
    onInsertParagraph: insertNewParagraphToPosition,
    onInsertMedia: insertNewMediaToPosition,
    onMoveUp: moveObjectUp,
    onMoveDown: moveObjectDown,
  });
}

/** Create the editor and bind the row's edit buttons. */
export function initializeNewParagraph(
  lastestId: string,
  height = PARAGRAPH_EDITOR_HEIGHT_PX,
  paragraphText = "",
  allowSynthesis = true,
): void {
  const paragraph = ParagraphEntry.fromIndex(lastestId);
  if (paragraph === null) return;

  const initFunction = createInitFunction(lastestId, paragraphText);
  createTinyMCE("#paragraph" + lastestId, height, allowSynthesis, initFunction);
  bindParagraphHandlers(paragraph);
}

/**
 * Show a saved standalone HTML document in the imported-HTML widget instead of TinyMCE.
 */
export function initializeImportedHtmlParagraph(
  lastestId: string,
  html: string,
  allowSynthesis = true,
): void {
  const paragraph = ParagraphEntry.fromIndex(lastestId);
  if (paragraph === null) return;

  HtmlEntry.replace(paragraph, html, allowSynthesis, enableSaveButton);
  bindParagraphHandlers(paragraph);
}

/** Initialise a server-rendered paragraph as TinyMCE or imported HTML. */
export function initializeParagraphRow(paragraph: ParagraphEntry): void {
  const { height, allowSynthesis } = paragraph.editorSettings();
  const html = paragraph.textarea?.value ?? "";
  if (isStandaloneHtmlDocument(html)) {
    initializeImportedHtmlParagraph(paragraph.index, html, allowSynthesis);
    return;
  }
  initializeNewParagraph(paragraph.index, height, "", allowSynthesis);
}

/** Insert a new paragraph row above the clicked row. */
export function insertNewParagraphToPosition(
  e: Event,
): HTMLElement | undefined {
  enableSaveButton();
  const div = insertNewObjectIntoEditArea(e, createNewParagraph());
  if (div === undefined) return undefined;
  initializeNewParagraph(contentIndexStr());
  return div;
}

/** Append a new paragraph row to the edit area. */
export function appendParagraphToList(
  _e?: Event,
  height = PARAGRAPH_EDITOR_HEIGHT_PX,
  paragraphText = "",
): HTMLElement {
  const div = createNewParagraph();
  editArea.append(div);
  initializeNewParagraph(contentIndexStr(), height, paragraphText);
  return div;
}
