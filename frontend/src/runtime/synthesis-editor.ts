import type { Editor } from "tinymce";

/** A TinyMCE editor carrying the custom flag set by the "Generate" toggle button. */
export type SynthesisEditor = Editor & { synthesisEnabled?: boolean };

/** Content index encoded in a paragraph editor id (`paragraph0` → `0`). */
export function paragraphIndex(editor: SynthesisEditor): string {
  return editor.id.replace(/^paragraph/, "");
}
