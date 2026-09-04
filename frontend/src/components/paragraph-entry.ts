import { ContentType } from "../common/content-types";
import { PARAGRAPH_EDITOR_HEIGHT_PX } from "../display-config";
import type { ParagraphSavePayload } from "../request-interface";
import { dateSlug } from "../runtime/backend-variables";
import { SYNTHESIS_BUTTON_TOOLTIP } from "../tooltip-messages";
import { tiny, type SynthesisEditor } from "../runtime/externals";
import { type IContent } from "./content";
import { ContentRow } from "./content-row";

/** One paragraph row and the DOM nodes it owns. */
export class ParagraphEntry extends ContentRow implements IContent {
  /** Rows keyed by content index. */
  static readonly byIndex: Record<string, ParagraphEntry> = {};

  readonly contentType = ContentType.Paragraph;
  readonly textarea: HTMLTextAreaElement | null;

  constructor(index: string, row: HTMLElement) {
    super(index, row);
    this.textarea = row.querySelector(`#paragraph${index}`);
    ParagraphEntry.byIndex[index] = this;
  }

  /**
   * Return the stored row for `index`, building one from the document if needed.
   * Logs when neither the dict nor the DOM has a matching row.
   */
  static fromIndex(index: string): ParagraphEntry | null {
    let entry = ParagraphEntry.byIndex[index];

    if (entry !== undefined && !entry.row.isConnected) {
      const replacement = ParagraphEntry.lookupRow(index);
      if (replacement !== null) {
        entry = new ParagraphEntry(index, replacement);
      }
    }

    if (entry === undefined) {
      const row = ParagraphEntry.lookupRow(index);
      if (row === null) {
        console.error(`ParagraphEntry: #paragraph${index} does not exist`);
        return null;
      }
      entry = new ParagraphEntry(index, row);
    }
    return entry;
  }

  /** Resolve the row that contains the event target. */
  static fromEvent(event: Event): ParagraphEntry | null {
    const target = event.target as Element | null;
    const row = target?.closest(".paragraph-entry") as HTMLElement | null;
    if (row === null) {
      console.error(
        "ParagraphEntry: event target is not inside a paragraph row",
      );
      return null;
    }
    return ParagraphEntry.fromRow(row);
  }

  /** Build or reuse the wrapper for a `.paragraph-entry` element. */
  static fromRow(row: HTMLElement): ParagraphEntry | null {
    const textarea = row.querySelector<HTMLTextAreaElement>(
      "textarea.entry-text",
    );
    if (textarea === null) {
      console.error("ParagraphEntry: paragraph row has no textarea");
      return null;
    }
    return ParagraphEntry.fromIndex(textarea.id.replace("paragraph", ""));
  }

  saveId(): string {
    return `${this.contentType}${this.id}`;
  }

  /** Whether this row is showing imported HTML instead of TinyMCE. */
  isImportedHtml(): boolean {
    return this.importedHtmlEditor() !== null;
  }

  serialize(): ParagraphSavePayload {
    if (this.isImportedHtml()) {
      return this.serializeImportedHtml();
    }
    const editorId = this.saveId();
    const editor = tiny().get(editorId) as SynthesisEditor;
    const allowSynthesis = editor.synthesisEnabled ?? true;
    return {
      text: editor.getContent(),
      height: editor.getContainer().clientHeight + 2,
      allow_ai_synthesis: allowSynthesis ? 1 : 0,
      entry: dateSlug(),
    };
  }

  /** Write HTML into the TinyMCE editor. Returns false when the editor is missing. */
  setContent(html: string): boolean {
    const editor = tiny().get(this.saveId());
    if (editor == null) {
      console.error(
        `ParagraphEntry: TinyMCE editor ${this.saveId()} does not exist`,
      );
      return false;
    }
    editor.setContent(html);
    return true;
  }

  /** Height and synthesis flag stored on the server-rendered textarea. */
  editorSettings(): { height: number; allowSynthesis: boolean } {
    const height =
      parseInt(this.textarea?.getAttribute("data-height") ?? "") ||
      PARAGRAPH_EDITOR_HEIGHT_PX;
    const allowSynthesis =
      this.textarea?.getAttribute("data-allow-ai-synthesis") !== "0";
    return { height, allowSynthesis };
  }

  /** Resolve the paragraph row that owns a save-content element. */
  static fromSaveElement(element: HTMLElement): ParagraphEntry | null {
    const row = element.closest(".paragraph-entry") as HTMLElement | null;
    if (row === null) return null;
    return ParagraphEntry.fromRow(row);
  }

  /**
   * Whether the TinyMCE iframe body is empty.
   * Returns false when no iframe is present so callers still confirm before deleting.
   */
  static isEmpty(paragraph: ParagraphEntry): boolean {
    if (paragraph.isImportedHtml()) {
      return (paragraph.textarea?.value ?? "").trim().length === 0;
    }
    const iframe = paragraph.row.querySelector<HTMLIFrameElement>(
      ".tox-edit-area__iframe",
    );
    if (iframe === null) return false;
    return iframe.contentDocument!.body.innerText.trim().length === 0;
  }

