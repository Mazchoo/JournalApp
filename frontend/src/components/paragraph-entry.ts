import { ContentRow } from './content-row';

/** One paragraph row and the DOM nodes it owns. */
export class ParagraphEntry extends ContentRow {
  /** Rows keyed by content index. */
  static readonly byIndex: Record<string, ParagraphEntry> = {};

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
    const row = target?.closest('.paragraph-entry') as HTMLElement | null;
    if (row === null) {
      console.error('ParagraphEntry: event target is not inside a paragraph row');
      return null;
    }
    return ParagraphEntry.fromRow(row);
  }

  /** Build or reuse the wrapper for a `.paragraph-entry` element. */
  static fromRow(row: HTMLElement): ParagraphEntry | null {
    const textarea = row.querySelector<HTMLTextAreaElement>('textarea.entry-text');
    if (textarea === null) {
      console.error('ParagraphEntry: paragraph row has no textarea');
      return null;
    }
    return ParagraphEntry.fromIndex(textarea.id.replace('paragraph', ''));
  }

  /**
   * Whether the TinyMCE iframe body is empty.
   * Returns false when no iframe is present so callers still confirm before deleting.
   */
  static isEmpty(paragraph: ParagraphEntry): boolean {
    const iframe = paragraph.row.querySelector<HTMLIFrameElement>('.tox-edit-area__iframe');
    if (iframe === null) return false;
    return iframe.contentDocument!.body.innerText.trim().length === 0;
  }

  /** Bind the five edit buttons on this row. */
  bindHandlers(handlers: ParagraphEntryHandlers): void {
    this.listen(this.deleteButton, 'click', handlers.onDelete, `#delete-content${this.index}`);
    this.listen(
      this.insertParagraphButton,
      'click',
      handlers.onInsertParagraph,
      `#insert-paragraph${this.index}`,
    );
    this.listen(
      this.insertImageButton,
      'click',
      handlers.onInsertImage,
      `#insert-image${this.index}`,
    );
    this.listen(this.moveUpButton, 'click', handlers.onMoveUp, `#move-content-up${this.index}`);
    this.listen(
      this.moveDownButton,
      'click',
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
    return (textarea?.closest('.paragraph-entry') as HTMLElement | null) ?? null;
  }
}

/** Click handlers wired onto a new paragraph row. */
export interface ParagraphEntryHandlers {
  onDelete: EventListener;
  onInsertParagraph: EventListener;
  onInsertImage: EventListener;
  onMoveUp: EventListener;
  onMoveDown: EventListener;
}
