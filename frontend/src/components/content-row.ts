import {
  DELETE_BUTTON_TOOLTIP,
  INSERT_MEDIA_BUTTON_TOOLTIP,
  INSERT_PARAGRAPH_BUTTON_TOOLTIP,
  MOVE_DOWN_BUTTON_TOOLTIP,
  MOVE_UP_BUTTON_TOOLTIP,
} from "../tooltip-messages";

/**
 * Shared edit-button references for a paragraph or media row.
 * Child classes add the media- or editor-specific nodes.
 */
export class ContentRow {
  readonly index: string;
  readonly row: HTMLElement;
  readonly deleteButton: HTMLElement | null;
  readonly insertParagraphButton: HTMLElement | null;
  readonly insertMediaButton: HTMLElement | null;
  readonly moveUpButton: HTMLElement | null;
  readonly moveDownButton: HTMLElement | null;

  /** Same as `index`; the id the object already knows. */
  get id(): string {
    return this.index;
  }

  constructor(index: string, row: HTMLElement) {
    this.index = index;
    this.row = row;
    this.deleteButton = row.querySelector(`#delete-content${index}`);
    this.insertParagraphButton = row.querySelector(`#insert-paragraph${index}`);
    this.insertMediaButton = row.querySelector(`#insert-media${index}`);
    this.moveUpButton = row.querySelector(`#move-content-up${index}`);
    this.moveDownButton = row.querySelector(`#move-content-down${index}`);
    this.applyTooltip(this.deleteButton, DELETE_BUTTON_TOOLTIP);
    this.applyTooltip(
      this.insertParagraphButton,
      INSERT_PARAGRAPH_BUTTON_TOOLTIP,
    );
    this.applyTooltip(this.insertMediaButton, INSERT_MEDIA_BUTTON_TOOLTIP);
    this.applyTooltip(this.moveUpButton, MOVE_UP_BUTTON_TOOLTIP);
    this.applyTooltip(this.moveDownButton, MOVE_DOWN_BUTTON_TOOLTIP);
  }

  /** Remove this row from the document. */
  remove(): void {
    this.row.remove();
  }

  /** Set a control's native tooltip when the node exists. */
  protected applyTooltip(element: HTMLElement | null, message: string): void {
    if (element !== null) {
      element.title = message;
    }
  }

  /** Bind a listener, logging if the stored reference is missing. */
  protected listen(
    element: HTMLElement | null,
    type: string,
    handler: EventListener,
    label: string,
  ): void {
    if (element === null) {
      console.error(`${this.constructor.name}: ${label} does not exist`);
      return;
    }
    element.addEventListener(type, handler);
  }
}