  /** Open a file picker and hand the chosen file to `onPicked`. */
  pickHtmlFile(onPicked: (file: File) => void): void {
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
   * Tear down TinyMCE and show the imported HTML in a matching editor chrome,
   * with the Generate toggle above the document in the same state.
   */
  replaceWithImportedHtml(
    html: string,
    allowSynthesis: boolean,
    onDirty: () => void,
  ): void {
    if (this.textarea === null) {
      console.error(`ParagraphEntry: #paragraph${this.index} does not exist`);
      return;
    }

    tiny().get(this.saveId())?.remove();
    this.importedHtmlEditor()?.remove();

    this.textarea.value = html;
    this.textarea.style.display = "none";
    this.textarea.setAttribute(
      "data-allow-ai-synthesis",
      allowSynthesis ? "1" : "0",
    );

    const parent = this.textarea.parentElement;
    if (parent === null) {
      console.error(
        `ParagraphEntry: #paragraph${this.index} has no parent to host imported HTML`,
      );
      return;
    }

    const widget = this.buildImportedHtmlWidget(allowSynthesis, onDirty);
    const iframe = widget.querySelector<HTMLIFrameElement>(
      ".imported-html-frame",
    );
    if (iframe === null) {
      console.error(
        `ParagraphEntry: imported HTML frame for paragraph${this.index} does not exist`,
      );
      return;
    }
    iframe.addEventListener("load", () => {
      this.watchImportedHtmlFrame(iframe);
    });
    iframe.srcdoc = html;
    parent.appendChild(widget);
  }

  /** Bind the five edit buttons on this row. */
  bindHandlers(handlers: ParagraphEntryHandlers): void {
    this.listen(
      this.deleteButton,
      "click",
      handlers.onDelete,
      `#delete-content${this.index}`,
    );
    this.listen(
      this.insertParagraphButton,
      "click",
      handlers.onInsertParagraph,
      `#insert-paragraph${this.index}`,
    );
    this.listen(
      this.insertMediaButton,
      "click",
      handlers.onInsertMedia,
      `#insert-media${this.index}`,
    );
    this.listen(
      this.moveUpButton,
      "click",
      handlers.onMoveUp,
      `#move-content-up${this.index}`,
    );
    this.listen(
      this.moveDownButton,
      "click",
      handlers.onMoveDown,
      `#move-content-down${this.index}`,
    );
  }

  override remove(): void {
    delete ParagraphEntry.byIndex[this.index];
    super.remove();
  }

  /** Find the `.paragraph-entry` that owns `#paragraph{index}`. */
  private static lookupRow(index: string): HTMLElement | null {
    const textarea = document.getElementById(`paragraph${index}`);
    return (
      (textarea?.closest(".paragraph-entry") as HTMLElement | null) ?? null
    );
  }

  /** The TinyMCE-styled host that replaces the editor after HTML import. */
  private importedHtmlEditor(): HTMLElement | null {
    return this.row.querySelector(".imported-html-editor");
  }

  /** Save payload for a row that is showing imported HTML. */
  private serializeImportedHtml(): ParagraphSavePayload {
    if (this.textarea === null) {
      console.error(`ParagraphEntry: #paragraph${this.index} does not exist`);
    }
    const host = this.importedHtmlEditor();
    if (host === null) {
      console.error(
        `ParagraphEntry: imported HTML editor for paragraph${this.index} does not exist`,
      );
    }
    const allowSynthesis =
      this.textarea?.getAttribute("data-allow-ai-synthesis") !== "0";
    return {
      text: this.textarea?.value ?? "",
      height: (host?.clientHeight ?? PARAGRAPH_EDITOR_HEIGHT_PX) + 2,
      allow_ai_synthesis: allowSynthesis ? 1 : 0,
      entry: dateSlug(),
    };
  }

  /** Keep the iframe tall enough for its document, including after the window is resized. */
  private watchImportedHtmlFrame(iframe: HTMLIFrameElement): void {
    const doc = iframe.contentDocument;
    if (doc === null) {
      console.error(
        `ParagraphEntry: imported HTML document for paragraph${this.index} does not exist`,
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

  /** Build the imported-HTML chrome with a media-style Generate toggle above the file. */
  private buildImportedHtmlWidget(
    allowSynthesis: boolean,
    onDirty: () => void,
  ): HTMLElement {
    const widget = document.createElement("div");
    widget.className = "imported-html-editor";

    const stateClass = allowSynthesis ? "btn-primary" : "btn-outline-secondary";
    widget.innerHTML = `
      <div class="imported-html-toolbar">
        <button type="button"
                class="btn btn-sm ${stateClass} allow-syn"
                id="imported-generate${this.index}"
                data-toggle="tooltip"
                style="font-size: 0.9rem; white-space: nowrap;">
          Generate
        </button>
      </div>
      <iframe class="imported-html-frame" title="Imported HTML" scrolling="no"></iframe>
    `;

    const button = widget.querySelector<HTMLButtonElement>(
      `#imported-generate${this.index}`,
    );
    if (button === null) {
      console.error(
        `ParagraphEntry: #imported-generate${this.index} does not exist`,
      );
      return widget;
    }
    this.applyTooltip(button, SYNTHESIS_BUTTON_TOOLTIP);
    button.addEventListener("click", () => {
      const next = !button.classList.contains("btn-primary");
      button.classList.toggle("btn-primary", next);
      button.classList.toggle("btn-outline-secondary", !next);
      button.setAttribute("aria-pressed", String(next));
      this.textarea?.setAttribute("data-allow-ai-synthesis", next ? "1" : "0");
      onDirty();
    });
    return widget;
  }
}

/** Click handlers wired onto a new paragraph row. */
export interface ParagraphEntryHandlers {
  onDelete: EventListener;
  onInsertParagraph: EventListener;
  onInsertMedia: EventListener;
  onMoveUp: EventListener;
  onMoveDown: EventListener;
}
