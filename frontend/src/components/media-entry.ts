import { ContentType } from "../common/content-types";
import {
  MESH_CANVAS_FALLBACK_WIDTH_PX,
  MESH_CANVAS_HEIGHT_PX,
  MESH_CANVAS_REVEAL_STYLE,
} from "../display-config";
import type { MediaSavePayload } from "../request-interface";
import type { MediaContentThumbnail } from "../response-interface";
import { dateSlug } from "../runtime/backend-variables";
import { type IContent, contentTypeFromElement, hasMediaSrc } from "./content";
import { ContentRow } from "./content-row";

/** One image/video/mesh row and the DOM nodes it owns. */
export class MediaEntry extends ContentRow implements IContent {
  /** Rows keyed by content index. */
  static readonly byIndex: Record<string, MediaEntry> = {};

  readonly image: HTMLImageElement | null;
  readonly video: HTMLVideoElement | null;
  readonly canvas: HTMLCanvasElement | null;
  readonly upload: HTMLInputElement | null;
  readonly uploadLabel: HTMLElement | null;
  readonly allowSyn: HTMLElement | null;
  readonly imageArea: HTMLElement | null;
  private derivedType: ContentType.Image | ContentType.Video =
    ContentType.Image;

  constructor(index: string, row: HTMLElement) {
    super(index, row);
    this.image = row.querySelector(`#image${index}`);
    this.video = row.querySelector(`#video${index}`);
    this.canvas = row.querySelector(`#mesh-canvas${index}`);
    this.upload = row.querySelector(`#upload${index}`);
    this.uploadLabel = row.querySelector(`#upload-label${index}`);
    this.allowSyn = row.querySelector(`#allow-syn${index}`);
    this.imageArea = row.querySelector(".image-area");
    MediaEntry.byIndex[index] = this;
  }

  /**
   * Return the stored row for `index`, building one from the document if needed.
   * Logs when neither the dict nor the DOM has a matching row.
   */
  static fromIndex(index: string): MediaEntry | null {
    let media = MediaEntry.byIndex[index];

    if (media !== undefined && !media.row.isConnected) {
      const replacement = MediaEntry.lookupRow(index);
      if (replacement !== null) {
        media = new MediaEntry(index, replacement);
      }
    }

    if (media === undefined) {
      const row = MediaEntry.lookupRow(index);
      if (row === null) {
        console.error(`MediaEntry: #image${index} does not exist`);
        return null;
      }
      media = new MediaEntry(index, row);
    }
    return media;
  }

  /** Resolve the row that contains the event target. */
  static fromEvent(event: Event): MediaEntry | null {
    const target = event.target as Element | null;
    if (target == null || typeof target.closest !== "function") {
      console.error("MediaEntry: event target is not inside a media row");
      return null;
    }
    const row = target.closest(".media-entry") as HTMLElement | null;
    if (row === null) {
      console.error("MediaEntry: event target is not inside a media row");
      return null;
    }
    return MediaEntry.fromRow(row);
  }

  /** Build or reuse the wrapper for a `.media-entry` element. */
  static fromRow(row: HTMLElement): MediaEntry | null {
    const img = row.querySelector("img");
    if (img === null) {
      console.error("MediaEntry: media row has no img");
      return null;
    }
    return MediaEntry.fromIndex(img.id.replace("image", ""));
  }

  /** Hide an element without removing it from layout calculations. */
  static hideMedia(element: HTMLElement | null, label: string): void {
    if (element === null) {
      console.error(`MediaEntry: ${label} does not exist`);
      return;
    }
    element.style.visibility = "hidden";
    element.style.height = "0px";
  }

  /** Write a data URL (or remote src) onto the `<img>`. */
  static setSrc(media: MediaEntry, src: string): void {
    if (media.image === null) {
      console.error(`MediaEntry: #image${media.index} does not exist`);
      return;
    }
    media.image.setAttribute("src", src);
  }

  /** Hide the video element of this row. */
  static hideVideo(media: MediaEntry): void {
    MediaEntry.hideMedia(media.video, `#video${media.index}`);
  }

  /** Hide the `<img>` of this row. */
  static hideImage(media: MediaEntry): void {
    MediaEntry.hideMedia(media.image, `#image${media.index}`);
  }

