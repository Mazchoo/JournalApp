import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../display-config";
import type { ParagraphSavePayload } from "../request-interface";
import { dateSlug } from "../runtime/backend-variables";
import { tiny } from "../runtime/externals";
import { SYNTHESIS_BUTTON_TOOLTIP } from "../tooltip-messages";

const HOST_CLASS = "imported-html-editor";
const IMPORTED_ATTR = "data-imported-html";

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

  /** Whether `root` is showing the imported-HTML widget (not the hidden chrome). */
  static isPresent(root: ParentNode): boolean {
    return root.querySelector(`.${HOST_CLASS}:not(.d-none)`) !== null;
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

    host.textarea.value = html;
    host.textarea.style.display = "none";
    host.textarea.setAttribute(IMPORTED_ATTR, "1");
    host.textarea.setAttribute(
      "data-allow-ai-synthesis",
      allowSynthesis ? "1" : "0",
    );

    const widget = HtmlEntry.showWidget(host, allowSynthesis, onDirty);
    if (widget === null) return;

    const iframe = widget.querySelector<HTMLIFrameElement>(
      ".imported-html-frame",
    );
    if (iframe === null) {
      console.error(
        `HtmlEntry: imported HTML frame for paragraph${host.index} does not exist`,
      );
      return;
    }
    HtmlEntry.bindFrame(host.index, iframe);
    iframe.srcdoc = html;
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

  /** Attach load/resize listeners once, then size the frame to its document. */
  private static bindFrame(index: string, iframe: HTMLIFrameElement): void {
    if (iframe.dataset.bound === "1") return;
    iframe.dataset.bound = "1";
    iframe.addEventListener("load", () => {
      HtmlEntry.watchFrame(index, iframe);
    });
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
      const live = iframe.contentDocument;
      if (live === null) return;
      live.documentElement.style.overflowX = "hidden";
      if (live.body !== null) {
        live.body.style.overflowX = "hidden";
      }
      const height = Math.max(
        live.documentElement.scrollHeight,
        live.body?.scrollHeight ?? 0,
      );
      if (height === 0) return;
      iframe.style.height = `${height}px`;
    };

    fit();
    if (iframe.dataset.watched === "1") return;
    iframe.dataset.watched = "1";
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

  /** Reveal the paragraph template's imported-HTML chrome and wire Generate. */
  private static showWidget(
    host: HtmlParagraphHost,
    allowSynthesis: boolean,
    onDirty: () => void,
  ): HTMLElement | null {
    const widget = host.row.querySelector<HTMLElement>(`.${HOST_CLASS}`);
    if (widget === null) {
      console.error(
        `HtmlEntry: imported HTML editor for paragraph${host.index} does not exist`,
      );
      return null;
    }
    widget.classList.remove("d-none");

    const button = widget.querySelector<HTMLButtonElement>(
      `#imported-generate${host.index}`,
    );
    if (button === null) {
      console.error(
        `HtmlEntry: #imported-generate${host.index} does not exist`,
      );
      return widget;
    }

    const next = button.cloneNode(true) as HTMLButtonElement;
    button.replaceWith(next);
    HtmlEntry.setSynthesisActive(next, allowSynthesis);
    next.title = SYNTHESIS_BUTTON_TOOLTIP;
    next.addEventListener("click", () => {
      const active = !next.classList.contains("btn-primary");
      HtmlEntry.setSynthesisActive(next, active);
      next.setAttribute("aria-pressed", String(active));
      host.textarea?.setAttribute("data-allow-ai-synthesis", active ? "1" : "0");
      onDirty();
    });
    return widget;
  }
}
