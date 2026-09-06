import { ContentType } from "../common/content-types";
import type {
  MediaSavePayload,
  MeshSavePayload,
  ParagraphSavePayload,
} from "../request-interface";

/** One saveable piece of an entry. */
export interface IContent {
  readonly contentType: ContentType;
  readonly id: string;
  saveId(): string;
  serialize():
    | MediaSavePayload
    | MeshSavePayload
    | ParagraphSavePayload
    | Promise<MediaSavePayload | MeshSavePayload | ParagraphSavePayload | null>;
}

/** Map a save-content element's CSS class to its content type. */
export function contentTypeFromElement(
  element: HTMLElement,
): ContentType | undefined {
  if (element.classList.contains("entry-text")) return ContentType.Paragraph;
  if (element.classList.contains("content-image")) return ContentType.Image;
  if (element.classList.contains("content-video")) return ContentType.Video;
  if (element.classList.contains("content-mesh")) return ContentType.Mesh;
  return undefined;
}

/** Whether a media element has a source to save. */
export function hasMediaSrc(element: HTMLElement): boolean {
  return Boolean((element as HTMLElement & { src?: string }).src);
}

/** Whether a mesh canvas is showing a preview that can be saved. */
export function hasMeshPreview(element: HTMLElement): boolean {
  return element.style.visibility === "visible";
}
