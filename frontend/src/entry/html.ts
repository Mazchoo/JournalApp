import { isHtmlFile } from "../common/file-io";
import { ParagraphEntry } from "../components/paragraph-entry";
import type { SynthesisEditor } from "../runtime/externals";
import { enableSaveButton } from "./save";

/** Whether markup looks like a full HTML document rather than a TinyMCE fragment. */
export function isStandaloneHtmlDocument(html: string): boolean {
  return /<!DOCTYPE\s+html/i.test(html) || /<html[\s>]/i.test(html);
}

/** Replace the editor that raised Import HTML with the chosen HTML file. */
export function importHtmlFromEditor(editor: SynthesisEditor): void {
  const paragraph = ParagraphEntry.fromIndex(
    editor.id.replace(/^paragraph/, ""),
  );
  if (paragraph === null) return;

  const allowSynthesis = editor.synthesisEnabled ?? true;

  paragraph.pickHtmlFile((file) => {
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
    paragraph.replaceWithImportedHtml(
      reader.result as string,
      allowSynthesis,
      enableSaveButton,
    );
    enableSaveButton();
  };
  reader.readAsText(file);
}
