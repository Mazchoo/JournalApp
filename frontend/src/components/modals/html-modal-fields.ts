import {
  HTML_MODAL_DIALOG_STYLE,
  HTML_MODAL_SOURCE_MIN_HEIGHT_PX,
} from "../../display-config";

/** Source textarea inside the raw-HTML edit modal (`#html-modal-source`). */
export class HtmlModalFields {
  private source: HTMLTextAreaElement | null = null;

  /** Query the source textarea. */
  bind(): void {
    this.source = document.getElementById(
      "html-modal-source",
    ) as HTMLTextAreaElement | null;
  }

  /** Fill the textarea and expand the dialog to most of the viewport. */
  setSource(html: string): void {
    this.ensureBound();
    if (this.source === null) {
      console.error("HtmlModalFields: #html-modal-source does not exist");
      return;
    }
    this.source.value = html;
    this.source.style.minHeight = `${HTML_MODAL_SOURCE_MIN_HEIGHT_PX}px`;
    this.fillViewport();
  }

  /** Size the dialog so the source editor occupies most of the screen. */
  private fillViewport(): void {
    if (this.source === null) return;
    const dialog = this.source.closest(".modal-dialog");
    if (!(dialog instanceof HTMLElement)) {
      console.error("HtmlModalFields: .modal-dialog does not exist");
      return;
    }
    Object.assign(dialog.style, HTML_MODAL_DIALOG_STYLE);
  }

  /** Current source text, or null when the textarea is missing. */
  value(): string | null {
    this.ensureBound();
    if (this.source === null) {
      console.error("HtmlModalFields: #html-modal-source does not exist");
      return null;
    }
    return this.source.value;
  }

  /** Focus the textarea so the user can edit immediately. */
  focus(): void {
    this.ensureBound();
    this.source?.focus();
  }

  /** Re-query if the cached textarea was replaced. */
  private ensureBound(): void {
    if (this.source === null || !this.source.isConnected) {
      this.bind();
    }
  }
}
