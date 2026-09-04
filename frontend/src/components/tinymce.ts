import type { Editor, RawEditorOptions } from "tinymce";

import { tiny, type SynthesisEditor } from "../runtime/externals";

/** Initialise a TinyMCE editor with the journal toolbar. */
export function createTinyMCE(
  componentName: string,
  height: number,
  allowSynthesis: boolean,
  initCallback: () => void = () => {},
  onDirty: () => void = () => {},
): void {
  const options: RawEditorOptions = {
    selector: componentName,
    toolbar:
      "bold italic | alignleft aligncenter alignright alignjustify | import allowSynthesis",
    deprecation_warnings: false,
    browser_spellcheck: true,
    height: height,
    promotion: false,
    branding: false,
    license_key: "gpl",
    setup: (editor: Editor) => {
      editor.ui.registry.addButton("import", {
        text: "Import Markdown",
        onAction: () => {
          console.log("TinyMCE button clicked");
        },
      });

      editor.ui.registry.addToggleButton("allowSynthesis", {
        text: "Generate",
        tooltip:
          "Allow content to create new AI generated content visible in the 'Derived Content' section",
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
      editor.on("init", () => {
        initCallback();
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
): void {
  if (div == null) {
    console.error("resetMCE: element is missing");
    return;
  }
  if (!div.classList.contains("paragraph-entry")) {
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
  );
}
