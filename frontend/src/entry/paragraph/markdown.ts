import { marked } from "marked";

import { isMarkdownFile } from "../../common/file-io";
import { ParagraphEntry } from "../../components/paragraph-entry";
import {
  paragraphIndex,
  type SynthesisEditor,
} from "../../runtime/synthesis-editor";
import { enableSaveButton } from "../save";

/** Convert markdown source to HTML. */
export function markdownToHtml(markdown: string): string {
  return marked.parse(markdown, { async: false });
}

/** Replace the editor that raised Import Markdown with HTML from the chosen file. */
export function importMarkdownFromEditor(editor: SynthesisEditor): void {
  const paragraph = ParagraphEntry.fromIndex(paragraphIndex(editor));
  if (paragraph === null) return;

  ParagraphEntry.pickMarkdownFile((file) => {
    readMarkdownResource(file, paragraph);
  });
}

/** Read a markdown file, convert it, and write the HTML into the paragraph editor. */
export function readMarkdownResource(
  file: File,
  paragraph: ParagraphEntry,
): void {
  if (!isMarkdownFile(file.name)) {
    console.log("Unknown markdown type");
    return;
  }

  const reader = new FileReader();
  reader.onload = () => {
    const html = markdownToHtml(reader.result as string);
    if (!paragraph.setContent(html)) return;
    enableSaveButton();
  };
  reader.readAsText(file);
}
