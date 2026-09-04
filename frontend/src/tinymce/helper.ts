import { enableSaveButton } from "../entry/save";
import {
  createTinyMCE as createEditor,
  getMCEComponentHeight,
  resetMCE as resetEditor,
} from "../components/tinymce";

export { getMCEComponentHeight };

/** Initialise a TinyMCE editor and enable saving when the user edits. */
export function createTinyMCE(
  componentName: string,
  height: number,
  allowSynthesis: boolean,
  initCallback: () => void = () => {},
): void {
  createEditor(
    componentName,
    height,
    allowSynthesis,
    initCallback,
    enableSaveButton,
  );
}

/** Recreate a paragraph editor, wiring dirty-state back to the save button. */
export function resetMCE(div: Element | null | undefined): void {
  resetEditor(div, enableSaveButton);
}
