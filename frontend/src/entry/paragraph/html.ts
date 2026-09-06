import { isHtmlFile } from "../../common/file-io";
import { htmlCallbackModal, htmlModal } from "../../components/globals";
import { HtmlEntry, type HtmlParagraphHost } from "../../components/html-entry";
import { ParagraphEntry } from "../../components/paragraph-entry";
import { showHtmlCallbackModal } from "../../runtime/modals";
import {
  paragraphIndex,
  type SynthesisEditor,
} from "../../runtime/synthesis-editor";
import { enableSaveButton } from "../save";

/** Replace the editor that raised Import HTML with the chosen HTML file. */
export function importHtmlFromEditor(editor: SynthesisEditor): void {
  const paragraph = ParagraphEntry.fromIndex(paragraphIndex(editor));
  if (paragraph === null) return;

  const allowSynthesis = editor.synthesisEnabled ?? true;

  HtmlEntry.pickFile((file) => {
    readHtmlResource(file, paragraph, allowSynthesis);
  });
}

/** Read an HTML file and swap the paragraph's TinyMCE editor for it. */
export function readHtmlResource(
  file: File,
  paragraph: ParagraphEntry,
  allowSynthesis: boolean,
): void {
  if (!isHtmlFile(file.name)) {
    console.log("Unknown HTML type");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    showRawHtml(paragraph, reader.result as string, allowSynthesis);
    enableSaveButton();
  };
  reader.readAsText(file);
}

/** Show a standalone HTML document in the raw-html-editor instead of TinyMCE. */
export function showRawHtml(
  paragraph: ParagraphEntry,
  html: string,
  allowSynthesis: boolean,
): void {
  if (htmlCallbackModal.isShown()) htmlCallbackModal.hide();
  HtmlEntry.replace(
    paragraph,
    html,
    allowSynthesis,
    enableSaveButton,
    editRawHtml,
  );
}

/** Open the raw-HTML source in a modal and write it back when the modal hides. */
export function editRawHtml(host: HtmlParagraphHost): void {
  const current = HtmlEntry.source(host);
  if (current === null) return;

  showHtmlCallbackModal("Edit HTML", current, () => applyEditedHtml(host));
}

/** Apply the modal source to `host` and mark the entry dirty when it changed. */
function applyEditedHtml(host: HtmlParagraphHost): void {
  const current = HtmlEntry.source(host);
  if (current === null) return;
  const next = htmlModal.value();
  if (next === null || next === current) return;
  HtmlEntry.applySource(host, next);
  enableSaveButton();
}
