import { ContentType } from '../common/content-types';
import { PARAGRAPH_EDITOR_HEIGHT_PX } from '../display-config';
import type { ParagraphSavePayload } from '../request-interface';
import { dateSlug } from '../runtime/backend-variables';
import { tiny, type SynthesisEditor } from '../runtime/externals';
import { type IContent } from './content';
import { ContentRow } from './content-row';

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

  saveId(): string {
    return `${this.contentType}${this.id}`;
  }

  serialize(): ParagraphSavePayload {
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
      console.error(`ParagraphEntry: TinyMCE editor ${this.saveId()} does not exist`);
      return false;
    }
    editor.setContent(html);
    return true;
  }

  /** Height and synthesis flag stored on the server-rendered textarea. */
  editorSettings(): { height: number; allowSynthesis: boolean } {
    const height =
      parseInt(this.textarea?.getAttribute('data-height') ?? '') || PARAGRAPH_EDITOR_HEIGHT_PX;
    const allowSynthesis = this.textarea?.getAttribute('data-allow-ai-synthesis') !== '0';
    return { height, allowSynthesis };
  }

  /** Resolve the paragraph row that owns a save-content element. */
  static fromSaveElement(element: HTMLElement): ParagraphEntry | null {
    const row = element.closest('.paragraph-entry') as HTMLElement | null;
    if (row === null) return null;
    return ParagraphEntry.fromRow(row);
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
      this.insertMediaButton,
      'click',
      handlers.onInsertMedia,
      `#insert-media${this.index}`,
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
  onInsertMedia: EventListener;
  onMoveUp: EventListener;
  onMoveDown: EventListener;
}
