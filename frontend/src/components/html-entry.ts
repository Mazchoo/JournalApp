import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../display-config";
import type { ParagraphSavePayload } from "../request-interface";
import { dateSlug, importedHtmlTemplate } from "../runtime/backend-variables";
import { tiny } from "../runtime/externals";
import { SYNTHESIS_BUTTON_TOOLTIP } from "../tooltip-messages";
import { componentFromTemplate } from "./common";

const HOST_CLASS = "imported-html-editor";
const IMPORTED_ATTR = "data-imported-html";

/** Fill the imported-HTML widget template for the given content index. */
export function generateImportedHtmlTemplate(contentInd: string): string {
  return importedHtmlTemplate().replaceAll("{{ item.index }}", contentInd);
}

/** A paragraph row that can host imported HTML in place of TinyMCE. */
export interface HtmlParagraphHost {
  index: string;
  row: HTMLElement;
  textarea: HTMLTextAreaElement | null;
  saveId(): string;
}

/** Imported HTML widget that replaces a paragraph TinyMCE editor. */
export class HtmlEntry {
  constructor(
    readonly index: string,
    readonly row: HTMLElement,
    readonly textarea: HTMLTextAreaElement,
  ) {}

  /** Whether `root` already contains an imported-HTML widget. */
  static isPresent(root: ParentNode): boolean {
    return root.querySelector(`.${HOST_CLASS}`) !== null;
  }

  /** Whether `host` is marked as imported HTML rather than a TinyMCE paragraph. */
  static isImported(host: HtmlParagraphHost): boolean {
    return host.textarea?.getAttribute(IMPORTED_ATTR) === "1";
  }

  /** Return the widget on `host`, or null when the row is still a TinyMCE paragraph. */
  static fromHost(host: HtmlParagraphHost): HtmlEntry | null {
    if (host.textarea === null) return null;
    if (!HtmlEntry.isPresent(host.row)) return null;
    return new HtmlEntry(host.index, host.row, host.textarea);
  }

  /** Open a file picker and hand the chosen file to `onPicked`. */
  static pickFile(onPicked: (file: File) => void): void {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".html,.htm,text/html";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file == null) return;
      onPicked(file);
    });
    input.click();
  }

  /**
   * Tear down TinyMCE on `host` and show the imported HTML with a Generate
   * toggle above the document in the same synthesis state.
   */
  static replace(
    host: HtmlParagraphHost,
    html: string,
    allowSynthesis: boolean,
    onDirty: () => void,
  ): void {
    if (host.textarea === null) {
      console.error(`HtmlEntry: #paragraph${host.index} does not exist`);
      return;
    }

    tiny().get(host.saveId())?.remove();
    host.row.querySelector(`.${HOST_CLASS}`)?.remove();

    host.textarea.value = html;
    host.textarea.style.display = "none";
    host.textarea.setAttribute(IMPORTED_ATTR, "1");
    host.textarea.setAttribute(
      "data-allow-ai-synthesis",
      allowSynthesis ? "1" : "0",
    );

    const parent = host.textarea.parentElement;
    if (parent === null) {
      console.error(
        `HtmlEntry: #paragraph${host.index} has no parent to host imported HTML`,
      );
      return;
    }

    const widget = HtmlEntry.buildWidget(host, allowSynthesis, onDirty);
    const iframe = widget.querySelector<HTMLIFrameElement>(
      ".imported-html-frame",
    );
    if (iframe === null) {
      console.error(
        `HtmlEntry: imported HTML frame for paragraph${host.index} does not exist`,
      );
      return;
    }
    iframe.addEventListener("load", () => {
      HtmlEntry.watchFrame(host.index, iframe);
    });
    iframe.srcdoc = html;
    parent.appendChild(widget);
  }

  /** Whether the stored HTML is empty. */
  isEmpty(): boolean {
    return this.textarea.value.trim().length === 0;
  }

  /** Save payload for a row that is showing imported HTML. */
  serialize(): ParagraphSavePayload {
    const host = this.row.querySelector(`.${HOST_CLASS}`);
    if (host === null) {
      console.error(
        `HtmlEntry: imported HTML editor for paragraph${this.index} does not exist`,
      );
    }
    const allowSynthesis =
      this.textarea.getAttribute("data-allow-ai-synthesis") !== "0";
    return {
      text: this.textarea.value,
      height: (host?.clientHeight ?? PARAGRAPH_EDITOR_HEIGHT_PX) + 2,
      allow_ai_synthesis: allowSynthesis ? 1 : 0,
      raw_html: 1,
      entry: dateSlug(),
    };
  }

  /** Keep the iframe tall enough for its document, including after the window is resized. */
  private static watchFrame(index: string, iframe: HTMLIFrameElement): void {
    const doc = iframe.contentDocument;
    if (doc === null) {
      console.error(
        `HtmlEntry: imported HTML document for paragraph${index} does not exist`,
      );
      return;
    }

    const fit = (): void => {
      if (!iframe.isConnected) return;
      const height = Math.max(
        doc.documentElement.scrollHeight,
        doc.body?.scrollHeight ?? 0,
      );
      if (height === 0) return;
      iframe.style.height = `${height}px`;
    };

    doc.documentElement.style.overflowX = "hidden";
    if (doc.body !== null) {
      doc.body.style.overflowX = "hidden";
    }

    fit();
    window.addEventListener("resize", fit);
    if (typeof ResizeObserver !== "undefined") {
      new ResizeObserver(fit).observe(doc.documentElement);
    }
  }

  /** Apply or remove the two Generate-button classes according to the synthesis flag. */
  private static setSynthesisActive(
    button: HTMLButtonElement,
    isActive: boolean,
  ): void {
    button.classList.toggle("btn-primary", isActive);
    button.classList.toggle("btn-outline-secondary", !isActive);
  }

  /** Build the Generate toggle and iframe chrome. */
  private static buildWidget(
    host: HtmlParagraphHost,
    allowSynthesis: boolean,
    onDirty: () => void,
  ): HTMLElement {
    const widget = componentFromTemplate(
      generateImportedHtmlTemplate(host.index),
      "div",
      HOST_CLASS,
    );

    const button = widget.querySelector<HTMLButtonElement>(
      `#imported-generate${host.index}`,
    );
    if (button === null) {
      console.error(
        `HtmlEntry: #imported-generate${host.index} does not exist`,
      );
      return widget;
    }
    HtmlEntry.setSynthesisActive(button, allowSynthesis);
    button.title = SYNTHESIS_BUTTON_TOOLTIP;
    button.addEventListener("click", () => {
      const next = !button.classList.contains("btn-primary");
      HtmlEntry.setSynthesisActive(button, next);
      button.setAttribute("aria-pressed", String(next));
      host.textarea?.setAttribute("data-allow-ai-synthesis", next ? "1" : "0");
      onDirty();
    });
    return widget;
  }
}
