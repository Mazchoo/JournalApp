import { PageElement } from './page-element';

/** Toolbar delete control (`#btn-delete`). */
export class DeleteButton extends PageElement {
  constructor() {
    super('btn-delete');
  }

  /** Turn the outline button into an enabled danger button. */
  enable(): boolean {
    const button = this.resolve();
    if (button === null) return false;
    button.classList.remove('disabled');
    button.classList.remove('btn-outline-danger');
    button.classList.add('btn-danger');
    return true;
  }

  /** Disable the button and restore the outline style. */
  disable(): void {
    const button = this.resolve();
    if (button === null) return;
    button.classList.remove('btn-danger');
    button.classList.add('disabled');
    button.classList.add('btn-outline-danger');
  }

  /** Whether the button is currently disabled (true if missing). */
  isDisabled(): boolean {
    const button = this.resolve();
    if (button === null) return true;
    return button.classList.contains('disabled');
  }
}

/** Day-page save button (`#btn-save`). */
export class SaveButton extends PageElement {
  constructor() {
    super('btn-save');
  }

  /** Enable the solid success style. Returns false if the button is missing. */
  enable(): boolean {
    const button = this.resolve();
    if (button === null) return false;
    button.classList.remove('disabled');
    button.classList.remove('btn-outline-success');
    button.classList.add('btn-success');
    return true;
  }

  /** Disable the button and restore the outline style. Returns false if missing. */
  disable(): boolean {
    const button = this.resolve();
    if (button === null) return false;
    button.classList.remove('btn-success');
    button.classList.add('disabled');
    button.classList.add('btn-outline-success');
    return true;
  }

  /** Whether the button is currently disabled (true if missing). */
  isDisabled(): boolean {
    const button = this.resolve();
    if (button === null) return true;
    return button.classList.contains('disabled');
  }
}

/** In-progress spinner shown next to the save button (`#spinner-save`). */
export class SaveSpinner extends PageElement {
  constructor() {
    super('spinner-save');
  }

  /** Hide the spinner. */
  hide(): void {
    this.resolve()?.classList.add('invisible');
  }

  /** Show the spinner. */
  show(): void {
    this.resolve()?.classList.remove('invisible');
  }

  /**
   * Whether a save is already running.
   * Missing spinner is treated as busy so callers abort, matching the old null check.
   */
  isVisible(): boolean {
    const spinner = this.resolve();
    if (spinner === null) return true;
    return !spinner.classList.contains('invisible');
  }
}

/** Nav-bar save link (`#save-nav-button`). */
export class SaveNavButton extends PageElement {
  constructor() {
    super('save-nav-button');
  }

  /** Make the nav link clickable. */
  enable(): void {
    this.resolve()?.classList.remove('disabled');
  }

  /** Grey out the nav link. */
  disable(): void {
    this.resolve()?.classList.add('disabled');
  }
}

/** "New Paragraph" toolbar button. */
export class NewParagraphButton extends PageElement {
  constructor() {
    super('btn-new-para');
  }
}

/** "New Image" toolbar button. */
export class NewImageButton extends PageElement {
  constructor() {
    super('btn-new-image');
  }
}

/** "Move" toolbar button. */
export class MoveButton extends PageElement {
  constructor() {
    super('btn-move');
  }
}

/** The scrollable content list (`#edit-area`). */
export class EditArea extends PageElement {
  constructor() {
    super('edit-area');
  }

  /** Append a content row. */
  append(child: HTMLElement): void {
    this.resolve()?.appendChild(child);
  }

  /** Insert a content row before an existing row. Returns false if the area is missing. */
  insertBefore(newNode: Node, referenceNode: Node): boolean {
    const area = this.resolve();
    if (area === null) return false;
    area.insertBefore(newNode, referenceNode);
    return true;
  }

  /** Live child-row collection, or null if the area is missing. */
  children(): HTMLCollection | null {
    return this.resolve()?.children ?? null;
  }

  /** Server- or client-created paragraph rows. */
  paragraphRows(): NodeListOf<Element> {
    return this.resolve()?.querySelectorAll('.paragraph-entry') ?? emptyNodeList();
  }

  /** Server- or client-created image/video rows. */
  imageRows(): NodeListOf<Element> {
    return this.resolve()?.querySelectorAll('.image-entry') ?? emptyNodeList();
  }

  /** Clickable media frames used for zoom. */
  imageAreas(): NodeListOf<Element> {
    return this.resolve()?.querySelectorAll('.image-area') ?? emptyNodeList();
  }

  /** Elements that contribute to the save payload. */
  saveContent(): NodeListOf<Element> {
    return this.resolve()?.querySelectorAll('.save-content') ?? emptyNodeList();
  }
}

/** Full-size image shown in the image modal (`#image-preview`). */
export class ImagePreview extends PageElement<HTMLImageElement> {
  constructor() {
    super('image-preview');
  }

  /** Set the preview source. */
  setSrc(src: string): void {
    this.resolve()?.setAttribute('src', src);
  }
}

/** Full-size video shown in the video modal (`#video-preview`). */
export class VideoPreview extends PageElement<HTMLVideoElement> {
  constructor() {
    super('video-preview');
  }

  /** Set the preview source. */
  setSrc(src: string): void {
    this.resolve()?.setAttribute('src', src);
  }

  /** Pause, rewind, and clear the source when the video modal closes. */
  reset(): void {
    const video = this.resolve();
    if (video === null) return;
    video.pause();
    video.currentTime = 0;
    video.src = '';
  }
}

/** Day/month/year selects inside the move-date modal. */
export class DateModalFields {
  private day: HTMLSelectElement | null = null;
  private month: HTMLSelectElement | null = null;
  private year: HTMLSelectElement | null = null;

  /** Query the three date selects. */
  bind(): void {
    this.day = document.getElementById('date-modal-day') as HTMLSelectElement | null;
    this.month = document.getElementById('date-modal-month') as HTMLSelectElement | null;
    this.year = document.getElementById('date-modal-year') as HTMLSelectElement | null;
  }

  /** Build a YYYY-MM-DD slug from the current select values. */
  destinationSlug(): string {
    this.ensureBound();
    let destDay = selectValue(this.day, 'date-modal-day');
    if (destDay.length === 1) destDay = '0' + destDay;
    let destMonth = String((this.month?.selectedIndex ?? 0) + 1);
    if (this.month === null) {
      console.error('DateModalFields: #date-modal-month does not exist');
    }
    if (destMonth.length === 1) destMonth = '0' + destMonth;
    const destYear = selectValue(this.year, 'date-modal-year');
    return `${destYear}-${destMonth}-${destDay}`;
  }

  /** Re-query if a cached select was replaced. */
  private ensureBound(): void {
    if (
      this.day === null ||
      !this.day.isConnected ||
      this.month === null ||
      !this.month.isConnected ||
      this.year === null ||
      !this.year.isConnected
    ) {
      this.bind();
    }
  }
}

/** Return a select's value, logging if the node is missing. */
function selectValue(select: HTMLSelectElement | null, elementId: string): string {
  if (select === null) {
    console.error(`DateModalFields: #${elementId} does not exist`);
    return '';
  }
  return select.value;
}

/** Empty NodeList used when `#edit-area` is missing. */
function emptyNodeList(): NodeListOf<Element> {
  return document.querySelectorAll('.__journal-empty__');
}
