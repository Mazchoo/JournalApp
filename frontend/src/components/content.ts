import { ContentType } from '../common/content-types';
import type { MediaSavePayload, ParagraphSavePayload } from '../request-interface';

/** One saveable piece of an entry. */
export interface IContent {
  readonly contentType: ContentType;
  readonly id: string;
  saveId(): string;
  serialize(): MediaSavePayload | ParagraphSavePayload;
}

/** Map a save-content element's CSS class to its content type. */
export function contentTypeFromElement(element: HTMLElement): ContentType | undefined {
  if (element.classList.contains('entry-text')) return ContentType.Paragraph;
  if (element.classList.contains('content-image')) return ContentType.Image;
  if (element.classList.contains('content-video')) return ContentType.Video;
  return undefined;
}

/** Whether a media element has a source to save. */
export function hasMediaSrc(element: HTMLElement): boolean {
  return Boolean((element as HTMLElement & { src?: string }).src);
}
