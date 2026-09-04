import { isHtmlFile } from "../common/file-io";
import { HtmlEntry } from "../components/html-entry";
import { ParagraphEntry } from "../components/paragraph-entry";
import {
  paragraphIndex,
  type SynthesisEditor,
} from "../runtime/synthesis-editor";
import { enableSaveButton } from "./save";

/** Whether markup looks like a full HTML document rather than a TinyMCE fragment. */
export function isStandaloneHtmlDocument(html: string): boolean {
  return /<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html);
}

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
    HtmlEntry.replace(
      paragraph,
      reader.result as string,
      allowSynthesis,
      enableSaveButton,
    );
    enableSaveButton();
  };
  reader.readAsText(file);
}
