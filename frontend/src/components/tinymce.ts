import type { Editor, RawEditorOptions } from "tinymce";

import { HtmlEntry } from "./html-entry";
import { tiny } from "../runtime/externals";
import type { SynthesisEditor } from "../runtime/synthesis-editor";
import { SYNTHESIS_BUTTON_TOOLTIP } from "../tooltip-messages";

/** Drop the previous height observer when the same editor is rebuilt. */
const editorHeightObservers = new WeakMap<HTMLElement, ResizeObserver>();

/**
 * Enable save when the editor container's height changes.
 * TinyMCE's `input` event does not fire for the resize handle.
 */
function watchEditorHeight(editor: Editor, onDirty: () => void): void {
  const container = editor.getContainer();
  if (!(container instanceof HTMLElement)) return;
  if (typeof ResizeObserver === "undefined") return;

  editorHeightObservers.get(container)?.disconnect();
  let lastHeight = container.clientHeight;
  let primed = false;
  const observer = new ResizeObserver(() => {
    const height = container.clientHeight;
    if (!primed) {
      primed = true;
      lastHeight = height;
      return;
    }
    if (height === lastHeight) return;
    lastHeight = height;
    onDirty();
  });
  observer.observe(container);
  editorHeightObservers.set(container, observer);
  editor.on("remove", () => {
    observer.disconnect();
    editorHeightObservers.delete(container);
  });
}

/** Initialise a TinyMCE editor with the journal toolbar. */
export function createTinyMCE(
  componentName: string,
  height: number,
  allowSynthesis: boolean,
  initCallback: () => void = () => {},
  onDirty: () => void = () => {},
  onImportHtml: (editor: SynthesisEditor) => void = () => {},
  onImportMarkdown: (editor: SynthesisEditor) => void = () => {},
): void {
  const options: RawEditorOptions = {
    selector: componentName,
    toolbar:
      "bold italic | alignleft aligncenter alignright alignjustify | import importMarkdown allowSynthesis",
    deprecation_warnings: false,
    browser_spellcheck: true,
    height: height,
    promotion: false,
    branding: false,
    license_key: "gpl",
    setup: (editor: Editor) => {
      editor.ui.registry.addButton("import", {
        text: "Import HTML",
        onAction: () => {
          onImportHtml(editor as SynthesisEditor);
        },
      });

      editor.ui.registry.addButton("importMarkdown", {
        text: "Import Markdown",
        onAction: () => {
          onImportMarkdown(editor as SynthesisEditor);
        },
      });

      editor.ui.registry.addToggleButton("allowSynthesis", {
        text: "Generate",
        tooltip: SYNTHESIS_BUTTON_TOOLTIP,
        onAction: (api) => {
          allowSynthesis = !allowSynthesis;
          api.setActive(allowSynthesis);
          (editor as SynthesisEditor).synthesisEnabled = allowSynthesis;
          onDirty();
        },
        onSetup: (api) => {
          api.setActive(allowSynthesis);
          (editor as SynthesisEditor).synthesisEnabled = allowSynthesis;
          return () => {};
        },
      });

      editor.on("input", () => {
        onDirty();
      });
      editor.on("ResizeEditor", () => {
        onDirty();
      });
      editor.on("init", () => {
        initCallback();
        watchEditorHeight(editor, onDirty);
      });
    },
  };

  tiny().init(options);
}

/** Return the editor container height plus two pixels. */
export function getMCEComponentHeight(name: string): number {
  return tiny().get(name)!.getContainer().clientHeight + 2;
}

/** Recreate a paragraph editor at its current height and synthesis state. */
export function resetMCE(
  div: Element | null | undefined,
  onDirty: () => void = () => {},
  onImportHtml: (editor: SynthesisEditor) => void = () => {},
  onImportMarkdown: (editor: SynthesisEditor) => void = () => {},
): void {
  if (div == null) {
    console.error("resetMCE: element is missing");
    return;
  }
  if (!div.classList.contains("paragraph-entry")) {
    return;
  }
  if (HtmlEntry.isPresent(div)) {
    return;
  }

  const divName = div.children[0]!.getAttribute("name")!;
  const currentHeight = getMCEComponentHeight(divName);
  const editor = tiny().get(divName) as SynthesisEditor | null;
  const allowSynthesis = editor?.synthesisEnabled ?? true;
  editor!.remove();
  createTinyMCE(
    "#" + divName,
    currentHeight,
    allowSynthesis,
    () => {},
    onDirty,
    onImportHtml,
    onImportMarkdown,
  );
}