  /** Reveal the video element and set its source. */
  static showVideo(media: MediaEntry, src: string): void {
    if (media.video === null) {
      console.error(`MediaEntry: #video${media.index} does not exist`);
      return;
    }
    media.video.style.visibility = "visible";
    media.video.style.height = "auto";
    media.video.setAttribute("src", src);
  }

  /** Reveal the mesh canvas. Returns false when the canvas is missing. */
  static showCanvas(media: MediaEntry): boolean {
    if (media.canvas === null) {
      console.error("Canvas element not found for contentId:", media.index);
      return false;
    }
    Object.assign(media.canvas.style, MESH_CANVAS_REVEAL_STYLE);
    return true;
  }

  /** Write the uploaded file name into the row label. */
  static setFileName(media: MediaEntry, name: string): void {
    if (media.uploadLabel === null) {
      console.error(`MediaEntry: #upload-label${media.index} does not exist`);
      return;
    }
    media.uploadLabel.textContent = name;
  }

  /** Apply or remove the two Generate-button classes according to the synthesis flag. */
  static setSynthesisActive(media: MediaEntry, isActive: boolean): void {
    if (media.allowSyn === null) {
      console.error(`MediaEntry: #allow-syn${media.index} does not exist`);
      return;
    }
    media.allowSyn.classList.toggle("btn-primary", isActive);
    media.allowSyn.classList.toggle("btn-outline-secondary", !isActive);
  }

  /** Toggle the Generate button between primary and outline. */
  static toggleSynthesis(media: MediaEntry): void {
    if (media.allowSyn === null) {
      console.error(`MediaEntry: #allow-syn${media.index} does not exist`);
      return;
    }
    media.allowSyn.classList.toggle("btn-primary");
    media.allowSyn.classList.toggle("btn-outline-secondary");
  }

  /** Treat the media element as a video thumbnail. */
  static changeToVideoClass(media: MediaEntry): boolean {
    if (media.image === null) {
      console.error(`MediaEntry: #image${media.index} does not exist`);
      return false;
    }
    media.image.classList.remove("content-image");
    media.image.classList.add("content-video");
    media.image.style.visibility = "visible";
    media.image.style.height = "auto";
    return true;
  }

  /** Fill image source, file name, and synthesis state from loaded content. */
  static applyContent(
    media: MediaEntry,
    content: MediaContentThumbnail,
  ): boolean | undefined {
    if (
      media.image == null ||
      media.uploadLabel == null ||
      media.allowSyn == null
    ) {
      if (media.image == null) {
        console.error(`MediaEntry: #image${media.index} does not exist`);
      }
      if (media.uploadLabel == null) {
        console.error(`MediaEntry: #upload-label${media.index} does not exist`);
      }
      if (media.allowSyn == null) {
        console.error(`MediaEntry: #allow-syn${media.index} does not exist`);
      }
      return undefined;
    }
    MediaEntry.setSrc(media, content["base64"]!);
    MediaEntry.setSynthesisActive(media, content["allow_ai_synthesis"] === 1);
    MediaEntry.setFileName(media, content["file_name"]!);
    return true;
  }

  /** Fill file name and synthesis state without changing the source. */
  static applyMeta(
    media: MediaEntry,
    mediaContent: MediaContentThumbnail,
  ): boolean | undefined {
    if (media.uploadLabel == null || media.allowSyn == null) {
      if (media.uploadLabel == null) {
        console.error(`MediaEntry: #upload-label${media.index} does not exist`);
      }
      if (media.allowSyn == null) {
        console.error(`MediaEntry: #allow-syn${media.index} does not exist`);
      }
      return undefined;
    }
    MediaEntry.setSynthesisActive(
      media,
      mediaContent["allow_ai_synthesis"] === 1,
    );
    MediaEntry.setFileName(media, mediaContent["file_name"]!);
    return true;
  }

  /** Click the row's insert-media button. */
  static clickInsertMedia(media: MediaEntry): void {
    if (media.insertMediaButton === null) {
      console.error(`MediaEntry: #insert-media${media.index} does not exist`);
      return;
    }
    media.insertMediaButton.click();
  }

  get contentType(): ContentType.Image | ContentType.Video {
    return this.derivedType;
  }

