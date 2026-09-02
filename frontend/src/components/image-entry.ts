import type { ImageContent } from '../response-interface';
import { ContentRow } from './content-row';

/** One image/video/mesh row and the DOM nodes it owns. */
export class ImageEntry extends ContentRow {
  /** Rows keyed by content index. */
  static readonly byIndex: Record<string, ImageEntry> = {};

  readonly image: HTMLImageElement | null;
  readonly video: HTMLVideoElement | null;
  readonly canvas: HTMLCanvasElement | null;
  readonly upload: HTMLInputElement | null;
  readonly uploadLabel: HTMLElement | null;
  readonly allowSyn: HTMLElement | null;
  readonly imageArea: HTMLElement | null;

  constructor(index: string, row: HTMLElement) {
    super(index, row);
    this.image = row.querySelector(`#image${index}`);
    this.video = row.querySelector(`#video${index}`);
    this.canvas = row.querySelector(`#mesh-canvas${index}`);
    this.upload = row.querySelector(`#upload${index}`);
    this.uploadLabel = row.querySelector(`#upload-label${index}`);
    this.allowSyn = row.querySelector(`#allow-syn${index}`);
    this.imageArea = row.querySelector('.image-area');
    ImageEntry.byIndex[index] = this;
  }

  /**
   * Return the stored row for `index`, building one from the document if needed.
   * Logs when neither the dict nor the DOM has a matching row.
   */
  static fromIndex(index: string): ImageEntry | null {
    let entry = ImageEntry.byIndex[index];

    if (entry !== undefined && !entry.row.isConnected) {
      const replacement = ImageEntry.lookupRow(index);
      if (replacement !== null) {
        entry = new ImageEntry(index, replacement);
      }
    }

    if (entry === undefined) {
      const row = ImageEntry.lookupRow(index);
      if (row === null) {
        console.error(`ImageEntry: #image${index} does not exist`);
        return null;
      }
      entry = new ImageEntry(index, row);
    }
    return entry;
  }

  /** Resolve the row that contains the event target. */
  static fromEvent(event: Event): ImageEntry | null {
    const target = event.target as Element | null;
    const row = target?.closest('.image-entry') as HTMLElement | null;
    if (row === null) {
      console.error('ImageEntry: event target is not inside an image row');
      return null;
    }
    return ImageEntry.fromRow(row);
  }

  /** Build or reuse the wrapper for an `.image-entry` element. */
  static fromRow(row: HTMLElement): ImageEntry | null {
    const img = row.querySelector('img');
    if (img === null) {
      console.error('ImageEntry: image row has no img');
      return null;
    }
    return ImageEntry.fromIndex(img.id.replace('image', ''));
  }

  /** Hide an element without removing it from layout calculations. */
  static hideMedia(element: HTMLElement | null): void {
    if (element === null) return;
    element.style.visibility = 'hidden';
    element.style.height = '0px';
  }

  /** Write a data URL (or remote src) onto the `<img>`. */
  static setSrc(image: ImageEntry, src: string): void {
    if (image.image === null) {
      console.error(`ImageEntry: #image${image.index} does not exist`);
      return;
    }
    image.image.setAttribute('src', src);
  }

  /** Hide the video element of this row. */
  static hideVideo(image: ImageEntry): void {
    ImageEntry.hideMedia(image.video);
  }

  /** Hide the `<img>` of this row. */
  static hideImage(image: ImageEntry): void {
    ImageEntry.hideMedia(image.image);
  }

  /** Reveal the video element and set its source. */
  static showVideo(image: ImageEntry, src: string): void {
    if (image.video === null) {
      console.error(`ImageEntry: #video${image.index} does not exist`);
      return;
    }
    image.video.style.visibility = 'visible';
    image.video.style.height = 'auto';
    image.video.setAttribute('src', src);
  }

  /** Reveal the mesh canvas. Returns false when the canvas is missing. */
  static showCanvas(image: ImageEntry): boolean {
    if (image.canvas === null) {
      console.error('Canvas element not found for contentId:', image.index);
      return false;
    }
    Object.assign(image.canvas.style, {
      visibility: 'visible',
      height: '400px',
      display: 'block',
      opacity: '1',
      position: 'relative',
      zIndex: '1',
    });
    return true;
  }

