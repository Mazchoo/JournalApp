import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../display-config";
import type { ParagraphSavePayload } from "../request-interface";
import { dateSlug } from "../runtime/backend-variables";
import { tiny } from "../runtime/externals";
import {
  RAW_HTML_EDITOR_TOOLTIP,
  SYNTHESIS_BUTTON_TOOLTIP,
} from "../tooltip-messages";

/** A paragraph row that can host a raw-html-editor in place of TinyMCE. */
export interface HtmlParagraphHost {
  index: string;
  row: HTMLElement;
  textarea: HTMLTextAreaElement | null;
  saveId(): string;
}

/** raw-html-editor widget that replaces a paragraph TinyMCE editor. */
export class HtmlEntry {
  constructor(
    readonly index: string,
    readonly row: HTMLElement,
    readonly textarea: HTMLTextAreaElement,
  ) {}

  /** Whether `root` is showing the raw-html-editor (not the hidden chrome). */
  static isPresent(root: ParentNode): boolean {
    return root.querySelector(".raw-html-editor:not(.d-none)") !== null;
  }

  /** Whether `host` is marked as a raw-html-editor rather than a TinyMCE paragraph. */
  static isRawHtml(host: HtmlParagraphHost): boolean {
    return host.textarea?.getAttribute("data-raw-html") === "1";
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
   * Tear down TinyMCE on `host` and show the raw-html-editor with a Generate
   * toggle above the document in the same synthesis state.
   */
  static replace(
    host: HtmlParagraphHost,
    html: string,
    allowSynthesis: boolean,
    onDirty: () => void,
    onEdit?: (host: HtmlParagraphHost) => void,
  ): void {
    if (host.textarea === null) {
      console.error(`HtmlEntry: #paragraph${host.index} does not exist`);
      return;
    }

    tiny().get(host.saveId())?.remove();

    host.textarea.value = html;
    host.textarea.style.display = "none";
    host.textarea.setAttribute("data-raw-html", "1");
    host.textarea.setAttribute(
      "data-allow-ai-synthesis",
      allowSynthesis ? "1" : "0",
    );

    const widget = HtmlEntry.showWidget(host, allowSynthesis, onDirty, onEdit);
    if (widget === null) return;

    const iframe = widget.querySelector<HTMLIFrameElement>(".raw-html-frame");
    if (iframe === null) {
      console.error(
        `HtmlEntry: raw-html-editor frame for paragraph${host.index} does not exist`,
      );
      return;
    }
    HtmlEntry.bindFrame(host.index, iframe);
    iframe.srcdoc = html;
  }

  /** Stored HTML for `host`, or null when the textarea is missing. */
  static source(host: HtmlParagraphHost): string | null {
    if (host.textarea === null) {
      console.error(`HtmlEntry: #paragraph${host.index} does not exist`);
      return null;
    }
    return host.textarea.value;
  }

  /** Write `html` into the stored textarea and refresh the preview iframe. */
  static applySource(host: HtmlParagraphHost, html: string): void {
    if (host.textarea === null) {
      console.error(`HtmlEntry: #paragraph${host.index} does not exist`);
      return;
    }
    host.textarea.value = html;
    const iframe = host.row.querySelector<HTMLIFrameElement>(".raw-html-frame");
    if (iframe === null) {
      console.error(
        `HtmlEntry: raw-html-editor frame for paragraph${host.index} does not exist`,
      );
      return;
    }
    iframe.srcdoc = html;
  }

  /** Whether the stored HTML is empty. */
  isEmpty(): boolean {
    return this.textarea.value.trim().length === 0;
  }

  /** Save payload for a row that is showing the raw-html-editor. */
  async serialize(): Promise<ParagraphSavePayload> {
    const host = this.row.querySelector(".raw-html-editor");
    if (host === null) {
      console.error(
        `HtmlEntry: raw-html-editor for paragraph${this.index} does not exist`,
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
        `HtmlEntry: raw-html-editor document for paragraph${index} does not exist`,
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

  /** Reveal the paragraph template's raw-html-editor chrome and wire Generate. */
  private static showWidget(
    host: HtmlParagraphHost,
    allowSynthesis: boolean,
    onDirty: () => void,
    onEdit?: (host: HtmlParagraphHost) => void,
  ): HTMLElement | null {
    const widget = host.row.querySelector<HTMLElement>(".raw-html-editor");
    if (widget === null) {
      console.error(
        `HtmlEntry: raw-html-editor for paragraph${host.index} does not exist`,
      );
      return null;
    }
    widget.classList.remove("d-none");
    HtmlEntry.bindEdit(host, widget, onEdit);

    const button = widget.querySelector<HTMLButtonElement>(
      `#raw-html-generate${host.index}`,
    );
    if (button === null) {
      console.error(
        `HtmlEntry: #raw-html-generate${host.index} does not exist`,
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
      host.textarea?.setAttribute(
        "data-allow-ai-synthesis",
        active ? "1" : "0",
      );
      onDirty();
    });
    return widget;
  }

  /**
   * Listen once on the overlay above the iframe. Clicks inside a srcdoc iframe
   * never reach the parent page, so the hitbox is the actual edit target.
   */
  private static bindEdit(
    host: HtmlParagraphHost,
    widget: HTMLElement,
    onEdit?: (host: HtmlParagraphHost) => void,
  ): void {
    if (onEdit !== undefined) {
      HtmlEntry.editByWidget.set(widget, onEdit);
    }
    const hitbox = widget.querySelector<HTMLElement>(".raw-html-edit-hitbox");
    if (hitbox === null) {
      console.error(
        `HtmlEntry: raw-html-edit-hitbox for paragraph${host.index} does not exist`,
      );
      return;
    }
    hitbox.title = RAW_HTML_EDITOR_TOOLTIP;
    if (hitbox.dataset.editBound === "1") return;
    hitbox.dataset.editBound = "1";
    hitbox.addEventListener("click", () => {
      HtmlEntry.editByWidget.get(widget)?.(host);
    });
  }

  /** Latest preview-click handler for each raw-html-editor. */
  private static readonly editByWidget = new WeakMap<
    HTMLElement,
    (host: HtmlParagraphHost) => void
  >();
}