  saveId(): string {
    return `${this.contentType}${this.id}`;
  }

  serialize(): MediaSavePayload {
    return {
      file_path: this.fileName(),
      allow_ai_synthesis: this.isSynthesisActive() ? 1 : 0,
      entry: dateSlug(),
    };
  }

  /** Resolve the media row that owns a save-content element with a source. */
  static fromSaveElement(element: HTMLElement): MediaEntry | null {
    if (!hasMediaSrc(element)) return null;
    const contentType = contentTypeFromElement(element);
    if (
      contentType !== ContentType.Image &&
      contentType !== ContentType.Video
    ) {
      return null;
    }
    const row = element.closest(".media-entry") as HTMLElement | null;
    if (row === null) {
      console.error(
        "MediaEntry: save-content element is not inside a media row",
      );
      return null;
    }
    const media = MediaEntry.fromRow(row);
    if (media === null) return null;
    media.derivedType = contentType;
    return media;
  }

  imageId(): string | null {
    return this.image?.getAttribute("data-image-id") ?? null;
  }

  videoId(): string | null {
    return this.image?.getAttribute("data-video-id") ?? null;
  }

  /** Preview source currently shown on the `<img>`. */
  src(): string | null {
    return this.image?.getAttribute("src") ?? null;
  }

  /** Whether the thumbnail is tagged as a still image. */
  isImage(): boolean {
    return this.image?.classList.contains("content-image") ?? false;
  }

  /** Whether the thumbnail is tagged as a video poster. */
  isVideo(): boolean {
    return this.image?.classList.contains("content-video") ?? false;
  }

  /**
   * Index and files from an upload `change` event.
   * Tests pass a stand-in target because jsdom cannot assign `HTMLInputElement.files`.
   */
  static uploadFromEvent(
    event: Event,
  ): { index: string; files: FileList | File[] } | null {
    const target = event.target as {
      id?: string;
      files?: FileList | File[];
    } | null;
    if (!target?.id || !target.files) {
      console.error("MediaEntry: upload event has no file input");
      return null;
    }
    return { index: target.id.replace("upload", ""), files: target.files };
  }

  /**
   * Size the canvas and return a WebGL context.
   * Returns null when WebGL is unavailable. Does not hide sibling media.
   */
  static prepareWebGL(canvas: HTMLCanvasElement): WebGLRenderingContext | null {
    Object.assign(canvas.style, MESH_CANVAS_REVEAL_STYLE);
    canvas.width = canvas.clientWidth || MESH_CANVAS_FALLBACK_WIDTH_PX;
    canvas.height = MESH_CANVAS_HEIGHT_PX;

    const gl = (canvas.getContext("webgl") ??
      canvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    if (!gl) {
      console.error("WebGL not supported");
      return null;
    }
    return gl;
  }

  fileName(): string {
    return this.uploadLabel?.textContent ?? "";
  }

  fileNameHtml(): string {
    return this.uploadLabel?.innerHTML ?? "";
  }

  isSynthesisActive(): boolean {
    return this.allowSyn?.classList.contains("btn-primary") ?? false;
  }

  /** Bind edit, upload, and synthesis handlers on this row. */
  bindHandlers(handlers: MediaEntryHandlers): void {
    this.listen(
      this.upload,
      "change",
      handlers.onUpload,
      `#upload${this.index}`,
    );
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
    this.listen(
      this.allowSyn,
      "click",
      handlers.onToggleSynthesis,
      `#allow-syn${this.index}`,
    );
  }

  override remove(): void {
    delete MediaEntry.byIndex[this.index];
    super.remove();
  }

  /** Find the `.media-entry` that owns `#image{index}`. */
  private static lookupRow(index: string): HTMLElement | null {
    const image = document.getElementById(`image${index}`);
    return (image?.closest(".media-entry") as HTMLElement | null) ?? null;
  }
}

/** Click/change handlers wired onto a new media row. */
export interface MediaEntryHandlers {
  onUpload: EventListener;
  onDelete: EventListener;
  onInsertParagraph: EventListener;
  onInsertMedia: EventListener;
  onMoveUp: EventListener;
  onMoveDown: EventListener;
  onToggleSynthesis: EventListener;
}