  /** Write the uploaded file name into the row label. */
  static setFileName(image: ImageEntry, name: string): void {
    if (image.uploadLabel === null) {
      console.error(`ImageEntry: #upload-label${image.index} does not exist`);
      return;
    }
    image.uploadLabel.textContent = name;
  }

  /** Apply or remove the two Generate-button classes according to the synthesis flag. */
  static setSynthesisActive(image: ImageEntry, isActive: boolean): void {
    if (image.allowSyn === null) {
      console.error(`ImageEntry: #allow-syn${image.index} does not exist`);
      return;
    }
    image.allowSyn.classList.toggle('btn-primary', isActive);
    image.allowSyn.classList.toggle('btn-outline-secondary', !isActive);
  }

  /** Toggle the Generate button between primary and outline. */
  static toggleSynthesis(image: ImageEntry): void {
    if (image.allowSyn === null) {
      console.error(`ImageEntry: #allow-syn${image.index} does not exist`);
      return;
    }
    image.allowSyn.classList.toggle('btn-primary');
    image.allowSyn.classList.toggle('btn-outline-secondary');
  }

  /** Treat the media element as a video thumbnail. */
  static changeToVideoClass(image: ImageEntry): boolean {
    if (image.image === null) {
      console.error(`ImageEntry: #image${image.index} does not exist`);
      return false;
    }
    image.image.classList.remove('content-image');
    image.image.classList.add('content-video');
    image.image.style.visibility = 'visible';
    image.image.style.height = 'auto';
    return true;
  }

  /** Fill image source, file name, and synthesis state from loaded content. */
  static applyContent(image: ImageEntry, imageContent: ImageContent): boolean | undefined {
    if (image.image == null || image.uploadLabel == null || image.allowSyn == null) {
      return undefined;
    }
    ImageEntry.setSrc(image, imageContent['base64']!);
    ImageEntry.setSynthesisActive(image, imageContent['allow_ai_synthesis'] === 1);
    ImageEntry.setFileName(image, imageContent['file_name']!);
    return true;
  }

  /** Fill file name and synthesis state without changing the source. */
  static applyMeta(image: ImageEntry, imageContent: ImageContent): boolean | undefined {
    if (image.uploadLabel == null || image.allowSyn == null) {
      return undefined;
    }
    ImageEntry.setSynthesisActive(image, imageContent['allow_ai_synthesis'] === 1);
    ImageEntry.setFileName(image, imageContent['file_name']!);
    return true;
  }

  /** Click the row's insert-image button. */
  static clickInsertImage(image: ImageEntry): void {
    if (image.insertImageButton === null) {
      console.error(`ImageEntry: #insert-image${image.index} does not exist`);
      return;
    }
    image.insertImageButton.click();
  }

  fileName(): string {
    return this.uploadLabel?.textContent ?? '';
  }

  fileNameHtml(): string {
    return this.uploadLabel?.innerHTML ?? '';
  }

  isSynthesisActive(): boolean {
    return this.allowSyn?.classList.contains('btn-primary') ?? false;
  }

  /** Bind edit, upload, and synthesis handlers on this row. */
  bindHandlers(handlers: ImageEntryHandlers): void {
    this.listen(this.upload, 'change', handlers.onUpload, `#upload${this.index}`);
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
    this.listen(
      this.allowSyn,
      'click',
      handlers.onToggleSynthesis,
      `#allow-syn${this.index}`,
    );
  }

  override remove(): void {
    delete ImageEntry.byIndex[this.index];
    super.remove();
  }

  /** Find the `.image-entry` that owns `#image{index}`. */
  private static lookupRow(index: string): HTMLElement | null {
    const image = document.getElementById(`image${index}`);
    return (image?.closest('.image-entry') as HTMLElement | null) ?? null;
  }
}

/** Click/change handlers wired onto a new image row. */
export interface ImageEntryHandlers {
  onUpload: EventListener;
  onDelete: EventListener;
  onInsertParagraph: EventListener;
  onInsertImage: EventListener;
  onMoveUp: EventListener;
  onMoveDown: EventListener;
  onToggleSynthesis: EventListener;
}
